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
		// Schools
		distGroup.GET("/schools", h.ListSchools)
		distGroup.POST("/schools", middleware.RequireRole(models.RoleAdmin, models.RoleFinance), h.CreateSchool)
		distGroup.GET("/schools/:id", h.GetSchool)

		// Distributions
		distGroup.GET("/distributions", h.ListDistributions)
		distGroup.POST("/distributions", middleware.RequireRole(models.RoleAdmin, models.RoleWarehouse, models.RoleFinance), h.CreateDistribution)
		distGroup.PATCH("/distributions/:id/status", middleware.RequireRole(models.RoleAdmin, models.RoleWarehouse), h.UpdateDistributionStatus)

		// BAST Generator
		distGroup.GET("/bast/preview", h.PreviewBAST)
		distGroup.POST("/bast/generate", middleware.RequireRole(models.RoleAdmin, models.RoleFinance), h.GenerateBAST)
		distGroup.GET("/bast/documents", h.ListBASTDocuments)
	}
}

func (h *Handler) ListSchools(c *gin.Context) {
	schools, err := h.service.ListSchools(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve schools", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Schools retrieved", schools)
}

func (h *Handler) CreateSchool(c *gin.Context) {
	var req CreateSchoolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid school request", err)
		return
	}

	userID, _ := c.Get("UserID")
	school, err := h.service.CreateSchool(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "School registered successfully", school)
}

func (h *Handler) GetSchool(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid school ID", err)
		return
	}

	school, err := h.service.GetSchool(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "School not found", err)
		return
	}

	pkg.Success(c, http.StatusOK, "School details retrieved", school)
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
	schoolIDStr := c.Query("school_id")
	periodStart := c.Query("period_start")
	periodEnd := c.Query("period_end")

	if schoolIDStr == "" || periodStart == "" || periodEnd == "" {
		pkg.Error(c, http.StatusBadRequest, "school_id, period_start, and period_end are required", nil)
		return
	}

	schoolID, err := uuid.Parse(schoolIDStr)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid school_id format", err)
		return
	}

	preview, err := h.service.PreviewBAST(c.Request.Context(), schoolID, periodStart, periodEnd)
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
