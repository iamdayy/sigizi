package models

import (
	"time"

	"github.com/google/uuid"
)

type ItemCategory string

const (
	CategoryProtein      ItemCategory = "PROTEIN"
	CategoryCarbohydrate ItemCategory = "CARBOHYDRATE"
	CategoryVegetable    ItemCategory = "VEGETABLE"
	CategoryFruit        ItemCategory = "FRUIT"
	CategoryDairy        ItemCategory = "DAIRY"
	CategorySpice        ItemCategory = "SPICE"
	CategoryPackaging    ItemCategory = "PACKAGING"
	CategoryBeverage     ItemCategory = "BEVERAGE"
	CategoryOther        ItemCategory = "OTHER"
)

type MovementType string

const (
	MovementIn         MovementType = "IN"
	MovementOut        MovementType = "OUT"
	MovementAdjustment MovementType = "ADJUSTMENT"
	MovementWaste      MovementType = "WASTE"
)

type ReferenceType string

const (
	RefPurchaseReceipt      ReferenceType = "PURCHASE_RECEIPT"
	RefMealProduction       ReferenceType = "MEAL_PRODUCTION"
	RefDistribution         ReferenceType = "DISTRIBUTION"
	RefStockOpname          ReferenceType = "STOCK_OPNAME"
	RefExpiredDisposal      ReferenceType = "EXPIRED_DISPOSAL"
	RefDailyReconciliation ReferenceType = "DAILY_RECONCILIATION"
)

type Item struct {
	AuditModel
	SKU               string       `gorm:"type:varchar(64);uniqueIndex;not null" json:"sku"`
	Name              string       `gorm:"type:varchar(255);not null" json:"name"`
	Category          ItemCategory `gorm:"type:varchar(32);not null" json:"category"`
	Unit              string       `gorm:"type:varchar(32);not null" json:"unit"` // e.g. "kg", "gram", "pcs"
	GramsPerUnit      float64      `gorm:"type:numeric(15,4);not null;default:1" json:"grams_per_unit"` // Used for converting recipe portions to inventory units
	MinStockThreshold float64      `gorm:"type:numeric(15,4);not null;default:0" json:"min_stock_threshold"`
	IsPerishable      bool         `gorm:"type:boolean;not null;default:true" json:"is_perishable"`
	Batches           []ItemBatch  `gorm:"foreignKey:ItemID" json:"batches,omitempty"`
}

// ItemBatch represents a physical lot of inventory for FEFO (First Expired First Out) stock management
type ItemBatch struct {
	AuditModel
	ItemID       uuid.UUID `gorm:"type:uuid;not null;index:idx_item_batches_fefo,priority:1" json:"item_id"`
	Item         *Item     `gorm:"foreignKey:ItemID" json:"item,omitempty"`
	BatchCode    string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"batch_code"`
	ExpiryDate   time.Time `gorm:"type:date;not null;index:idx_item_batches_fefo,priority:2;index" json:"expiry_date"`
	UnitCost     float64   `gorm:"type:numeric(15,4);not null" json:"unit_cost"`
	InitialQty   float64   `gorm:"type:numeric(15,4);not null" json:"initial_qty"`
	CurrentQty   float64   `gorm:"type:numeric(15,4);not null;index" json:"current_qty"`
	ReceivedDate time.Time `gorm:"type:date;not null" json:"received_date"`
	SupplierName string    `gorm:"type:varchar(255)" json:"supplier_name,omitempty"`
}

// StockMovement tracks exact batch depleting or replenishing for audit trails
type StockMovement struct {
	AuditModel
	ItemBatchID       uuid.UUID     `gorm:"type:uuid;not null;index" json:"item_batch_id"`
	ItemBatch         *ItemBatch    `gorm:"foreignKey:ItemBatchID" json:"item_batch,omitempty"`
	MovementType      MovementType  `gorm:"type:varchar(32);not null" json:"movement_type"`
	Quantity          float64       `gorm:"type:numeric(15,4);not null" json:"quantity"`
	ReferenceType     ReferenceType `gorm:"type:varchar(64);not null;index" json:"reference_type"`
	ReferenceID       string        `gorm:"type:varchar(128);not null;index" json:"reference_id"`
	Notes             string        `gorm:"type:text" json:"notes,omitempty"`
	UnitCostSnapshot  float64       `gorm:"type:numeric(15,4);not null" json:"unit_cost_snapshot"`
	TotalCostSnapshot float64       `gorm:"type:numeric(15,4);not null" json:"total_cost_snapshot"`
}
