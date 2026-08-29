package reporting

import (
	"context"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetDB() *gorm.DB

	// Virtual Accounts
	CreateVirtualAccount(ctx context.Context, va *models.VirtualAccount) error
	ListVirtualAccounts(ctx context.Context) ([]models.VirtualAccount, error)
	GetVirtualAccountByID(ctx context.Context, id uuid.UUID) (*models.VirtualAccount, error)
	GetVirtualAccountByNumber(ctx context.Context, accNum string) (*models.VirtualAccount, error)
	UpdateVirtualAccount(ctx context.Context, va *models.VirtualAccount) error

	// VA Transactions
	CreateVATransaction(ctx context.Context, tx *models.VATransaction) error
	ListVATransactions(ctx context.Context, vaID uuid.UUID, limit int) ([]models.VATransaction, error)

	// Generated Reports
	CreateReport(ctx context.Context, r *models.GeneratedReport) error
	ListReports(ctx context.Context, reportType string, limit int) ([]models.GeneratedReport, error)
	GetReportByID(ctx context.Context, id uuid.UUID) (*models.GeneratedReport, error)

	// Data aggregators for report building
	GetJournalEntriesForPeriod(ctx context.Context, start, end time.Time) ([]models.JournalEntry, error)
	GetDistributionsForPeriod(ctx context.Context, start, end time.Time) ([]models.Distribution, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetDB() *gorm.DB {
	return r.db
}

func (r *repository) CreateVirtualAccount(ctx context.Context, va *models.VirtualAccount) error {
	return r.db.WithContext(ctx).Create(va).Error
}

func (r *repository) ListVirtualAccounts(ctx context.Context) ([]models.VirtualAccount, error) {
	var list []models.VirtualAccount
	err := r.db.WithContext(ctx).Order("created_at ASC").Find(&list).Error
	return list, err
}

func (r *repository) GetVirtualAccountByID(ctx context.Context, id uuid.UUID) (*models.VirtualAccount, error) {
	var va models.VirtualAccount
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&va).Error
	if err != nil {
		return nil, err
	}
	return &va, nil
}

func (r *repository) GetVirtualAccountByNumber(ctx context.Context, accNum string) (*models.VirtualAccount, error) {
	var va models.VirtualAccount
	err := r.db.WithContext(ctx).Where("account_number = ?", accNum).First(&va).Error
	if err != nil {
		return nil, err
	}
	return &va, nil
}

func (r *repository) UpdateVirtualAccount(ctx context.Context, va *models.VirtualAccount) error {
	return r.db.WithContext(ctx).Save(va).Error
}

func (r *repository) CreateVATransaction(ctx context.Context, tx *models.VATransaction) error {
	return r.db.WithContext(ctx).Create(tx).Error
}

func (r *repository) ListVATransactions(ctx context.Context, vaID uuid.UUID, limit int) ([]models.VATransaction, error) {
	var list []models.VATransaction
	query := r.db.WithContext(ctx).Preload("VerifiedBy").Where("virtual_account_id = ?", vaID).Order("transaction_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) CreateReport(ctx context.Context, rep *models.GeneratedReport) error {
	return r.db.WithContext(ctx).Create(rep).Error
}

func (r *repository) ListReports(ctx context.Context, reportType string, limit int) ([]models.GeneratedReport, error) {
	var list []models.GeneratedReport
	query := r.db.WithContext(ctx).Preload("GeneratedBy")
	if reportType != "" {
		query = query.Where("report_type = ?", reportType)
	}
	query = query.Order("period_end DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&list).Error
	return list, err
}

func (r *repository) GetReportByID(ctx context.Context, id uuid.UUID) (*models.GeneratedReport, error) {
	var rep models.GeneratedReport
	err := r.db.WithContext(ctx).Preload("GeneratedBy").Where("id = ?", id).First(&rep).Error
	if err != nil {
		return nil, err
	}
	return &rep, nil
}

func (r *repository) GetJournalEntriesForPeriod(ctx context.Context, start, end time.Time) ([]models.JournalEntry, error) {
	var list []models.JournalEntry
	err := r.db.WithContext(ctx).
		Preload("Lines").
		Preload("Lines.Account").
		Where("entry_date BETWEEN ? AND ?", start, end).
		Order("entry_date ASC, entry_number ASC").
		Find(&list).Error
	return list, err
}

func (r *repository) GetDistributionsForPeriod(ctx context.Context, start, end time.Time) ([]models.Distribution, error) {
	var list []models.Distribution
	err := r.db.WithContext(ctx).
		Preload("DistributionPoint").
		Preload("Items").
		Where("delivery_date BETWEEN ? AND ?", start, end).
		Order("delivery_date ASC").
		Find(&list).Error
	return list, err
}
