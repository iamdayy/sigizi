package finance

import (
	"context"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/daydev/mbg-system/backend/internal/modules/inventory"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service interface {
	// Chart of Accounts
	CreateAccount(ctx context.Context, req *CreateAccountRequest, userID uuid.UUID) (*models.Account, error)
	ListAccounts(ctx context.Context) ([]models.Account, error)

	// Journal Entries
	CreateJournalEntry(ctx context.Context, req *CreateJournalEntryRequest, userID uuid.UUID) (*models.JournalEntry, error)
	ListJournalEntries(ctx context.Context, limit int) ([]models.JournalEntry, error)

	// Dynamic COGS & Margin Calculator
	ProduceMealBatch(ctx context.Context, req *MealProductionRequest, userID uuid.UUID) (*MealProductionResult, error)
	ListProductionBatches(ctx context.Context, limit int) ([]models.ProductionBatch, error)

	// Dashboard Analytics
	GetDashboardStats(ctx context.Context) (*FinancialDashboardStats, error)

	// Daily Reconciliation
	PerformDailyReconciliation(ctx context.Context, date time.Time, triggeredBy *uuid.UUID) (*ReconciliationReport, error)
}

type service struct {
	repo         Repository
	inventorySvc inventory.Service
}

func NewService(repo Repository, inventorySvc inventory.Service) Service {
	return &service{repo: repo, inventorySvc: inventorySvc}
}

func (s *service) CreateAccount(ctx context.Context, req *CreateAccountRequest, userID uuid.UUID) (*models.Account, error) {
	account := &models.Account{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		Code:          req.Code,
		Name:          req.Name,
		Type:          req.Type,
		NormalBalance: req.NormalBalance,
		Description:   req.Description,
		ParentID:      req.ParentID,
		IsActive:      true,
	}

	if err := s.repo.CreateAccount(ctx, account); err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}
	return account, nil
}

func (s *service) ListAccounts(ctx context.Context) ([]models.Account, error) {
	return s.repo.ListAccounts(ctx)
}

func (s *service) CreateJournalEntry(ctx context.Context, req *CreateJournalEntryRequest, userID uuid.UUID) (*models.JournalEntry, error) {
	entryDate, err := time.Parse("2006-01-02", req.EntryDate)
	if err != nil {
		return nil, fmt.Errorf("invalid entry_date format: %w", err)
	}

	var totalDebit, totalCredit float64
	lines := make([]models.JournalLine, len(req.Lines))

	for i, l := range req.Lines {
		totalDebit += l.Debit
		totalCredit += l.Credit
		lines[i] = models.JournalLine{
			AuditModel: models.AuditModel{
				CreatedBy: &userID,
			},
			AccountID:   l.AccountID,
			Debit:       l.Debit,
			Credit:      l.Credit,
			Description: l.Description,
		}
	}

	// Double-entry validation: Debit must equal Credit exactly
	if fmt.Sprintf("%.2f", totalDebit) != fmt.Sprintf("%.2f", totalCredit) {
		return nil, fmt.Errorf("unbalanced journal entry: Total Debit (Rp %.2f) != Total Credit (Rp %.2f)", totalDebit, totalCredit)
	}

	entryNumber := fmt.Sprintf("JE-%s-%s", time.Now().Format("20060102"), uuid.New().String()[:6])

	entry := &models.JournalEntry{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		EntryNumber:      entryNumber,
		EntryDate:        entryDate,
		Description:      req.Description,
		ReferenceType:    req.ReferenceType,
		ReferenceID:      req.ReferenceID,
		IsAutoReconciled: false,
		TotalDebit:       totalDebit,
		TotalCredit:      totalCredit,
		Lines:            lines,
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return s.repo.CreateJournalEntry(ctx, tx, entry)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to save journal entry: %w", err)
	}

	return entry, nil
}

func (s *service) ListJournalEntries(ctx context.Context, limit int) ([]models.JournalEntry, error) {
	return s.repo.ListJournalEntries(ctx, limit)
}

