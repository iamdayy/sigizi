package reporting

import (
	"context"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
)

type BankBalanceInquiryResponse struct {
	AccountNumber  string    `json:"account_number"`
	BankCode       string    `json:"bank_code"`
	CurrentBalance float64   `json:"current_balance"`
	CheckedAt      time.Time `json:"checked_at"`
}

type BankTopUpWebhookPayload struct {
	AccountNumber   string  `json:"account_number" binding:"required"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	ReferenceNumber string  `json:"reference_number" binding:"required"`
	Description     string  `json:"description"`
	TransactionDate string  `json:"transaction_date"` // YYYY-MM-DD
}

// BankAPIClient defines an extensible adapter interface for bank VA integrations (e.g. BRI, Mandiri, BNI, SIPGN)
type BankAPIClient interface {
	CheckBalance(ctx context.Context, va *models.VirtualAccount) (*BankBalanceInquiryResponse, error)
	SimulateAutoTopUp(ctx context.Context, va *models.VirtualAccount, amount float64, refNum, desc string) (*models.VATransaction, error)
}

type mockBankClient struct{}

func NewMockBankClient() BankAPIClient {
	return &mockBankClient{}
}

func (m *mockBankClient) CheckBalance(ctx context.Context, va *models.VirtualAccount) (*BankBalanceInquiryResponse, error) {
	return &BankBalanceInquiryResponse{
		AccountNumber:  va.AccountNumber,
		BankCode:       string(va.BankCode),
		CurrentBalance: va.CurrentBalance,
		CheckedAt:      time.Now(),
	}, nil
}

func (m *mockBankClient) SimulateAutoTopUp(ctx context.Context, va *models.VirtualAccount, amount float64, refNum, desc string) (*models.VATransaction, error) {
	newBalance := va.CurrentBalance + amount
	if refNum == "" {
		refNum = fmt.Sprintf("TOPUP-%s-%d", va.BankCode, time.Now().Unix())
	}
	if desc == "" {
		desc = fmt.Sprintf("Auto Top-Up Dana MBG dari Kas Negara / SIPGN (%s)", va.BankCode)
	}

	return &models.VATransaction{
		VirtualAccountID: va.ID,
		TransactionType:  "TOP_UP",
		Channel:          models.VAChannelAutoTopUp,
		Amount:           amount,
		BalanceAfter:     newBalance,
		ReferenceNumber:  refNum,
		Description:      desc,
		TransactionDate:  time.Now(),
	}, nil
}
