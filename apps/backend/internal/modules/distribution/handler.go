package distribution

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
	distGroup := router.Group("")
	distGroup.Use(authMW)
	{
		// Distribution Points
		distGroup.GET("/distribution-points", h.ListDistributionPoints)
		distGroup.POST("/distribution-points", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.CreateDistributionPoint)
		distGroup.GET("/distribution-points/:id", h.GetDistributionPoint)
		distGroup.PUT("/distribution-points/:id", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.UpdateDistributionPoint)

		// Legacy aliases for backward compatibility
		distGroup.GET("/schools", h.ListDistributionPoints)
		distGroup.POST("/schools", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.CreateDistributionPoint)
		distGroup.GET("/schools/:id", h.GetDistributionPoint)

		// Distributions
		distGroup.GET("/distributions", h.ListDistributions)
		distGroup.POST("/distributions", middleware.RequireRole(models.RoleAdmin, models.RoleWarehouse, models.RoleFinance, models.RoleHeadSPPG), h.CreateDistribution)
		distGroup.GET("/distributions/:id", h.GetDistribution)
		distGroup.PATCH("/distributions/:id/status", middleware.RequireRole(models.RoleAdmin, models.RoleWarehouse, models.RoleDriver, models.RoleHeadSPPG), h.UpdateDistributionStatus)

		// BAST Generator
		distGroup.GET("/bast/preview", h.PreviewBAST)
		distGroup.POST("/bast/generate", middleware.RequireRole(models.RoleAdmin, models.RoleFinance, models.RoleHeadSPPG), h.GenerateBAST)
		distGroup.GET("/bast/documents", h.ListBASTDocuments)

		// Tracking
		distGroup.POST("/distributions/:id/location", middleware.RequireRole(models.RoleAdmin, models.RoleDriver), h.RecordDriverLocation)
	}
}

func (h *Handler) ListDistributionPoints(c *gin.Context) {
	dpType := c.Query("type")
	points, err := h.service.ListDistributionPoints(c.Request.Context(), dpType)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve distribution points", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Distribution points retrieved", points)
}

func (h *Handler) CreateDistributionPoint(c *gin.Context) {
	var req CreateDistributionPointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution point request", err)
		return
	}

	userID, _ := c.Get("UserID")
	dp, err := h.service.CreateDistributionPoint(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "Distribution point registered successfully", dp)
}

func (h *Handler) GetDistributionPoint(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution point ID", err)
		return
	}

	dp, err := h.service.GetDistributionPoint(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Distribution point not found", err)
		return
	}

	pkg.Success(c, http.StatusOK, "Distribution point details retrieved", dp)
}

func (h *Handler) UpdateDistributionPoint(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution point ID", err)
		return
	}

	var req UpdateDistributionPointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid update request", err)
		return
	}

	userID, _ := c.Get("UserID")
	dp, err := h.service.UpdateDistributionPoint(c.Request.Context(), id, &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusOK, "Distribution point updated successfully", dp)
}

func (h *Handler) ListDistributions(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	dists, err := h.service.ListDistributions(c.Request.Context(), limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve distributions", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Distributions retrieved", dists)
}

func (h *Handler) GetDistribution(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution ID", err)
		return
	}

	dist, err := h.service.GetDistribution(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Distribution not found", err)
		return
	}

	pkg.Success(c, http.StatusOK, "Distribution details retrieved", dist)
}

func (h *Handler) CreateDistribution(c *gin.Context) {
	var req CreateDistributionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	dist, err := h.service.CreateDistribution(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "Delivery scheduled successfully", dist)
}

func (h *Handler) UpdateDistributionStatus(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution ID", err)
		return
	}

	var req UpdateDistributionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid update payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	dist, err := h.service.UpdateDistributionStatus(c.Request.Context(), id, &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusOK, "Distribution status updated", dist)
}

func (h *Handler) PreviewBAST(c *gin.Context) {
	dpIDStr := c.Query("distribution_point_id")
	if dpIDStr == "" {
		dpIDStr = c.Query("school_id") // legacy fallback
	}
	periodStart := c.Query("period_start")
	periodEnd := c.Query("period_end")

	if dpIDStr == "" || periodStart == "" || periodEnd == "" {
		pkg.Error(c, http.StatusBadRequest, "distribution_point_id, period_start, and period_end are required", nil)
		return
	}

	dpID, err := uuid.Parse(dpIDStr)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution_point_id format", err)
		return
	}

	preview, err := h.service.PreviewBAST(c.Request.Context(), dpID, periodStart, periodEnd)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusOK, "BAST preview data generated", preview)
}

func (h *Handler) GenerateBAST(c *gin.Context) {
	var req BASTGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid BAST generation payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	doc, err := h.service.GenerateBAST(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "BAST PDF generated and stored successfully", doc)
}

func (h *Handler) ListBASTDocuments(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	docs, err := h.service.ListBASTDocuments(c.Request.Context(), limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list BAST documents", err)
		return
	}

	pkg.Success(c, http.StatusOK, "BAST documents archive retrieved", docs)
}

func (h *Handler) RecordDriverLocation(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid distribution ID", err)
		return
	}

	var req DriverLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid location payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	if err := h.service.RecordDriverLocation(c.Request.Context(), id, &req, userID.(uuid.UUID)); err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusOK, "Driver location recorded successfully", nil)
}
