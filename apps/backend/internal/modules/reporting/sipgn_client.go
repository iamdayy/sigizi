package reporting

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type SIPGNClient interface {
	SendDailyReport(ctx context.Context, payload DailyReportPayload) error
	SendBAST(ctx context.Context, payload BASTPayload) error
}

type DailyReportPayload struct {
	ReportNumber  string  `json:"report_number"`
	PeriodStart   string  `json:"period_start"`
	PeriodEnd     string  `json:"period_end"`
	TotalPortions int     `json:"total_portions"`
	TotalAmount   float64 `json:"total_amount"`
	FileURL       string  `json:"file_url"`
}

type BASTPayload struct {
	DocumentNumber string  `json:"document_number"`
	PeriodStart    string  `json:"period_start"`
	PeriodEnd      string  `json:"period_end"`
	TotalPortions  int     `json:"total_portions"`
	TotalAmount    float64 `json:"total_amount"`
	FileURL        string  `json:"file_url"`
}

type sipgnClientImpl struct {
	client  *http.Client
	baseURL string
	apiKey  string
}

func NewSIPGNClient() SIPGNClient {
	baseURL := os.Getenv("SIPGN_API_URL")
	if baseURL == "" {
		baseURL = "https://api.sipgn.bgn.go.id/v1"
	}
	apiKey := os.Getenv("SIPGN_API_KEY")

	return &sipgnClientImpl{
		client: &http.Client{
			Timeout: 20 * time.Second,
		},
		baseURL: baseURL,
		apiKey:  apiKey,
	}
}

func (s *sipgnClientImpl) SendDailyReport(ctx context.Context, payload DailyReportPayload) error {
	url := fmt.Sprintf("%s/reports/daily", s.baseURL)
	return s.doPost(ctx, url, payload)
}

func (s *sipgnClientImpl) SendBAST(ctx context.Context, payload BASTPayload) error {
	url := fmt.Sprintf("%s/bast", s.baseURL)
	return s.doPost(ctx, url, payload)
}

func (s *sipgnClientImpl) doPost(ctx context.Context, url string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to serialize payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("SIPGN API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("SIPGN API returned non-OK status: %d", resp.StatusCode)
	}

	return nil
}
