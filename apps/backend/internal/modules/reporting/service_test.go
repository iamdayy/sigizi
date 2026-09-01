package reporting

import (
	"context"
	"errors"
	"testing"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type mockFailingRepo struct {
	Repository
}

func (m *mockFailingRepo) UpdateVirtualAccount(ctx context.Context, tx *gorm.DB, va *models.VirtualAccount) error {
	return errors.New("simulated error during update")
}

func TestVATransactionRollback(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open sqlite memory db: %v", err)
	}

	// Manually create tables to bypass SQLite limitations with gen_random_uuid()
	db.Exec(`CREATE TABLE virtual_accounts (
		id TEXT PRIMARY KEY,
		account_number TEXT,
		bank_code TEXT,
		bank_name TEXT,
		account_holder TEXT,
		current_balance NUMERIC,
		api_integration_enabled BOOLEAN,
		api_client_id TEXT,
		api_endpoint TEXT,
		is_active BOOLEAN,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME,
		created_by TEXT,
		updated_by TEXT,
		deleted_by TEXT
	)`)
	
	db.Exec(`CREATE TABLE va_transactions (
		id TEXT PRIMARY KEY,
		virtual_account_id TEXT,
		transaction_type TEXT,
		channel TEXT,
		amount NUMERIC,
		balance_after NUMERIC,
		reference_number TEXT,
		description TEXT,
		transaction_date DATETIME,
		verified_by_id TEXT,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME,
		created_by TEXT,
		updated_by TEXT,
		deleted_by TEXT
	)`)

	realRepo := NewRepository(db)
	repo := &mockFailingRepo{Repository: realRepo}
	svc := NewService(repo, nil)

	ctx := context.Background()
	userID := uuid.New()

	// Seed Virtual Account
	vaID := uuid.New()
	va := &models.VirtualAccount{
		AccountNumber:  "123456789",
		BankCode:       "TEST",
		CurrentBalance: 1000,
	}
	va.ID = vaID // set directly

	if err := db.Create(va).Error; err != nil {
		t.Fatalf("Failed to seed VA: %v", err)
	}

	req := &RecordVATransactionRequest{
		TransactionType: "TOP_UP",
		Amount:          500,
		ReferenceNumber: "REF123",
	}

	_, err = svc.RecordVATransaction(ctx, va.ID, req, userID)
	if err == nil {
		t.Fatal("Expected an error from RecordVATransaction due to simulated update failure")
	}

	// Verify VA balance did not change
	var checkVA models.VirtualAccount
	if err := db.First(&checkVA, va.ID).Error; err != nil {
		t.Fatalf("Failed to fetch VA: %v", err)
	}
	if checkVA.CurrentBalance != 1000 {
		t.Errorf("Expected balance to remain 1000, got %f", checkVA.CurrentBalance)
	}

	// Verify VATransaction was rolled back (no rows should exist)
	var count int64
	if err := db.Model(&models.VATransaction{}).Where("virtual_account_id = ?", va.ID).Count(&count).Error; err != nil {
		t.Fatalf("Failed to count VA transactions: %v", err)
	}
	if count != 0 {
		t.Errorf("Expected 0 VATransactions due to rollback, got %d", count)
	}
}
