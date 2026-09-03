package reporting

import (
	"context"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/daydev/mbg-system/backend/internal/storage"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service interface {
	// Virtual Accounts
	CreateVirtualAccount(ctx context.Context, req *CreateVirtualAccountRequest, userID uuid.UUID) (*models.VirtualAccount, error)
	ListVirtualAccounts(ctx context.Context) ([]models.VirtualAccount, error)
	GetVirtualAccount(ctx context.Context, id uuid.UUID) (*models.VirtualAccount, error)
	RecordVATransaction(ctx context.Context, vaID uuid.UUID, req *RecordVATransactionRequest, userID uuid.UUID) (*models.VATransaction, error)
	ListVATransactions(ctx context.Context, vaID uuid.UUID, limit int) ([]models.VATransaction, error)
	ProcessBankWebhook(ctx context.Context, payload *BankTopUpWebhookPayload) (*models.VATransaction, error)

	// Periodic Reports
	GenerateReport(ctx context.Context, req *GenerateReportRequest, userID uuid.UUID) (*models.GeneratedReport, error)
	ListReports(ctx context.Context, reportType string, limit int) ([]models.GeneratedReport, error)
	GetReport(ctx context.Context, id uuid.UUID) (*models.GeneratedReport, error)
}

type service struct {
	repo         Repository
	storageSvc   storage.StorageService
	bankClient   BankAPIClient
	pdfGenerator *ReportPDFGenerator
}

func NewService(repo Repository, storageSvc storage.StorageService) Service {
	return &service{
		repo:         repo,
		storageSvc:   storageSvc,
		bankClient:   NewRealBankClient(),
		pdfGenerator: NewReportPDFGenerator(),
	}
}

func (s *service) CreateVirtualAccount(ctx context.Context, req *CreateVirtualAccountRequest, userID uuid.UUID) (*models.VirtualAccount, error) {
	va := &models.VirtualAccount{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		AccountNumber:         req.AccountNumber,
		BankCode:              req.BankCode,
		BankName:              req.BankName,
		AccountHolder:         req.AccountHolder,
		CurrentBalance:        req.InitialBalance,
		APIIntegrationEnabled: req.APIIntegrationEnabled,
		APIClientID:           req.APIClientID,
		APIEndpoint:           req.APIEndpoint,
		IsActive:              true,
	}

	if err := s.repo.CreateVirtualAccount(ctx, va); err != nil {
		return nil, fmt.Errorf("failed to register virtual account: %w", err)
	}

	return va, nil
}

func (s *service) ListVirtualAccounts(ctx context.Context) ([]models.VirtualAccount, error) {
	return s.repo.ListVirtualAccounts(ctx)
}

func (s *service) GetVirtualAccount(ctx context.Context, id uuid.UUID) (*models.VirtualAccount, error) {
	return s.repo.GetVirtualAccountByID(ctx, id)
}

func (s *service) RecordVATransaction(ctx context.Context, vaID uuid.UUID, req *RecordVATransactionRequest, userID uuid.UUID) (*models.VATransaction, error) {
	va, err := s.repo.GetVirtualAccountByID(ctx, vaID)
	if err != nil {
		return nil, fmt.Errorf("virtual account not found: %w", err)
	}

	txDate := time.Now()
	if req.TransactionDate != "" {
		if d, err := time.Parse("2006-01-02", req.TransactionDate); err == nil {
			txDate = d
		}
	}

	channel := req.Channel
	if channel == "" {
		channel = models.VAChannelManual
	}

	var newBalance float64
	if req.TransactionType == "TOP_UP" {
		newBalance = va.CurrentBalance + req.Amount
	} else if req.TransactionType == "DISBURSEMENT" {
		if va.CurrentBalance < req.Amount {
			return nil, fmt.Errorf("insufficient VA balance: available Rp %.2f, requested Rp %.2f", va.CurrentBalance, req.Amount)
		}
		newBalance = va.CurrentBalance - req.Amount
	} else {
		newBalance = va.CurrentBalance
	}

	refNum := req.ReferenceNumber
	if refNum == "" {
		refNum = fmt.Sprintf("VA-TX-%s-%d", va.BankCode, time.Now().Unix())
	}

	vaTx := &models.VATransaction{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		VirtualAccountID: vaID,
		TransactionType:  req.TransactionType,
		Channel:          channel,
		Amount:           req.Amount,
		BalanceAfter:     newBalance,
		ReferenceNumber:  refNum,
		Description:      req.Description,
		TransactionDate:  txDate,
		VerifiedByID:     &userID,
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateVATransaction(ctx, tx, vaTx); err != nil {
			return err
		}
		va.CurrentBalance = newBalance
		va.UpdatedBy = &userID
		return s.repo.UpdateVirtualAccount(ctx, tx, va)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to process VA transaction: %w", err)
	}

	return vaTx, nil
}

func (s *service) ListVATransactions(ctx context.Context, vaID uuid.UUID, limit int) ([]models.VATransaction, error) {
	return s.repo.ListVATransactions(ctx, vaID, limit)
}

