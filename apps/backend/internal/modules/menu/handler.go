package menu

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
	menuGroup := router.Group("/menu")
	menuGroup.Use(authMW)
	{
		// Nutrition Info
		menuGroup.GET("/nutrition-info", h.ListNutritionInfo)
		menuGroup.POST("/nutrition-info", middleware.RequireRole(models.RoleAdmin, models.RoleNutritionist, models.RoleHeadSPPG), h.UpsertNutritionInfo)

		// Menu Cycles
		menuGroup.GET("/cycles", h.ListMenuCycles)
		menuGroup.POST("/cycles", middleware.RequireRole(models.RoleAdmin, models.RoleNutritionist, models.RoleHeadSPPG), h.CreateMenuCycle)
		menuGroup.GET("/cycles/active", h.GetActiveMenuCycle)
		menuGroup.GET("/cycles/:id", h.GetMenuCycle)
		menuGroup.POST("/cycles/:id/items", middleware.RequireRole(models.RoleAdmin, models.RoleNutritionist, models.RoleHeadSPPG), h.UpsertMenuItem)
		menuGroup.GET("/cycles/:id/summary", h.GetCycleNutritionSummary)
		menuGroup.POST("/cycles/:id/approve", middleware.RequireRole(models.RoleAdmin, models.RoleNutritionist, models.RoleHeadSPPG), h.ApproveMenuCycle)
		menuGroup.POST("/cycles/:id/activate", middleware.RequireRole(models.RoleAdmin, models.RoleHeadSPPG), h.SetActiveMenuCycle)
	}
}

func (h *Handler) ListNutritionInfo(c *gin.Context) {
	list, err := h.service.ListNutritionInfo(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list nutrition info", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Nutrition info list retrieved", list)
}

func (h *Handler) UpsertNutritionInfo(c *gin.Context) {
	var req UpsertNutritionInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	info, err := h.service.UpsertNutritionInfo(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusOK, "Nutrition info saved successfully", info)
}

func (h *Handler) ListMenuCycles(c *gin.Context) {
	list, err := h.service.ListMenuCycles(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list menu cycles", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Menu cycles retrieved", list)
}

func (h *Handler) CreateMenuCycle(c *gin.Context) {
	var req CreateMenuCycleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	cycle, err := h.service.CreateMenuCycle(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusCreated, "Menu cycle created successfully", cycle)
}

func (h *Handler) GetActiveMenuCycle(c *gin.Context) {
	cycle, err := h.service.GetActiveMenuCycle(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "No active menu cycle found", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Active menu cycle retrieved", cycle)
}

func (h *Handler) GetMenuCycle(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid cycle ID", err)
		return
	}

	cycle, err := h.service.GetMenuCycle(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Menu cycle not found", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Menu cycle retrieved", cycle)
}

func (h *Handler) UpsertMenuItem(c *gin.Context) {
	cycleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid cycle ID", err)
		return
	}

	var req UpsertMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	userID, _ := c.Get("UserID")
	item, err := h.service.UpsertMenuItem(c.Request.Context(), cycleID, &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusOK, "Menu item saved with AKG calculated", item)
}

func (h *Handler) GetCycleNutritionSummary(c *gin.Context) {
	cycleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid cycle ID", err)
		return
	}

	summary, err := h.service.GetCycleNutritionSummary(c.Request.Context(), cycleID)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusOK, "Cycle nutrition AKG summary retrieved", summary)
}

func (h *Handler) ApproveMenuCycle(c *gin.Context) {
	cycleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid cycle ID", err)
		return
	}

	var req ApproveMenuCycleRequest
	_ = c.ShouldBindJSON(&req)

	userID, _ := c.Get("UserID")
	cycle, err := h.service.ApproveMenuCycle(c.Request.Context(), cycleID, &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusOK, "Menu cycle approved by Nutritionist", cycle)
}

func (h *Handler) SetActiveMenuCycle(c *gin.Context) {
	cycleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid cycle ID", err)
		return
	}

	if err := h.service.SetActiveMenuCycle(c.Request.Context(), cycleID); err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}
	pkg.Success(c, http.StatusOK, "Active menu cycle updated", nil)
}
