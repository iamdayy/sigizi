package iam

import (
	"net/http"

	"github.com/daydev/mbg-system/backend/internal/middleware"
	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/daydev/mbg-system/backend/internal/pkg"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(router *gin.RouterGroup, authMW gin.HandlerFunc) {
	authGroup := router.Group("/auth")
	{
		authGroup.POST("/login", h.Login)
		authGroup.POST("/refresh", h.RefreshToken)
		authGroup.POST("/logout", h.Logout)
	}

	// Protected routes
	protected := router.Group("")
	protected.Use(authMW)
	{
		protected.GET("/auth/me", h.GetProfile)
		protected.GET("/navigation", h.GetNavigation)

		// Admin only
		adminOnly := protected.Group("/users")
		adminOnly.Use(middleware.RequireRole(models.RoleAdmin))
		{
			adminOnly.GET("", h.ListUsers)
			adminOnly.POST("", h.CreateUser)
		}
	}
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	resp, err := h.service.Login(c.Request.Context(), &req)
	if err != nil {
		pkg.Error(c, http.StatusUnauthorized, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusOK, "Login successful", resp)
}

func (h *Handler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	resp, err := h.service.RefreshToken(c.Request.Context(), &req)
	if err != nil {
		pkg.Error(c, http.StatusUnauthorized, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusOK, "Token refreshed successfully", resp)
}

func (h *Handler) Logout(c *gin.Context) {
	var req RefreshTokenRequest
	_ = c.ShouldBindJSON(&req)

	_ = h.service.Logout(c.Request.Context(), req.RefreshToken)
	pkg.Success(c, http.StatusOK, "Logged out successfully", nil)
}

func (h *Handler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("UserID")
	if !exists {
		pkg.Error(c, http.StatusUnauthorized, "User context not found", nil)
		return
	}

	user, err := h.service.GetProfile(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "User not found", err)
		return
	}

	pkg.Success(c, http.StatusOK, "User profile retrieved", user)
}

func (h *Handler) GetNavigation(c *gin.Context) {
	roleVal, exists := c.Get("UserRole")
	if !exists {
		pkg.Error(c, http.StatusUnauthorized, "Role not found in context", nil)
		return
	}

	navItems := h.service.GetNavigation(c.Request.Context(), roleVal.(models.UserRole))
	pkg.Success(c, http.StatusOK, "Navigation tree retrieved", navItems)
}

func (h *Handler) ListUsers(c *gin.Context) {
	users, err := h.service.ListUsers(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list users", err)
		return
	}

	pkg.Success(c, http.StatusOK, "Users retrieved", users)
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid user payload", err)
		return
	}

	creatorID, _ := c.Get("UserID")
	user, err := h.service.CreateUser(c.Request.Context(), &req, creatorID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "User created successfully", user)
}
