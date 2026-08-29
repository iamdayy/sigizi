package reporting

import (
	"net/http"
	"strconv"

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
	// Public Webhook from Partner Banks (SIPGN, BRI, Mandiri)
	router.POST("/webhooks/bank/topup", h.HandleBankWebhook)

	// Protected routes
	protected := router.Group("")
	protected.Use(authMW)
	{
		// Virtual Accounts
		protected.GET("/finance/virtual-accounts", h.ListVirtualAccounts)
		protected.POST("/finance/virtual-accounts", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.CreateVirtualAccount)
		protected.GET("/finance/virtual-accounts/:id", h.GetVirtualAccount)
		protected.GET("/finance/virtual-accounts/:id/transactions", h.ListVATransactions)
		protected.POST("/finance/virtual-accounts/:id/transactions", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.RecordVATransaction)

		// Periodic Reports
		protected.GET("/reports", h.ListReports)
		protected.POST("/reports/generate", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.GenerateReport)
		protected.GET("/reports/:id", h.GetReport)
	}
}

func (h *Handler) ListVirtualAccounts(c *gin.Context) {
	list, err := h.service.ListVirtualAccounts(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list virtual accounts", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Virtual accounts retrieved", list)
}

func (h *Handler) CreateVirtualAccount(c *gin.Context) {
	var req CreateVirtualAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	va, err := h.service.CreateVirtualAccount(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "Virtual account registered", va)
}

func (h *Handler) GetVirtualAccount(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid virtual account ID", err)
		return
	}

	va, err := h.service.GetVirtualAccount(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Virtual account not found", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Virtual account details", va)
}

func (h *Handler) ListVATransactions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid virtual account ID", err)
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	txs, err := h.service.ListVATransactions(c.Request.Context(), id, limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list VA transactions", err)
		return
	}
	pkg.Success(c, http.StatusOK, "VA transactions retrieved", txs)
}

func (h *Handler) RecordVATransaction(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid virtual account ID", err)
		return
	}

	var req RecordVATransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	tx, err := h.service.RecordVATransaction(c.Request.Context(), id, &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "VA transaction recorded", tx)
}

func (h *Handler) HandleBankWebhook(c *gin.Context) {
	var payload BankTopUpWebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid bank webhook payload", err)
		return
	}

	tx, err := h.service.ProcessBankWebhook(c.Request.Context(), &payload)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusOK, "Bank top-up processed successfully", tx)
}

func (h *Handler) ListReports(c *gin.Context) {
	repType := c.Query("type")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	list, err := h.service.ListReports(c.Request.Context(), repType, limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list reports", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Generated reports retrieved", list)
}

func (h *Handler) GenerateReport(c *gin.Context) {
	var req GenerateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	rep, err := h.service.GenerateReport(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "Report generated and archived successfully", rep)
}

func (h *Handler) GetReport(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid report ID", err)
		return
	}

	rep, err := h.service.GetReport(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Report not found", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Report details", rep)
}
