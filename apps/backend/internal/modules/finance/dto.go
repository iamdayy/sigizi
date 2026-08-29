package finance

import (
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type CreateAccountRequest struct {
	Code          string                   `json:"code" binding:"required"`
	Name          string                   `json:"name" binding:"required"`
	Type          models.AccountType       `json:"type" binding:"required"`
	NormalBalance models.NormalBalanceType `json:"normal_balance" binding:"required"`
	Description   string                   `json:"description"`
	ParentID      *uuid.UUID               `json:"parent_id"`
}

type CreateJournalLineRequest struct {
	AccountID   uuid.UUID `json:"account_id" binding:"required"`
	Debit       float64   `json:"debit"`
	Credit      float64   `json:"credit"`
	Description string    `json:"description"`
}

type CreateJournalEntryRequest struct {
	EntryDate     string                     `json:"entry_date" binding:"required"` // YYYY-MM-DD
	Description   string                     `json:"description" binding:"required"`
	ReferenceType string                     `json:"reference_type" binding:"required"`
	ReferenceID   string                     `json:"reference_id"`
	Lines         []CreateJournalLineRequest `json:"lines" binding:"required,min=2"`
}

type ProductionIngredientInput struct {
	ItemID      uuid.UUID `json:"item_id" binding:"required"`
	QtyRequired float64   `json:"qty_required" binding:"required,gt=0"`
}

type MealProductionRequest struct {
	MealName                string                      `json:"meal_name" binding:"required"`
	TargetPortions          int                         `json:"target_portions" binding:"required,gt=0"`
	SellingPricePerPortion float64                     `json:"selling_price_per_portion" binding:"required,gt=0"`
	Ingredients             []ProductionIngredientInput `json:"ingredients" binding:"required,min=1"`
	Notes                   string                      `json:"notes"`
}

type IngredientCostDetail struct {
	ItemID              uuid.UUID `json:"item_id"`
	ItemName            string    `json:"item_name"`
	QtyUsed             float64   `json:"qty_used"`
	Unit                string    `json:"unit"`
	TotalIngredientCost float64   `json:"total_ingredient_cost"`
}

type MealProductionResult struct {
	ID                     uuid.UUID              `json:"id"`
	ProductionCode         string                 `json:"production_code"`
	ProductionDate         string                 `json:"production_date"`
	MealName               string                 `json:"meal_name"`
	TotalPortions          int                    `json:"total_portions"`
	SellingPricePerPortion float64                `json:"selling_price_per_portion"`
	TotalCOGS              float64                `json:"total_cogs"`
	COGSPerPortion         float64                `json:"cogs_per_portion"`
	GrossProfitPerPortion  float64                `json:"gross_profit_per_portion"`
	TotalGrossProfit       float64                `json:"total_gross_profit"`
	MarginPercentage       float64                `json:"margin_percentage"`
	IsMarginCritical       bool                   `json:"is_margin_critical"` // True if Margin < 10%
	IngredientsBreakdown   []IngredientCostDetail `json:"ingredients_breakdown"`
}

type ReconciliationReport struct {
	ReconciliationDate     string    `json:"reconciliation_date"`
	ProcessedAt            time.Time `json:"processed_at"`
	TotalDistributions     int64     `json:"total_distributions"`
	TotalPortionsDelivered int64     `json:"total_portions_delivered"`
	TotalStockOutCost      float64   `json:"total_stock_out_cost"`
	JournalEntryID         uuid.UUID `json:"journal_entry_id,omitempty"`
	JournalEntryNumber     string    `json:"journal_entry_number,omitempty"`
	Status                 string    `json:"status"` // SUCCESS | SKIPPED_NO_MOVEMENTS | ERROR
	Message                string    `json:"message"`
}

type FinancialDashboardStats struct {
	Period                   string  `json:"period"`
	TotalPortionsProduced    int     `json:"total_portions_produced"`
	TotalRevenue             float64 `json:"total_revenue"`
	TotalCOGS                float64 `json:"total_cogs"`
	TotalGrossProfit         float64 `json:"total_gross_profit"`
	AverageMarginPercentage  float64 `json:"average_margin_percentage"`
	CriticalMarginBatchCount int     `json:"critical_margin_batch_count"`
	RecentCOGSTrend          []struct {
		Date             string  `json:"date"`
		MealName         string  `json:"meal_name"`
		COGSPerPortion   float64 `json:"cogs_per_portion"`
		MarginPercentage float64 `json:"margin_percentage"`
		IsCritical       bool    `json:"is_critical"`
	} `json:"recent_cogs_trend"`
}
