package qc

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
	qcGroup := router.Group("/qc")
	qcGroup.Use(authMW)
	{
		// Dashboard Summary
		qcGroup.GET("/summary", h.GetDashboardSummary)

		// Hygiene Checklists
		qcGroup.GET("/hygiene-checklists", h.ListHygieneChecklists)
		qcGroup.POST("/hygiene-checklists", middleware.RequireRole(models.RoleAdmin, models.RoleQC, models.RoleHeadSPPG), h.CreateHygieneChecklist)
		qcGroup.GET("/hygiene-checklists/:id", h.GetHygieneChecklist)

		// Cold Chain Temperature Logs
		qcGroup.GET("/temperature-logs", h.ListTemperatureLogs)
		qcGroup.POST("/temperature-logs", middleware.RequireRole(models.RoleAdmin, models.RoleQC, models.RoleWarehouse, models.RoleHeadSPPG), h.CreateTemperatureLog)

		// Organoleptic Tests
		qcGroup.GET("/organoleptic-tests", h.ListOrganolepticTests)
		qcGroup.POST("/organoleptic-tests", middleware.RequireRole(models.RoleAdmin, models.RoleQC, models.RoleNutritionist, models.RoleHeadSPPG), h.CreateOrganolepticTest)
		qcGroup.GET("/organoleptic-tests/:id", h.GetOrganolepticTest)

		// Food Sample Retention
		qcGroup.GET("/food-samples", h.ListFoodSamples)
		qcGroup.POST("/food-samples", middleware.RequireRole(models.RoleAdmin, models.RoleQC, models.RoleNutritionist, models.RoleHeadSPPG), h.CreateFoodSample)
		qcGroup.PATCH("/food-samples/:id/dispose", middleware.RequireRole(models.RoleAdmin, models.RoleQC, models.RoleHeadSPPG), h.DisposeFoodSample)
	}
}

func (h *Handler) GetDashboardSummary(c *gin.Context) {
	periodStart := c.Query("period_start")
	periodEnd := c.Query("period_end")

	summary, err := h.service.GetDashboardSummary(c.Request.Context(), periodStart, periodEnd)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve QC summary", err)
		return
	}
	pkg.Success(c, http.StatusOK, "QC summary retrieved", summary)
}

func (h *Handler) ListHygieneChecklists(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	list, err := h.service.ListHygieneChecklists(c.Request.Context(), limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list hygiene checklists", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Hygiene checklists retrieved", list)
}

func (h *Handler) CreateHygieneChecklist(c *gin.Context) {
	var req CreateHygieneChecklistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	item, err := h.service.CreateHygieneChecklist(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "Hygiene checklist created", item)
}

func (h *Handler) GetHygieneChecklist(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid checklist ID", err)
		return
	}

	item, err := h.service.GetHygieneChecklist(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Hygiene checklist not found", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Hygiene checklist details", item)
}

func (h *Handler) ListTemperatureLogs(c *gin.Context) {
	area := c.Query("storage_area")
	isAlertOnly := c.Query("alert_only") == "true"
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	list, err := h.service.ListTemperatureLogs(c.Request.Context(), area, isAlertOnly, limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list temperature logs", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Temperature logs retrieved", list)
}

func (h *Handler) CreateTemperatureLog(c *gin.Context) {
	var req CreateTemperatureLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	var uid *uuid.UUID
	if val, exists := c.Get("UserID"); exists {
		u := val.(uuid.UUID)
		uid = &u
	}

	item, err := h.service.CreateTemperatureLog(c.Request.Context(), &req, uid)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "Temperature log recorded", item)
}

func (h *Handler) ListOrganolepticTests(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	list, err := h.service.ListOrganolepticTests(c.Request.Context(), limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list organoleptic tests", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Organoleptic tests retrieved", list)
}

func (h *Handler) CreateOrganolepticTest(c *gin.Context) {
	var req CreateOrganolepticTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	item, err := h.service.CreateOrganolepticTest(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "Organoleptic test recorded", item)
}

func (h *Handler) GetOrganolepticTest(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid test ID", err)
		return
	}

	item, err := h.service.GetOrganolepticTest(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Organoleptic test not found", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Organoleptic test details", item)
}

func (h *Handler) ListFoodSamples(c *gin.Context) {
	onlyActive := c.Query("active_only") != "false"
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	list, err := h.service.ListFoodSamples(c.Request.Context(), onlyActive, limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list food samples", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Food samples retrieved", list)
}

func (h *Handler) CreateFoodSample(c *gin.Context) {
	var req CreateFoodSampleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	item, err := h.service.CreateFoodSample(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "Food sample registered for retention", item)
}

func (h *Handler) DisposeFoodSample(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid food sample ID", err)
		return
	}

	var req DisposeFoodSampleRequest
	_ = c.ShouldBindJSON(&req)

	userID, _ := c.Get("UserID")
	item, err := h.service.DisposeFoodSample(c.Request.Context(), id, &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusOK, "Food sample disposal recorded", item)
}
