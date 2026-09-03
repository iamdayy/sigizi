package iam

import (
	"context"
	"fmt"

	"github.com/daydev/mbg-system/backend/internal/models"
)

type SSOClient interface {
	GetRedirectURL() string
	ExchangeCode(ctx context.Context, code string) (*SSOProfile, error)
}

type SSOProfile struct {
	ProviderID string
	Email      string
	FullName   string
	Role       models.UserRole
}

type mockSSOClient struct {
	redirectURL string
}

func NewMockSSOClient() SSOClient {
	return &mockSSOClient{
		redirectURL: "https://identity.bgn.go.id/auth?client_id=sigizi-sppg&response_type=code&redirect_uri=/api/v1/auth/sso/bgn/callback",
	}
}

func (m *mockSSOClient) GetRedirectURL() string {
	return m.redirectURL
}

func (m *mockSSOClient) ExchangeCode(ctx context.Context, code string) (*SSOProfile, error) {
	// In a real application, this would make an HTTP request to the OAuth2 provider
	// using the code to get an access token, then another request to get the profile.
	// For this simulation, if code == "simulated_success_code" we return a dummy profile.

	if code == "simulated_success_code" {
		return &SSOProfile{
			ProviderID: "BGN-ID-99901",
			Email:      "kepala.sppg@bgn.go.id",
			FullName:   "Budi Santoso (SSO)",
			Role:       models.RoleHeadSPPG,
		}, nil
	}

	return nil, fmt.Errorf("invalid or expired authorization code")
}
