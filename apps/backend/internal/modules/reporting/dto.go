package reporting

import (
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type CreateVirtualAccountRequest struct {
	AccountNumber         string          `json:"account_number" binding:"required"`
	BankCode              models.BankCode `json:"bank_code" binding:"required"`
	BankName              string          `json:"bank_name" binding:"required"`
	AccountHolder         string          `json:"account_holder" binding:"required"`
	InitialBalance        float64         `json:"initial_balance"`
	APIIntegrationEnabled bool            `json:"api_integration_enabled"`
	APIClientID           string          `json:"api_client_id"`
	APIEndpoint           string          `json:"api_endpoint"`
}

type RecordVATransactionRequest struct {
	TransactionType string                      `json:"transaction_type" binding:"required"` // TOP_UP | DISBURSEMENT
	Channel         models.VATransactionChannel `json:"channel"`
	Amount          float64                     `json:"amount" binding:"required,gt=0"`
	ReferenceNumber string                      `json:"reference_number"`
	Description     string                      `json:"description" binding:"required"`
	TransactionDate string                      `json:"transaction_date"` // YYYY-MM-DD
}

type GenerateReportRequest struct {
	ReportType  models.ReportType `json:"report_type" binding:"required"`
	PeriodStart string            `json:"period_start" binding:"required"` // YYYY-MM-DD
	PeriodEnd   string            `json:"period_end" binding:"required"`   // YYYY-MM-DD
	HeadName    string            `json:"head_name"`
	Notes       string            `json:"notes"`
}

type ReportSummaryResponse struct {
	ID            uuid.UUID         `json:"id"`
	ReportType    models.ReportType `json:"report_type"`
	ReportNumber  string            `json:"report_number"`
	PeriodStart   string            `json:"period_start"`
	PeriodEnd     string            `json:"period_end"`
	TotalPortions int               `json:"total_portions"`
	TotalAmount   float64           `json:"total_amount"`
	FileURL       string            `json:"file_url"`
	FileSizeBytes int64             `json:"file_size_bytes"`
	GeneratedAt   time.Time         `json:"generated_at"`
	GeneratedBy   string            `json:"generated_by"`
	Notes         string            `json:"notes"`
}
