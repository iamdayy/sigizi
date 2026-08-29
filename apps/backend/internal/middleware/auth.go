package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/daydev/mbg-system/backend/internal/config"
	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/daydev/mbg-system/backend/internal/pkg"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	UserID   uuid.UUID       `json:"user_id"`
	Email    string          `json:"email"`
	Role     models.UserRole `json:"role"`
	FullName string          `json:"full_name"`
	jwt.RegisteredClaims
}

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			pkg.Error(c, http.StatusUnauthorized, "Authorization header missing", nil)
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			pkg.Error(c, http.StatusUnauthorized, "Invalid authorization format. Expected 'Bearer <token>'", nil)
			c.Abort()
			return
		}

		tokenStr := parts[1]
		claims := &JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(cfg.JWTAccessSecret), nil
		})

		if err != nil || !token.Valid {
			pkg.Error(c, http.StatusUnauthorized, "Invalid or expired access token", err)
			c.Abort()
			return
		}

		// Inject user context into Gin
		c.Set("UserID", claims.UserID)
		c.Set("UserEmail", claims.Email)
		c.Set("UserRole", claims.Role)
		c.Set("UserFullName", claims.FullName)

		c.Next()
	}
}

func RequireRole(allowedRoles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("UserRole")
		if !exists {
			pkg.Error(c, http.StatusUnauthorized, "Unauthorized context", nil)
			c.Abort()
			return
		}

		userRole, ok := roleVal.(models.UserRole)
		if !ok {
			pkg.Error(c, http.StatusUnauthorized, "Invalid role context", nil)
			c.Abort()
			return
		}

		for _, allowed := range allowedRoles {
			if userRole == allowed {
				c.Next()
				return
			}
		}

		pkg.Error(c, http.StatusForbidden, fmt.Sprintf("Forbidden: role '%s' does not have permission for this resource", userRole), nil)
		c.Abort()
	}
}
