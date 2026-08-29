package pkg

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	TraceID string      `json:"trace_id,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type PaginatedData struct {
	Items      interface{} `json:"items"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

func getTraceID(c *gin.Context) string {
	if traceID, exists := c.Get("TraceID"); exists {
		if tidStr, ok := traceID.(string); ok {
			return tidStr
		}
	}
	return ""
}

func Success(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
		TraceID: getTraceID(c),
	})
}

func SuccessPaginated(c *gin.Context, message string, items interface{}, total int64, page int, limit int) {
	totalPages := int(total) / limit
	if int(total)%limit != 0 || totalPages == 0 {
		totalPages++
	}
	if total == 0 {
		totalPages = 0
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Message: message,
		Data: PaginatedData{
			Items:      items,
			Total:      total,
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
		},
		TraceID: getTraceID(c),
	})
}

func Error(c *gin.Context, statusCode int, message string, err error) {
	errStr := ""
	if err != nil {
		errStr = err.Error()
	}
	c.JSON(statusCode, APIResponse{
		Success: false,
		Message: message,
		Error:   errStr,
		TraceID: getTraceID(c),
	})
}
