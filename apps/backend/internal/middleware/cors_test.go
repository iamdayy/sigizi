package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSWhitelist(t *testing.T) {
	gin.SetMode(gin.TestMode)

	allowedOrigins := []string{"https://app.sppg.kemang.id"}
	router := gin.New()
	router.Use(CORS(allowedOrigins))
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	tests := []struct {
		name           string
		origin         string
		expectedOrigin string
	}{
		{
			name:           "Allowed Origin",
			origin:         "https://app.sppg.kemang.id",
			expectedOrigin: "https://app.sppg.kemang.id",
		},
		{
			name:           "Disallowed Origin",
			origin:         "https://evil.com",
			expectedOrigin: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/test", nil)
			req.Header.Set("Origin", tt.origin)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			actualOrigin := w.Header().Get("Access-Control-Allow-Origin")
			if actualOrigin != tt.expectedOrigin {
				t.Errorf("Expected Access-Control-Allow-Origin to be %q, got %q", tt.expectedOrigin, actualOrigin)
			}
		})
	}
}

func TestCORSPreflight(t *testing.T) {
	gin.SetMode(gin.TestMode)

	allowedOrigins := []string{"https://app.sppg.kemang.id"}
	router := gin.New()
	router.Use(CORS(allowedOrigins))

	t.Run("Allowed Origin Options", func(t *testing.T) {
		req, _ := http.NewRequest("OPTIONS", "/", nil)
		req.Header.Set("Origin", "https://app.sppg.kemang.id")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusNoContent {
			t.Errorf("Expected 204 No Content, got %d", w.Code)
		}
	})

	t.Run("Disallowed Origin Options", func(t *testing.T) {
		req, _ := http.NewRequest("OPTIONS", "/", nil)
		req.Header.Set("Origin", "https://evil.com")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("Expected 403 Forbidden, got %d", w.Code)
		}
	})
}
