package models

import (
	"time"

	"github.com/google/uuid"
)

type AccountType string

const (
	AccountAsset     AccountType = "ASSET"
	AccountLiability AccountType = "LIABILITY"
	AccountEquity    AccountType = "EQUITY"
	AccountRevenue   AccountType = "REVENUE"
	AccountExpense   AccountType = "EXPENSE"
	AccountCOGS      AccountType = "COGS"
)

type NormalBalanceType string

const (
	BalanceDebit  NormalBalanceType = "DEBIT"
	BalanceCredit NormalBalanceType = "CREDIT"
)

type Account struct {
	AuditModel
	Code          string            `gorm:"type:varchar(32);uniqueIndex;not null" json:"code"`
	Name          string            `gorm:"type:varchar(255);not null" json:"name"`
	Type          AccountType       `gorm:"type:varchar(32);not null;index" json:"type"`
	NormalBalance NormalBalanceType `gorm:"type:varchar(16);not null" json:"normal_balance"`
	IsActive      bool              `gorm:"type:boolean;not null;default:true" json:"is_active"`
	Description   string            `gorm:"type:text" json:"description,omitempty"`
	ParentID      *uuid.UUID        `gorm:"type:uuid" json:"parent_id,omitempty"`
	Parent        *Account          `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
}

type JournalEntry struct {
	AuditModel
	EntryNumber      string        `gorm:"type:varchar(64);uniqueIndex;not null" json:"entry_number"`
	EntryDate        time.Time     `gorm:"type:date;not null;index" json:"entry_date"`
	Description      string        `gorm:"type:text;not null" json:"description"`
	ReferenceType    string        `gorm:"type:varchar(64);not null" json:"reference_type"`
	ReferenceID      string        `gorm:"type:varchar(128)" json:"reference_id,omitempty"`
	IsAutoReconciled bool          `gorm:"type:boolean;not null;default:false" json:"is_auto_reconciled"`
	TotalDebit       float64       `gorm:"type:numeric(18,4);not null;default:0" json:"total_debit"`
	TotalCredit      float64       `gorm:"type:numeric(18,4);not null;default:0" json:"total_credit"`
	Lines            []JournalLine `gorm:"foreignKey:JournalEntryID;constraint:OnDelete:CASCADE" json:"lines"`
}

type JournalLine struct {
	AuditModel
	JournalEntryID uuid.UUID     `gorm:"type:uuid;not null;index" json:"journal_entry_id"`
	JournalEntry   *JournalEntry `gorm:"foreignKey:JournalEntryID" json:"-"`
	AccountID      uuid.UUID     `gorm:"type:uuid;not null;index" json:"account_id"`
	Account        *Account      `gorm:"foreignKey:AccountID" json:"account,omitempty"`
	Debit          float64       `gorm:"type:numeric(18,4);not null;default:0" json:"debit"`
	Credit         float64       `gorm:"type:numeric(18,4);not null;default:0" json:"credit"`
	Description    string        `gorm:"type:varchar(255)" json:"description,omitempty"`
}

type ProductionBatch struct {
	AuditModel
	ProductionCode         string                 `gorm:"type:varchar(64);uniqueIndex;not null" json:"production_code"`
	ProductionDate         time.Time              `gorm:"type:date;not null;index" json:"production_date"`
	MealName               string                 `gorm:"type:varchar(255);not null" json:"meal_name"`
	TotalPortions          int                    `gorm:"type:integer;not null" json:"total_portions"`
	SellingPricePerPortion float64                `gorm:"type:numeric(15,4);not null;default:15000" json:"selling_price_per_portion"`
	TotalCOGS              float64                `gorm:"type:numeric(18,4);not null" json:"total_cogs"`
	COGSPerPortion         float64                `gorm:"type:numeric(15,4);not null" json:"cogs_per_portion"`
	GrossProfitPerPortion  float64                `gorm:"type:numeric(15,4);not null" json:"gross_profit_per_portion"`
	TotalGrossProfit       float64                `gorm:"type:numeric(18,4);not null" json:"total_gross_profit"`
	MarginPercentage       float64                `gorm:"type:numeric(8,4);not null" json:"margin_percentage"`
	IsMarginCritical       bool                   `gorm:"type:boolean;not null;default:false;index" json:"is_margin_critical"` // Set true if Margin < 10%
	Notes                  string                 `gorm:"type:text" json:"notes,omitempty"`
	Ingredients            []ProductionIngredient `gorm:"foreignKey:ProductionBatchID;constraint:OnDelete:CASCADE" json:"ingredients,omitempty"`
}

type ProductionIngredient struct {
	AuditModel
	ProductionBatchID uuid.UUID   `gorm:"type:uuid;not null;index" json:"production_batch_id"`
	ItemID            uuid.UUID   `gorm:"type:uuid;not null" json:"item_id"`
	Item              *Item       `gorm:"foreignKey:ItemID" json:"item,omitempty"`
	ItemBatchID       uuid.UUID   `gorm:"type:uuid;not null" json:"item_batch_id"`
	ItemBatch         *ItemBatch  `gorm:"foreignKey:ItemBatchID" json:"item_batch,omitempty"`
	QtyUsed           float64     `gorm:"type:numeric(15,4);not null" json:"qty_used"`
	UnitCostSnapshot  float64     `gorm:"type:numeric(15,4);not null" json:"unit_cost_snapshot"`
	TotalCostSnapshot float64     `gorm:"type:numeric(15,4);not null" json:"total_cost_snapshot"`
}
