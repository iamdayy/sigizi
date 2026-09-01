package reporting

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func generateSignature(secret, body string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(body))
	return hex.EncodeToString(mac.Sum(nil))
}

func TestBankWebhookAuthAndIdempotency(t *testing.T) {
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open sqlite memory db: %v", err)
	}

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

	repo := NewRepository(db)
	svc := NewService(repo, nil)
	secret := "test-secret"
	handler := NewHandler(svc, secret)

	router := gin.New()
	handler.RegisterRoutes(router.Group("/api/v1"), func(c *gin.Context) { c.Next() })

	// Seed VA
	va := &models.VirtualAccount{
		AccountNumber:  "1234567890",
		BankCode:       "TEST",
		CurrentBalance: 0,
	}
	va.ID = uuid.New()
	db.Create(va)

	payload := BankTopUpWebhookPayload{
		AccountNumber:   "1234567890",
		Amount:          1000,
		ReferenceNumber: "REF-001",
		Description:     "Top up test",
	}
	bodyBytes, _ := json.Marshal(payload)
	bodyStr := string(bodyBytes)

	// Test 1: Invalid Signature
	t.Run("Invalid Signature", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/v1/webhooks/bank/topup", bytes.NewBufferString(bodyStr))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Signature", "wrong-signature")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		if w.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401 Unauthorized, got %d", w.Code)
		}
	})

	// Test 2: Valid Signature (First Time)
	t.Run("Valid Signature First Time", func(t *testing.T) {
		sig := generateSignature(secret, bodyStr)
		req, _ := http.NewRequest("POST", "/api/v1/webhooks/bank/topup", bytes.NewBufferString(bodyStr))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Signature", sig)
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 OK, got %d. Body: %s", w.Code, w.Body.String())
		}
		
		// Verify balance increased
		var checkVA models.VirtualAccount
		db.First(&checkVA, va.ID)
		if checkVA.CurrentBalance != 1000 {
			t.Errorf("Expected balance 1000, got %f", checkVA.CurrentBalance)
		}
	})

	// Test 3: Idempotency (Duplicate Reference)
	t.Run("Idempotency Duplicate Request", func(t *testing.T) {
		sig := generateSignature(secret, bodyStr)
		req, _ := http.NewRequest("POST", "/api/v1/webhooks/bank/topup", bytes.NewBufferString(bodyStr))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Signature", sig)
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		if w.Code != http.StatusOK {
			t.Errorf("Expected 200 OK for idempotent request, got %d. Body: %s", w.Code, w.Body.String())
		}
		
		// Verify balance did NOT increase again
		var checkVA models.VirtualAccount
		db.First(&checkVA, va.ID)
		if checkVA.CurrentBalance != 1000 {
			t.Errorf("Expected balance to remain 1000, got %f", checkVA.CurrentBalance)
		}
	})
}
