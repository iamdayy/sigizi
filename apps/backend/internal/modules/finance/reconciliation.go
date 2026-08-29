package finance

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *service) PerformDailyReconciliation(ctx context.Context, date time.Time, triggeredBy *uuid.UUID) (*ReconciliationReport, error) {
	log.Printf("[FINANCE RECONCILIATION] Starting automated daily reconciliation for %s (Timezone: Asia/Jakarta)...", date.Format("2006-01-02"))

	distCount, portionsDelivered, err := s.repo.GetDailyDeliveredPortions(ctx, date)
	if err != nil {
		log.Printf("[FINANCE RECONCILIATION] Error checking daily distributions: %v", err)
	}

	totalStockOutCost, err := s.repo.GetDailyStockOutTotalCost(ctx, date)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate daily stock-out cost: %w", err)
	}

	dateStr := date.Format("2006-01-02")
	report := &ReconciliationReport{
		ReconciliationDate:     dateStr,
		ProcessedAt:            time.Now(),
		TotalDistributions:     distCount,
		TotalPortionsDelivered: portionsDelivered,
		TotalStockOutCost:      totalStockOutCost,
	}

	if totalStockOutCost <= 0 {
		report.Status = "SKIPPED_NO_MOVEMENTS"
		report.Message = fmt.Sprintf("No stock-out movements recorded for %s. Journal entry creation skipped.", dateStr)
		log.Printf("[FINANCE RECONCILIATION] %s", report.Message)
		return report, nil
	}

	// Retrieve Standard Accounts
	cogsAccount, err := s.repo.GetAccountByCode(ctx, "5-1001") // Beban Pokok Produksi
	if err != nil {
		return nil, fmt.Errorf("COGS Account '5-1001' not found in CoA: %w", err)
	}

	inventoryAccount, err := s.repo.GetAccountByCode(ctx, "1-1301") // Persediaan Bahan Makanan
	if err != nil {
		return nil, fmt.Errorf("Inventory Account '1-1301' not found in CoA: %w", err)
	}

	entryNumber := fmt.Sprintf("RECON-%s-%s", date.Format("20060102"), uuid.New().String()[:6])

	journalEntry := &models.JournalEntry{
		AuditModel: models.AuditModel{
			CreatedBy: triggeredBy,
		},
		EntryNumber:      entryNumber,
		EntryDate:        date,
		Description:      fmt.Sprintf("Rekonsiliasi Otomatis Harian MBG SPPG - Beban Pokok Bahan Baku & Persediaan Terpakai (%s)", dateStr),
		ReferenceType:    string(models.RefDailyReconciliation),
		ReferenceID:      dateStr,
		IsAutoReconciled: true,
		TotalDebit:       totalStockOutCost,
		TotalCredit:      totalStockOutCost,
		Lines: []models.JournalLine{
			{
				AuditModel: models.AuditModel{
					CreatedBy: triggeredBy,
				},
				AccountID:   cogsAccount.ID,
				Debit:       totalStockOutCost,
				Credit:      0,
				Description: fmt.Sprintf("Pembebanan HPP Bahan Baku MBG (%d porsi)", portionsDelivered),
			},
			{
				AuditModel: models.AuditModel{
					CreatedBy: triggeredBy,
				},
				AccountID:   inventoryAccount.ID,
				Debit:       0,
				Credit:      totalStockOutCost,
				Description: fmt.Sprintf("Pengurangan Persediaan Bahan Dapur FEFO (%s)", dateStr),
			},
		},
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return s.repo.CreateJournalEntry(ctx, tx, journalEntry)
	})

	if err != nil {
		report.Status = "ERROR"
		report.Message = fmt.Sprintf("Failed to post reconciliation journal: %v", err)
		return report, err
	}

	report.JournalEntryID = journalEntry.ID
	report.JournalEntryNumber = journalEntry.EntryNumber
	report.Status = "SUCCESS"
	report.Message = fmt.Sprintf("Successfully reconciled Rp %.2f across %d deliveries and %d portions.", totalStockOutCost, distCount, portionsDelivered)

	log.Printf("[FINANCE RECONCILIATION] %s (Journal Entry: %s)", report.Message, journalEntry.EntryNumber)
	return report, nil
}
