package models

import (
	"time"

	"github.com/google/uuid"
)

// --- Virtual Account Management (Bank API & SIPGN ready) ---

type BankCode string

const (
	BankBRI     BankCode = "BRI"
	BankMandiri BankCode = "MANDIRI"
	BankBNI     BankCode = "BNI"
	BankBCA     BankCode = "BCA"
	BankSIPGN   BankCode = "SIPGN_BGN"
)

type VirtualAccount struct {
	AuditModel
	AccountNumber         string   `gorm:"type:varchar(64);uniqueIndex;not null" json:"account_number"`
	BankCode              BankCode `gorm:"type:varchar(32);not null;default:'BRI'" json:"bank_code"`
	BankName              string   `gorm:"type:varchar(100);not null" json:"bank_name"`
	AccountHolder         string   `gorm:"type:varchar(255);not null" json:"account_holder"`
	CurrentBalance        float64  `gorm:"type:numeric(18,4);not null;default:0" json:"current_balance"`
	APIIntegrationEnabled bool     `gorm:"type:boolean;not null;default:false" json:"api_integration_enabled"`
	APIClientID           string   `gorm:"type:varchar(128)" json:"api_client_id,omitempty"`
	APIEndpoint           string   `gorm:"type:text" json:"api_endpoint,omitempty"`
	IsActive              bool     `gorm:"type:boolean;not null;default:true" json:"is_active"`
}

type VATransactionChannel string

const (
	VAChannelManual     VATransactionChannel = "MANUAL"
	VAChannelAPIWebhook VATransactionChannel = "API_WEBHOOK"
	VAChannelAutoTopUp  VATransactionChannel = "SIPGN_AUTO_TOPUP"
)

type VATransaction struct {
	AuditModel
	VirtualAccountID uuid.UUID            `gorm:"type:uuid;not null;index" json:"virtual_account_id"`
	VirtualAccount   *VirtualAccount      `gorm:"foreignKey:VirtualAccountID" json:"virtual_account,omitempty"`
	TransactionType  string               `gorm:"type:varchar(32);not null" json:"transaction_type"` // TOP_UP, DISBURSEMENT, RECONCILIATION
	Channel          VATransactionChannel `gorm:"type:varchar(32);not null;default:'MANUAL'" json:"channel"`
	Amount           float64              `gorm:"type:numeric(18,4);not null" json:"amount"`
	BalanceAfter     float64              `gorm:"type:numeric(18,4);not null" json:"balance_after"`
	ReferenceNumber  string               `gorm:"type:varchar(128);index" json:"reference_number,omitempty"`
	Description      string               `gorm:"type:text" json:"description,omitempty"`
	TransactionDate  time.Time            `gorm:"type:date;not null;index" json:"transaction_date"`
	VerifiedByID     *uuid.UUID           `gorm:"type:uuid" json:"verified_by_id,omitempty"`
	VerifiedBy       *User                `gorm:"foreignKey:VerifiedByID" json:"verified_by,omitempty"`
}

// --- Periodic Standard Reports ---

type ReportType string

const (
	ReportDailyFundUsage ReportType = "DAILY_FUND_USAGE" // Laporan Penggunaan Dana Harian
	ReportBiweekly       ReportType = "BIWEEKLY_LPA"     // Laporan 2 Mingguan (LPA BGN)
	ReportMonthly        ReportType = "MONTHLY"          // Laporan Pertanggungjawaban Bulanan
	ReportCashBook       ReportType = "CASH_BOOK"        // Buku Kas Umum (BKU)
	ReportPettyCashBook  ReportType = "PETTY_CASH_BOOK"  // Buku Bantu Kas Kecil
	ReportFoodSupplyBook ReportType = "FOOD_SUPPLY_BOOK" // Buku Bantu Bahan Pangan
)

type GeneratedReport struct {
	AuditModel
	ReportType    ReportType `gorm:"type:varchar(64);not null;index" json:"report_type"`
	ReportNumber  string     `gorm:"type:varchar(64);uniqueIndex;not null" json:"report_number"`
	PeriodStart   time.Time  `gorm:"type:date;not null" json:"period_start"`
	PeriodEnd     time.Time  `gorm:"type:date;not null" json:"period_end"`
	TotalPortions int        `gorm:"type:integer;not null;default:0" json:"total_portions"`
	TotalAmount   float64    `gorm:"type:numeric(18,4);not null;default:0" json:"total_amount"`
	FileURL       string     `gorm:"type:text;not null" json:"file_url"`
	FileSizeBytes int64      `gorm:"type:bigint" json:"file_size_bytes,omitempty"`
	GeneratedByID uuid.UUID  `gorm:"type:uuid;not null;index" json:"generated_by_id"`
	GeneratedBy   *User      `gorm:"foreignKey:GeneratedByID" json:"generated_by,omitempty"`
	Notes         string     `gorm:"type:text" json:"notes,omitempty"`
}
