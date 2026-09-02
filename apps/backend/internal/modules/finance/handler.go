package finance

import (
	"net/http"
	"strconv"
	"time"

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
	finGroup := router.Group("/finance")
	finGroup.Use(authMW)
	{
		// Accounts
		finGroup.GET("/accounts", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.ListAccounts)
		finGroup.POST("/accounts", middleware.RequireRole(models.RoleAdmin, models.RoleFinance), h.CreateAccount)

		// Journal Entries
		finGroup.GET("/journal-entries", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.ListJournalEntries)
		finGroup.POST("/journal-entries", middleware.RequireRole(models.RoleAdmin, models.RoleFinance), h.CreateJournalEntry)

		// Production & Dynamic COGS
		finGroup.POST("/production", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleWarehouse), h.ProduceMealBatch)
		finGroup.GET("/production", h.ListProductionBatches)

		// Analytics & Reconciliation
		finGroup.GET("/dashboard", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.GetDashboardStats)
		finGroup.POST("/reconcile-daily", middleware.RequireRole(models.RoleAdmin, models.RoleFinance), h.TriggerDailyReconciliation)
	}
}

func (h *Handler) ListAccounts(c *gin.Context) {
	accounts, err := h.service.ListAccounts(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve accounts", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Chart of Accounts retrieved", accounts)
}

func (h *Handler) CreateAccount(c *gin.Context) {
	var req CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid account payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	account, err := h.service.CreateAccount(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "Account created successfully", account)
}

func (h *Handler) ListJournalEntries(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	entries, err := h.service.ListJournalEntries(c.Request.Context(), limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve journal entries", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Journal entries retrieved", entries)
}

func (h *Handler) CreateJournalEntry(c *gin.Context) {
	var req CreateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid journal entry payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	entry, err := h.service.CreateJournalEntry(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "Journal entry posted successfully", entry)
}

func (h *Handler) ProduceMealBatch(c *gin.Context) {
	var req MealProductionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid meal production payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	result, err := h.service.ProduceMealBatch(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	msg := "Meal batch produced and exact COGS calculated successfully"
	if result.IsMarginCritical {
		msg = "WARNING: Meal batch produced successfully, but gross margin is CRITICAL (< 10%)"
	}

	pkg.Success(c, http.StatusOK, msg, result)
}

func (h *Handler) ListProductionBatches(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	batches, err := h.service.ListProductionBatches(c.Request.Context(), limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve production batches", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Production batches retrieved", batches)
}

func (h *Handler) GetDashboardStats(c *gin.Context) {
	periodStart := c.Query("period_start")
	periodEnd := c.Query("period_end")

	stats, err := h.service.GetDashboardStats(c.Request.Context(), periodStart, periodEnd)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to compute financial stats", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Financial dashboard metrics retrieved", stats)
}

func (h *Handler) TriggerDailyReconciliation(c *gin.Context) {
	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	reconDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid date format. Expected YYYY-MM-DD", err)
		return
	}

	var triggeredBy *uuid.UUID
	if uid, exists := c.Get("UserID"); exists {
		u := uid.(uuid.UUID)
		triggeredBy = &u
	}

	report, err := h.service.PerformDailyReconciliation(c.Request.Context(), reconDate, triggeredBy)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Daily reconciliation failed", err)
		return
	}

	pkg.Success(c, http.StatusOK, "Daily reconciliation completed", report)
}