func (s *service) ProcessBankWebhook(ctx context.Context, payload *BankTopUpWebhookPayload) (*models.VATransaction, error) {
	// 1. Idempotency Check
	if payload.ReferenceNumber != "" {
		existingTx, err := s.repo.GetVATransactionByReference(ctx, payload.ReferenceNumber)
		if err == nil && existingTx != nil {
			// Found existing transaction, return special error or handle it.
			// The handler expects an error with text "idempotent" to return 200 OK.
			// Let's attach the tx to a custom error or just change the handler logic.
			// Wait, we need to return the transaction so handler can send it in response.
			// Returning (existingTx, errors.New("idempotent")) is perfectly fine!
			return existingTx, fmt.Errorf("idempotent")
		}
	}

	va, err := s.repo.GetVirtualAccountByNumber(ctx, payload.AccountNumber)
	if err != nil {
		return nil, fmt.Errorf("virtual account not recognized: %w", err)
	}

	txDate := time.Now()
	if payload.TransactionDate != "" {
		if d, err := time.Parse("2006-01-02", payload.TransactionDate); err == nil {
			txDate = d
		}
	}

	newBalance := va.CurrentBalance + payload.Amount
	vaTx := &models.VATransaction{
		VirtualAccountID: va.ID,
		TransactionType:  "TOP_UP",
		Channel:          models.VAChannelAPIWebhook,
		Amount:           payload.Amount,
		BalanceAfter:     newBalance,
		ReferenceNumber:  payload.ReferenceNumber,
		Description:      payload.Description,
		TransactionDate:  txDate,
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateVATransaction(ctx, tx, vaTx); err != nil {
			return err
		}
		va.CurrentBalance = newBalance
		return s.repo.UpdateVirtualAccount(ctx, tx, va)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to record webhook top-up: %w", err)
	}

	return vaTx, nil
}

func (s *service) GenerateReport(ctx context.Context, req *GenerateReportRequest, userID uuid.UUID) (*models.GeneratedReport, error) {
	start, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		return nil, fmt.Errorf("invalid period_start format: %w", err)
	}

	end, err := time.Parse("2006-01-02", req.PeriodEnd)
	if err != nil {
		return nil, fmt.Errorf("invalid period_end format: %w", err)
	}

	headName := req.HeadName
	if headName == "" {
		var user models.User
		if err := s.repo.GetDB().WithContext(ctx).Where("role = ? AND is_active = ?", models.RoleHeadSPPG, true).First(&user).Error; err != nil {
			return nil, fmt.Errorf("failed to find active HEAD_SPPG for default head name: %w", err)
		}
		headName = user.FullName
	}

	// 1. Gather distributions & journal records for period
	entries, _ := s.repo.GetJournalEntriesForPeriod(ctx, start, end)
	distributions, _ := s.repo.GetDistributionsForPeriod(ctx, start, end)

	var totalPortions int
	var totalAmount float64
	for _, d := range distributions {
		totalPortions += d.TotalPortions
		totalAmount += d.TotalValue
	}

	reportNumber := fmt.Sprintf("BGN/%s/%s/%s", req.ReportType, time.Now().Format("2006/01"), uuid.New().String()[:6])

	// 2. Generate PDF
	pdfBytes, err := s.pdfGenerator.GenerateBGNReport(
		req.ReportType,
		reportNumber,
		start, end,
		totalPortions,
		totalAmount,
		entries,
		headName,
	)

	if err != nil {
		pdfBytes = GenerateSimpleReportBytes(req.ReportType, reportNumber, start, end, totalPortions, totalAmount, headName)
	}

	// 3. Upload to Storage
	filename := fmt.Sprintf("reports/%s_%s_%s.pdf", req.ReportType, req.PeriodStart, time.Now().Format("20060102_150405"))
	fileURL, err := s.storageSvc.UploadFile(ctx, filename, pdfBytes, "application/pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to upload report PDF: %w", err)
	}

	now := time.Now()
	rep := &models.GeneratedReport{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		ReportType:    req.ReportType,
		ReportNumber:  reportNumber,
		PeriodStart:   start,
		PeriodEnd:     end,
		TotalPortions: totalPortions,
		TotalAmount:   totalAmount,
		FileURL:       fileURL,
		FileSizeBytes: int64(len(pdfBytes)),
		GeneratedByID: userID,
		Notes:         req.Notes,
	}

	if err := s.repo.CreateReport(ctx, rep); err != nil {
		return nil, fmt.Errorf("failed to save generated report record: %w", err)
	}

	_ = now
	return s.repo.GetReportByID(ctx, rep.ID)
}

func (s *service) ListReports(ctx context.Context, reportType string, limit int) ([]models.GeneratedReport, error) {
	return s.repo.ListReports(ctx, reportType, limit)
}

func (s *service) GetReport(ctx context.Context, id uuid.UUID) (*models.GeneratedReport, error) {
	return s.repo.GetReportByID(ctx, id)
}
