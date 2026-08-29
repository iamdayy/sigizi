package inventory

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
	invGroup := router.Group("/inventory")
	invGroup.Use(authMW)
	{
		invGroup.GET("/items", h.ListItems)
		invGroup.POST("/items", middleware.RequireRole(models.RoleAdmin, models.RoleWarehouse), h.CreateItem)
		invGroup.GET("/items/:id", h.GetItem)
		invGroup.GET("/items/:id/batches", h.GetBatches)
		invGroup.POST("/batches", middleware.RequireRole(models.RoleAdmin, models.RoleWarehouse), h.CreateBatch)
		invGroup.POST("/stock-out", middleware.RequireRole(models.RoleAdmin, models.RoleWarehouse, models.RoleFinance), h.StockOut)
		invGroup.GET("/movements", h.ListMovements)
	}
}

func (h *Handler) ListItems(c *gin.Context) {
	items, err := h.service.ListItemsStock(c.Request.Context())
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to fetch items stock", err)
		return
	}
	pkg.Success(c, http.StatusOK, "Inventory stock retrieved", items)
}

func (h *Handler) CreateItem(c *gin.Context) {
	var req CreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid item request", err)
		return
	}

	userID, _ := c.Get("UserID")
	item, err := h.service.CreateItem(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "Item created successfully", item)
}

func (h *Handler) GetItem(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid item ID format", err)
		return
	}

	item, err := h.service.GetItem(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusNotFound, "Item not found", err)
		return
	}

	pkg.Success(c, http.StatusOK, "Item details retrieved", item)
}

func (h *Handler) GetBatches(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid item ID format", err)
		return
	}

	batches, err := h.service.GetBatches(c.Request.Context(), id)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to retrieve batches", err)
		return
	}

	pkg.Success(c, http.StatusOK, "Item batches retrieved", batches)
}

func (h *Handler) CreateBatch(c *gin.Context) {
	var req CreateBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid batch request", err)
		return
	}

	userID, _ := c.Get("UserID")
	batch, err := h.service.CreateBatch(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusCreated, "Stock batch received successfully", batch)
}

func (h *Handler) StockOut(c *gin.Context) {
	var req StockOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkg.Error(c, http.StatusBadRequest, "Invalid stock-out request", err)
		return
	}

	userID, _ := c.Get("UserID")
	result, err := h.service.StockOut(c.Request.Context(), &req, userID.(uuid.UUID))
	if err != nil {
		pkg.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	pkg.Success(c, http.StatusOK, "Stock depleted successfully via FEFO", result)
}

func (h *Handler) ListMovements(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	movements, err := h.service.ListMovements(c.Request.Context(), limit)
	if err != nil {
		pkg.Error(c, http.StatusInternalServerError, "Failed to list stock movements", err)
		return
	}

	pkg.Success(c, http.StatusOK, "Stock movements audit trail retrieved", movements)
}
