package inventory

import (
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type CreateItemRequest struct {
	SKU               string              `json:"sku" binding:"required"`
	Name              string              `json:"name" binding:"required"`
	Category          models.ItemCategory `json:"category" binding:"required"`
	Unit              string              `json:"unit" binding:"required"`
	MinStockThreshold float64             `json:"min_stock_threshold"`
	IsPerishable      bool                `json:"is_perishable"`
}

type CreateBatchRequest struct {
	ItemID       uuid.UUID `json:"item_id" binding:"required"`
	BatchCode    string    `json:"batch_code"`
	ExpiryDate   string    `json:"expiry_date" binding:"required"` // Format: YYYY-MM-DD
	UnitCost     float64   `json:"unit_cost" binding:"required,gt=0"`
	Quantity     float64   `json:"quantity" binding:"required,gt=0"`
	SupplierName string    `json:"supplier_name"`
}

type StockOutRequest struct {
	ItemID        uuid.UUID            `json:"item_id" binding:"required"`
	RequestedQty  float64              `json:"requested_qty" binding:"required,gt=0"`
	ReferenceType models.ReferenceType `json:"reference_type" binding:"required"`
	ReferenceID   string               `json:"reference_id" binding:"required"`
	Notes         string               `json:"notes"`
}

type DepletedBatchAllocation struct {
	BatchID      uuid.UUID `json:"batch_id"`
	BatchCode    string    `json:"batch_code"`
	ExpiryDate   string    `json:"expiry_date"`
	DepletedQty  float64   `json:"depleted_qty"`
	RemainingQty float64   `json:"remaining_qty"`
	UnitCost     float64   `json:"unit_cost"`
	SubtotalCost float64   `json:"subtotal_cost"`
}

type StockOutResult struct {
	ItemID           uuid.UUID                  `json:"item_id"`
	ItemName         string                     `json:"item_name"`
	TotalQtyDepleted float64                    `json:"total_qty_depleted"`
	TotalCost        float64                    `json:"total_cost"`
	Allocations      []DepletedBatchAllocation `json:"allocations"`
}

type ItemStockSummary struct {
	ID                uuid.UUID           `json:"id"`
	SKU               string              `json:"sku"`
	Name              string              `json:"name"`
	Category          models.ItemCategory `json:"category"`
	Unit              string              `json:"unit"`
	MinStockThreshold float64             `json:"min_stock_threshold"`
	IsPerishable      bool                `json:"is_perishable"`
	TotalStock        float64             `json:"total_stock"`
	ActiveBatchCount  int                 `json:"active_batch_count"`
	EarliestExpiry    *time.Time          `json:"earliest_expiry,omitempty"`
	IsLowStock        bool                `json:"is_low_stock"`
	Batches           []models.ItemBatch  `json:"batches,omitempty"`
}
