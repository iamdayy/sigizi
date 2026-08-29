package distribution

import (
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type CreateSchoolRequest struct {
	NPSN          string `json:"npsn" binding:"required"`
	Name          string `json:"name" binding:"required"`
	Address       string `json:"address" binding:"required"`
	District      string `json:"district" binding:"required"`
	City          string `json:"city" binding:"required"`
	ContactPerson string `json:"contact_person" binding:"required"`
	PhoneNumber   string `json:"phone_number" binding:"required"`
	TotalStudents int    `json:"total_students" binding:"required,gt=0"`
	DietaryNotes  string `json:"dietary_notes"`
}

type CreateDistributionItemRequest struct {
	MealName     string  `json:"meal_name" binding:"required"`
	PortionsSent int     `json:"portions_sent" binding:"required,gt=0"`
	UnitPrice    float64 `json:"unit_price"`
}

type CreateDistributionRequest struct {
	SchoolID     uuid.UUID                       `json:"school_id" binding:"required"`
	DeliveryDate string                          `json:"delivery_date" binding:"required"` // YYYY-MM-DD
	DriverName   string                          `json:"driver_name" binding:"required"`
	VehiclePlate string                          `json:"vehicle_plate" binding:"required"`
	Items        []CreateDistributionItemRequest `json:"items" binding:"required,min=1"`
	Notes        string                          `json:"notes"`
}

type UpdateDistributionStatusRequest struct {
	Status             models.DistributionStatus `json:"status" binding:"required"`
	RecipientName      string                    `json:"recipient_name"`
	RecipientTitle     string                    `json:"recipient_title"`
	ProofOfDeliveryURL string                    `json:"proof_of_delivery_url"`
	PortionsReceived   int                       `json:"portions_received"`
	Notes              string                    `json:"notes"`
}

type BASTGenerateRequest struct {
	SchoolID            uuid.UUID `json:"school_id" binding:"required"`
	PeriodStart         string    `json:"period_start" binding:"required"` // YYYY-MM-DD
	PeriodEnd           string    `json:"period_end" binding:"required"`   // YYYY-MM-DD
	SPPGHeadName        string    `json:"sppg_head_name"`
	SchoolPrincipalName string    `json:"school_principal_name"`
	OfficialNotes       string    `json:"official_notes"`
}

type BASTPreviewData struct {
	School          *models.School        `json:"school"`
	PeriodStart     string                `json:"period_start"`
	PeriodEnd       string                `json:"period_end"`
	TotalDeliveries int                   `json:"total_deliveries"`
	TotalPortions   int                   `json:"total_portions"`
	TotalAmount     float64               `json:"total_amount"`
	Deliveries      []models.Distribution `json:"deliveries"`
}

type BASTDocumentResponse struct {
	ID                  uuid.UUID         `json:"id"`
	DocumentNumber      string            `json:"document_number"`
	SchoolID            uuid.UUID         `json:"school_id"`
	SchoolName          string            `json:"school_name"`
	PeriodStart         string            `json:"period_start"`
	PeriodEnd           string            `json:"period_end"`
	TotalPortions       int               `json:"total_portions"`
	TotalAmount         float64           `json:"total_amount"`
	FileURL             string            `json:"file_url"`
	FileSizeBytes       int64             `json:"file_size_bytes"`
	GeneratedAt         time.Time         `json:"generated_at"`
	SPPGHeadName        string            `json:"sppg_head_name"`
	SchoolPrincipalName string            `json:"school_principal_name"`
	Status              models.BASTStatus `json:"status"`
}
