package inventory

import (
	"context"
	"fmt"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository interface {
	GetDB() *gorm.DB
	CreateItem(ctx context.Context, item *models.Item) error
	GetItemByID(ctx context.Context, id uuid.UUID) (*models.Item, error)
	GetItemBySKU(ctx context.Context, sku string) (*models.Item, error)
	ListItems(ctx context.Context) ([]models.Item, error)

	CreateBatch(ctx context.Context, batch *models.ItemBatch) error
	GetBatchByID(ctx context.Context, id uuid.UUID) (*models.ItemBatch, error)
	GetBatchesByItemID(ctx context.Context, itemID uuid.UUID) ([]models.ItemBatch, error)

	// FEFO Specific Query (Row-locking for transaction safety)
	GetActiveBatchesForFEFO(ctx context.Context, tx *gorm.DB, itemID uuid.UUID) ([]models.ItemBatch, error)
	UpdateBatchQty(ctx context.Context, tx *gorm.DB, batchID uuid.UUID, newQty float64) error
	CreateStockMovement(ctx context.Context, tx *gorm.DB, movement *models.StockMovement) error
	ListStockMovements(ctx context.Context, limit int) ([]models.StockMovement, error)
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

func (r *repository) CreateItem(ctx context.Context, item *models.Item) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *repository) GetItemByID(ctx context.Context, id uuid.UUID) (*models.Item, error) {
	var item models.Item
	err := r.db.WithContext(ctx).Preload("Batches", "current_qty > 0", func(db *gorm.DB) *gorm.DB {
		return db.Order("expiry_date ASC")
	}).Where("id = ?", id).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) GetItemBySKU(ctx context.Context, sku string) (*models.Item, error) {
	var item models.Item
	err := r.db.WithContext(ctx).Where("sku = ?", sku).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) ListItems(ctx context.Context) ([]models.Item, error) {
	var items []models.Item
	err := r.db.WithContext(ctx).Preload("Batches", "current_qty > 0", func(db *gorm.DB) *gorm.DB {
		return db.Order("expiry_date ASC")
	}).Order("name ASC").Find(&items).Error
	return items, err
}

func (r *repository) CreateBatch(ctx context.Context, batch *models.ItemBatch) error {
	return r.db.WithContext(ctx).Create(batch).Error
}

func (r *repository) GetBatchByID(ctx context.Context, id uuid.UUID) (*models.ItemBatch, error) {
	var batch models.ItemBatch
	err := r.db.WithContext(ctx).Preload("Item").Where("id = ?", id).First(&batch).Error
	if err != nil {
		return nil, err
	}
	return &batch, nil
}

func (r *repository) GetBatchesByItemID(ctx context.Context, itemID uuid.UUID) ([]models.ItemBatch, error) {
	var batches []models.ItemBatch
	err := r.db.WithContext(ctx).Where("item_id = ?", itemID).Order("expiry_date ASC").Find(&batches).Error
	return batches, err
}

// GetActiveBatchesForFEFO retrieves active batches ordered strictly by ExpiryDate ASC with Row Locking (FOR UPDATE)
func (r *repository) GetActiveBatchesForFEFO(ctx context.Context, tx *gorm.DB, itemID uuid.UUID) ([]models.ItemBatch, error) {
	var batches []models.ItemBatch
	// Use FOR UPDATE for concurrency safety against race conditions during high-volume kitchen prep
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("item_id = ? AND current_qty > 0", itemID).
		Order("expiry_date ASC, created_at ASC").
		Find(&batches).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query FEFO batches: %w", err)
	}
	return batches, nil
}

func (r *repository) UpdateBatchQty(ctx context.Context, tx *gorm.DB, batchID uuid.UUID, newQty float64) error {
	return tx.WithContext(ctx).
		Model(&models.ItemBatch{}).
		Where("id = ?", batchID).
		Update("current_qty", newQty).Error
}

func (r *repository) CreateStockMovement(ctx context.Context, tx *gorm.DB, movement *models.StockMovement) error {
	return tx.WithContext(ctx).Create(movement).Error
}

func (r *repository) ListStockMovements(ctx context.Context, limit int) ([]models.StockMovement, error) {
	var movements []models.StockMovement
	query := r.db.WithContext(ctx).Preload("ItemBatch").Preload("ItemBatch.Item").Order("created_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&movements).Error
	return movements, err
}
