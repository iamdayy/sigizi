package inventory

import (
	"context"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service interface {
	CreateItem(ctx context.Context, req *CreateItemRequest, userID uuid.UUID) (*models.Item, error)
	GetItem(ctx context.Context, id uuid.UUID) (*models.Item, error)
	ListItemsStock(ctx context.Context) ([]ItemStockSummary, error)

	CreateBatch(ctx context.Context, req *CreateBatchRequest, userID uuid.UUID) (*models.ItemBatch, error)
	GetBatches(ctx context.Context, itemID uuid.UUID) ([]models.ItemBatch, error)

	// FEFO Core Business Logic
	DepleteStockFEFO(ctx context.Context, tx *gorm.DB, req *StockOutRequest, userID uuid.UUID) (*StockOutResult, error)
	StockOut(ctx context.Context, req *StockOutRequest, userID uuid.UUID) (*StockOutResult, error)
	ListMovements(ctx context.Context, limit int) ([]models.StockMovement, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateItem(ctx context.Context, req *CreateItemRequest, userID uuid.UUID) (*models.Item, error) {
	item := &models.Item{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		SKU:               req.SKU,
		Name:              req.Name,
		Category:          req.Category,
		Unit:              req.Unit,
		MinStockThreshold: req.MinStockThreshold,
		IsPerishable:      req.IsPerishable,
	}

	if err := s.repo.CreateItem(ctx, item); err != nil {
		return nil, fmt.Errorf("failed to create item: %w", err)
	}
	return item, nil
}

func (s *service) GetItem(ctx context.Context, id uuid.UUID) (*models.Item, error) {
	return s.repo.GetItemByID(ctx, id)
}

func (s *service) ListItemsStock(ctx context.Context) ([]ItemStockSummary, error) {
	items, err := s.repo.ListItems(ctx)
	if err != nil {
		return nil, err
	}

	summaries := make([]ItemStockSummary, len(items))
	for i, it := range items {
		var totalStock float64
		var earliestExpiry *time.Time
		activeBatches := 0

		for _, b := range it.Batches {
			if b.CurrentQty > 0 {
				totalStock += b.CurrentQty
				activeBatches++
				if earliestExpiry == nil || b.ExpiryDate.Before(*earliestExpiry) {
					exp := b.ExpiryDate
					earliestExpiry = &exp
				}
			}
		}

		summaries[i] = ItemStockSummary{
			ID:                it.ID,
			SKU:               it.SKU,
			Name:              it.Name,
			Category:          it.Category,
			Unit:              it.Unit,
			MinStockThreshold: it.MinStockThreshold,
			IsPerishable:      it.IsPerishable,
			TotalStock:        totalStock,
			ActiveBatchCount:  activeBatches,
			EarliestExpiry:    earliestExpiry,
			IsLowStock:        totalStock <= it.MinStockThreshold,
			Batches:           it.Batches,
		}
	}

	return summaries, nil
}

func (s *service) CreateBatch(ctx context.Context, req *CreateBatchRequest, userID uuid.UUID) (*models.ItemBatch, error) {
	item, err := s.repo.GetItemByID(ctx, req.ItemID)
	if err != nil {
		return nil, fmt.Errorf("item not found: %w", err)
	}

	expiryDate, err := time.Parse("2006-01-02", req.ExpiryDate)
	if err != nil {
		return nil, fmt.Errorf("invalid expiry_date format. Expected YYYY-MM-DD: %w", err)
	}

	batchCode := req.BatchCode
	if batchCode == "" {
		batchCode = fmt.Sprintf("BATCH-%s-%s-%s", item.SKU, time.Now().Format("20060102"), uuid.New().String()[:6])
	}

	batch := &models.ItemBatch{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		ItemID:       req.ItemID,
		BatchCode:    batchCode,
		ExpiryDate:   expiryDate,
		UnitCost:     req.UnitCost,
		InitialQty:   req.Quantity,
		CurrentQty:   req.Quantity,
		ReceivedDate: time.Now(),
		SupplierName: req.SupplierName,
	}

	// Transactionally save batch and record initial Stock In movement
	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(batch).Error; err != nil {
			return err
		}

		movement := &models.StockMovement{
			AuditModel: models.AuditModel{
				CreatedBy: &userID,
			},
			ItemBatchID:       batch.ID,
			MovementType:      models.MovementIn,
			Quantity:          req.Quantity,
			ReferenceType:     models.RefPurchaseReceipt,
			ReferenceID:       batch.BatchCode,
			Notes:             fmt.Sprintf("Stock in from supplier %s", req.SupplierName),
			UnitCostSnapshot:  req.UnitCost,
			TotalCostSnapshot: req.Quantity * req.UnitCost,
		}

		return tx.Create(movement).Error
	})

	if err != nil {
		return nil, fmt.Errorf("failed to save batch receipt: %w", err)
	}

	return batch, nil
}

func (s *service) GetBatches(ctx context.Context, itemID uuid.UUID) ([]models.ItemBatch, error) {
	return s.repo.GetBatchesByItemID(ctx, itemID)
}

// DepleteStockFEFO implements the core FEFO algorithm within an existing or passed gorm transaction
func (s *service) DepleteStockFEFO(ctx context.Context, tx *gorm.DB, req *StockOutRequest, userID uuid.UUID) (*StockOutResult, error) {
	item, err := s.repo.GetItemByID(ctx, req.ItemID)
	if err != nil {
		return nil, fmt.Errorf("item '%s' not found: %w", req.ItemID, err)
	}

	// Step 1: Query active batches ordered strictly by expiry_date ASC with Row Locks (FOR UPDATE)
	batches, err := s.repo.GetActiveBatchesForFEFO(ctx, tx, req.ItemID)
	if err != nil {
		return nil, err
	}

	// Step 2: Calculate total available inventory across active batches
	var totalAvailable float64
	for _, b := range batches {
		totalAvailable += b.CurrentQty
	}

	if totalAvailable < req.RequestedQty {
		return nil, fmt.Errorf("insufficient stock for item '%s' (%s): requested %.4f %s, available %.4f %s",
			item.Name, item.SKU, req.RequestedQty, item.Unit, totalAvailable, item.Unit)
	}

	// Step 3: Deplete batch by batch (FEFO)
	remainingToDeplete := req.RequestedQty
	var totalCost float64
	var allocations []DepletedBatchAllocation

	for _, batch := range batches {
		if remainingToDeplete <= 0 {
			break
		}

		var qtyToDeduct float64
		if batch.CurrentQty >= remainingToDeplete {
			qtyToDeduct = remainingToDeplete
			remainingToDeplete = 0
		} else {
			qtyToDeduct = batch.CurrentQty
			remainingToDeplete -= batch.CurrentQty
		}

		newBatchQty := batch.CurrentQty - qtyToDeduct
		subtotalCost := qtyToDeduct * batch.UnitCost
		totalCost += subtotalCost

		// Update batch current_qty in DB
		if err := s.repo.UpdateBatchQty(ctx, tx, batch.ID, newBatchQty); err != nil {
			return nil, fmt.Errorf("failed to update batch '%s': %w", batch.BatchCode, err)
		}

		// Insert StockMovement Audit record
		movement := &models.StockMovement{
			AuditModel: models.AuditModel{
				CreatedBy: &userID,
			},
			ItemBatchID:       batch.ID,
			MovementType:      models.MovementOut,
			Quantity:          qtyToDeduct,
			ReferenceType:     req.ReferenceType,
			ReferenceID:       req.ReferenceID,
			Notes:             req.Notes,
			UnitCostSnapshot:  batch.UnitCost,
			TotalCostSnapshot: subtotalCost,
		}

		if err := s.repo.CreateStockMovement(ctx, tx, movement); err != nil {
			return nil, fmt.Errorf("failed to log stock movement: %w", err)
		}

		allocations = append(allocations, DepletedBatchAllocation{
			BatchID:      batch.ID,
			BatchCode:    batch.BatchCode,
			ExpiryDate:   batch.ExpiryDate.Format("2006-01-02"),
			DepletedQty:  qtyToDeduct,
			RemainingQty: newBatchQty,
			UnitCost:     batch.UnitCost,
			SubtotalCost: subtotalCost,
		})
	}

	return &StockOutResult{
		ItemID:           item.ID,
		ItemName:         item.Name,
		TotalQtyDepleted: req.RequestedQty,
		TotalCost:        totalCost,
		Allocations:      allocations,
	}, nil
}

// StockOut wraps DepleteStockFEFO in an isolated atomic database transaction
func (s *service) StockOut(ctx context.Context, req *StockOutRequest, userID uuid.UUID) (*StockOutResult, error) {
	var result *StockOutResult

	err := s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res, err := s.DepleteStockFEFO(ctx, tx, req, userID)
		if err != nil {
			return err
		}
		result = res
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

func (s *service) ListMovements(ctx context.Context, limit int) ([]models.StockMovement, error) {
	return s.repo.ListStockMovements(ctx, limit)
}