// ProduceMealBatch calculates COGS strictly based on the exact unit_cost of specific batches consumed during production (FEFO)
func (s *service) ProduceMealBatch(ctx context.Context, req *MealProductionRequest, userID uuid.UUID) (*MealProductionResult, error) {
	productionCode := fmt.Sprintf("PROD-%s-%s", time.Now().Format("20060102"), uuid.New().String()[:6])
	now := time.Now()

	var totalCOGS float64
	var prodIngredients []models.ProductionIngredient
	var ingredientBreakdowns []IngredientCostDetail

	// Wrap entire FEFO stock depletion and production batch insertion in an ACID transaction
	err := s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, ingInput := range req.Ingredients {
			stockOutReq := &inventory.StockOutRequest{
				ItemID:        ingInput.ItemID,
				RequestedQty:  ingInput.QtyRequired,
				ReferenceType: models.RefMealProduction,
				ReferenceID:   productionCode,
				Notes:         fmt.Sprintf("Meal production: %s (%d portions)", req.MealName, req.TargetPortions),
			}

			// Deplete ingredient using strict FEFO
			depletionRes, err := s.inventorySvc.DepleteStockFEFO(ctx, tx, stockOutReq, userID)
			if err != nil {
				return fmt.Errorf("failed to deplete ingredient '%s': %w", ingInput.ItemID, err)
			}

			totalCOGS += depletionRes.TotalCost

			// Map each specific consumed batch into ProductionIngredient
			for _, alloc := range depletionRes.Allocations {
				prodIngredients = append(prodIngredients, models.ProductionIngredient{
					AuditModel: models.AuditModel{
						CreatedBy: &userID,
					},
					ItemID:            ingInput.ItemID,
					ItemBatchID:       alloc.BatchID,
					QtyUsed:           alloc.DepletedQty,
					UnitCostSnapshot:  alloc.UnitCost,
					TotalCostSnapshot: alloc.SubtotalCost,
				})
			}

			ingredientBreakdowns = append(ingredientBreakdowns, IngredientCostDetail{
				ItemID:              ingInput.ItemID,
				ItemName:            depletionRes.ItemName,
				QtyUsed:             ingInput.QtyRequired,
				TotalIngredientCost: depletionRes.TotalCost,
			})
		}

		// Calculate exact margins and check for critical threshold (< 10%)
		cogsPerPortion := totalCOGS / float64(req.TargetPortions)
		grossProfitPerPortion := req.SellingPricePerPortion - cogsPerPortion
		totalGrossProfit := grossProfitPerPortion * float64(req.TargetPortions)
		marginPercentage := (grossProfitPerPortion / req.SellingPricePerPortion) * 100.0

		// Critical Margin Flagging (< 10%)
		isCritical := marginPercentage < 10.0

		prodBatch := &models.ProductionBatch{
			AuditModel: models.AuditModel{
				CreatedBy: &userID,
			},
			ProductionCode:         productionCode,
			ProductionDate:         now,
			MealName:               req.MealName,
			TotalPortions:          req.TargetPortions,
			SellingPricePerPortion: req.SellingPricePerPortion,
			TotalCOGS:              totalCOGS,
			COGSPerPortion:         cogsPerPortion,
			GrossProfitPerPortion:  grossProfitPerPortion,
			TotalGrossProfit:       totalGrossProfit,
			MarginPercentage:       marginPercentage,
			IsMarginCritical:       isCritical,
			Notes:                  req.Notes,
			Ingredients:            prodIngredients,
		}

		return s.repo.CreateProductionBatch(ctx, tx, prodBatch)
	})

	if err != nil {
		return nil, err
	}

	cogsPerPortion := totalCOGS / float64(req.TargetPortions)
	grossProfitPerPortion := req.SellingPricePerPortion - cogsPerPortion
	marginPercentage := (grossProfitPerPortion / req.SellingPricePerPortion) * 100.0

	return &MealProductionResult{
		ProductionCode:         productionCode,
		ProductionDate:         now.Format("2006-01-02"),
		MealName:               req.MealName,
		TotalPortions:          req.TargetPortions,
		SellingPricePerPortion: req.SellingPricePerPortion,
		TotalCOGS:              totalCOGS,
		COGSPerPortion:         cogsPerPortion,
		GrossProfitPerPortion:  grossProfitPerPortion,
		TotalGrossProfit:       grossProfitPerPortion * float64(req.TargetPortions),
		MarginPercentage:       marginPercentage,
		IsMarginCritical:       marginPercentage < 10.0,
		IngredientsBreakdown:   ingredientBreakdowns,
	}, nil
}

func (s *service) ListProductionBatches(ctx context.Context, limit int) ([]models.ProductionBatch, error) {
	return s.repo.ListProductionBatches(ctx, limit)
}

func (s *service) GetDashboardStats(ctx context.Context) (*FinancialDashboardStats, error) {
	batches, err := s.repo.ListProductionBatches(ctx, 30)
	if err != nil {
		return nil, err
	}

	var totalPortions int
	var totalRevenue, totalCOGS, totalProfit float64
	var criticalCount int

	recentTrend := make([]struct {
		Date             string  `json:"date"`
		MealName         string  `json:"meal_name"`
		COGSPerPortion   float64 `json:"cogs_per_portion"`
		MarginPercentage float64 `json:"margin_percentage"`
		IsCritical       bool    `json:"is_critical"`
	}, 0)

	for _, b := range batches {
		totalPortions += b.TotalPortions
		rev := float64(b.TotalPortions) * b.SellingPricePerPortion
		totalRevenue += rev
		totalCOGS += b.TotalCOGS
		totalProfit += b.TotalGrossProfit

		if b.IsMarginCritical {
			criticalCount++
		}

		recentTrend = append(recentTrend, struct {
			Date             string  `json:"date"`
			MealName         string  `json:"meal_name"`
			COGSPerPortion   float64 `json:"cogs_per_portion"`
			MarginPercentage float64 `json:"margin_percentage"`
			IsCritical       bool    `json:"is_critical"`
		}{
			Date:             b.ProductionDate.Format("2006-01-02"),
			MealName:         b.MealName,
			COGSPerPortion:   b.COGSPerPortion,
			MarginPercentage: b.MarginPercentage,
			IsCritical:       b.IsMarginCritical,
		})
	}

	var avgMargin float64
	if totalRevenue > 0 {
		avgMargin = (totalProfit / totalRevenue) * 100.0
	}

	return &FinancialDashboardStats{
		Period:                   time.Now().Format("January 2006"),
		TotalPortionsProduced:    totalPortions,
		TotalRevenue:             totalRevenue,
		TotalCOGS:                totalCOGS,
		TotalGrossProfit:         totalProfit,
		AverageMarginPercentage:  avgMargin,
		CriticalMarginBatchCount: criticalCount,
		RecentCOGSTrend:          recentTrend,
	}, nil
}
