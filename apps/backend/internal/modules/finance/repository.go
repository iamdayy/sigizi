package finance

import (
	"context"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetDB() *gorm.DB

	// Accounts
	CreateAccount(ctx context.Context, account *models.Account) error
	GetAccountByCode(ctx context.Context, code string) (*models.Account, error)
	ListAccounts(ctx context.Context) ([]models.Account, error)

	// Journal Entries
	CreateJournalEntry(ctx context.Context, tx *gorm.DB, entry *models.JournalEntry) error
	ListJournalEntries(ctx context.Context, limit int) ([]models.JournalEntry, error)
	GetJournalEntryByID(ctx context.Context, id uuid.UUID) (*models.JournalEntry, error)

	// Production Batches
	CreateProductionBatch(ctx context.Context, tx *gorm.DB, batch *models.ProductionBatch) error
	ListProductionBatches(ctx context.Context, limit int) ([]models.ProductionBatch, error)
	ListProductionBatchesInPeriod(ctx context.Context, start time.Time, end time.Time) ([]models.ProductionBatch, error)
	GetProductionBatchByID(ctx context.Context, id uuid.UUID) (*models.ProductionBatch, error)

	// Aggregations for Daily Reconciliation & Dashboard
	GetDailyStockOutTotalCost(ctx context.Context, date time.Time) (float64, error)
	GetDailyDeliveredPortions(ctx context.Context, date time.Time) (int64, int64, error)
	GetDashboardStats(ctx context.Context) (*models.ProductionBatch, error)
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

func (r *repository) CreateAccount(ctx context.Context, account *models.Account) error {
	return r.db.WithContext(ctx).Create(account).Error
}

func (r *repository) GetAccountByCode(ctx context.Context, code string) (*models.Account, error) {
	var account models.Account
	err := r.db.WithContext(ctx).Where("code = ?", code).First(&account).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (r *repository) ListAccounts(ctx context.Context) ([]models.Account, error) {
	var accounts []models.Account
	err := r.db.WithContext(ctx).Order("code ASC").Find(&accounts).Error
	return accounts, err
}

func (r *repository) CreateJournalEntry(ctx context.Context, tx *gorm.DB, entry *models.JournalEntry) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(entry).Error
}

func (r *repository) ListJournalEntries(ctx context.Context, limit int) ([]models.JournalEntry, error) {
	var entries []models.JournalEntry
	query := r.db.WithContext(ctx).Preload("Lines").Preload("Lines.Account").Order("entry_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&entries).Error
	return entries, err
}

func (r *repository) GetJournalEntryByID(ctx context.Context, id uuid.UUID) (*models.JournalEntry, error) {
	var entry models.JournalEntry
	err := r.db.WithContext(ctx).Preload("Lines").Preload("Lines.Account").Where("id = ?", id).First(&entry).Error
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

func (r *repository) CreateProductionBatch(ctx context.Context, tx *gorm.DB, batch *models.ProductionBatch) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.WithContext(ctx).Create(batch).Error
}

func (r *repository) ListProductionBatches(ctx context.Context, limit int) ([]models.ProductionBatch, error) {
	var batches []models.ProductionBatch
	query := r.db.WithContext(ctx).Preload("Ingredients").Preload("Ingredients.Item").Preload("Ingredients.ItemBatch").Order("production_date DESC, created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&batches).Error
	return batches, err
}

func (r *repository) ListProductionBatchesInPeriod(ctx context.Context, start time.Time, end time.Time) ([]models.ProductionBatch, error) {
	var batches []models.ProductionBatch
	err := r.db.WithContext(ctx).
		Preload("Ingredients").
		Preload("Ingredients.Item").
		Preload("Ingredients.ItemBatch").
		Where("production_date BETWEEN ? AND ?", start, end).
		Order("production_date DESC, created_at DESC").
		Find(&batches).Error
	return batches, err
}

func (r *repository) GetProductionBatchByID(ctx context.Context, id uuid.UUID) (*models.ProductionBatch, error) {
	var batch models.ProductionBatch
	err := r.db.WithContext(ctx).Preload("Ingredients").Preload("Ingredients.Item").Preload("Ingredients.ItemBatch").Where("id = ?", id).First(&batch).Error
	if err != nil {
		return nil, err
	}
	return &batch, nil
}

func (r *repository) GetDailyStockOutTotalCost(ctx context.Context, date time.Time) (float64, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 999999999, date.Location())

	type SumResult struct {
		Total float64
	}
	var res SumResult

	err := r.db.WithContext(ctx).
		Table("stock_movements").
		Select("COALESCE(SUM(total_cost_snapshot), 0) as total").
		Where("movement_type = ? AND created_at BETWEEN ? AND ?", models.MovementOut, startOfDay, endOfDay).
		Scan(&res).Error

	return res.Total, err
}

func (r *repository) GetDailyDeliveredPortions(ctx context.Context, date time.Time) (int64, int64, error) {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := time.Date(date.Year(), date.Month(), date.Day(), 23, 59, 59, 999999999, date.Location())

	type DistSummary struct {
		DistCount     int64
		TotalPortions int64
	}
	var res DistSummary

	err := r.db.WithContext(ctx).
		Table("distributions").
		Select("COUNT(id) as dist_count, COALESCE(SUM(total_portions), 0) as total_portions").
		Where("delivery_date BETWEEN ? AND ?", startOfDay, endOfDay).
		Scan(&res).Error

	return res.DistCount, res.TotalPortions, err
}

func (r *repository) GetDashboardStats(ctx context.Context) (*models.ProductionBatch, error) {
	return nil, nil
}
