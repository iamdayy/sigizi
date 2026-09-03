package reporting

import (
	"context"
	"fmt"
	"net/http"
	"os"
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

type realBankClient struct {
	client  *http.Client
	baseURL string
	apiKey  string
}

func NewRealBankClient() BankAPIClient {
	// In a real application, these values should be loaded from environment variables or a secure vault
	baseURL := os.Getenv("BANK_API_URL")
	if baseURL == "" {
		baseURL = "https://api.sandbox.bank.com"
	}
	apiKey := os.Getenv("BANK_API_KEY")

	return &realBankClient{
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
		baseURL: baseURL,
		apiKey:  apiKey,
	}
}

func (r *realBankClient) CheckBalance(ctx context.Context, va *models.VirtualAccount) (*BankBalanceInquiryResponse, error) {
	// Construct the request URL
	url := fmt.Sprintf("%s/v1/virtual-accounts/%s/balance", r.baseURL, va.AccountNumber)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")

	// Execute the HTTP request
	resp, err := r.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("bank API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("bank API returned non-OK status: %d", resp.StatusCode)
	}

	// For demonstration, we simulate parsing a response if it succeeds
	return &BankBalanceInquiryResponse{
		AccountNumber:  va.AccountNumber,
		BankCode:       string(va.BankCode),
		CurrentBalance: va.CurrentBalance, // Mocking actual value for this implementation
		CheckedAt:      time.Now(),
	}, nil
}

func (r *realBankClient) SimulateAutoTopUp(ctx context.Context, va *models.VirtualAccount, amount float64, refNum, desc string) (*models.VATransaction, error) {
	// This function simulates an auto top-up process, typically triggered by a webhook from the bank.
	// In a fully integrated system, the bank sends a webhook (e.g. ProcessBankWebhook) and this function might just log it or be part of a test suite.
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
