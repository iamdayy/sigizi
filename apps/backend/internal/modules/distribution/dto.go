package distribution

import (
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type CreateDistributionPointRequest struct {
	NPSN            string                       `json:"npsn"`
	Name            string                       `json:"name" binding:"required"`
	Type            models.DistributionPointType `json:"type" binding:"required"`
	EducationLevel  *models.EducationLevel       `json:"education_level"`
	Address         string                       `json:"address" binding:"required"`
	District        string                       `json:"district" binding:"required"`
	City            string                       `json:"city" binding:"required"`
	ContactPerson   string                       `json:"contact_person" binding:"required"`
	PhoneNumber     string                       `json:"phone_number" binding:"required"`
	TotalRecipients int                          `json:"total_recipients" binding:"required,gt=0"`
	DietaryNotes    string                       `json:"dietary_notes"`
	Latitude        *float64                     `json:"latitude"`
	Longitude       *float64                     `json:"longitude"`
}

type UpdateDistributionPointRequest struct {
	Name            string                       `json:"name"`
	Type            models.DistributionPointType `json:"type"`
	EducationLevel  *models.EducationLevel       `json:"education_level"`
	Address         string                       `json:"address"`
	District        string                       `json:"district"`
	City            string                       `json:"city"`
	ContactPerson   string                       `json:"contact_person"`
	PhoneNumber     string                       `json:"phone_number"`
	TotalRecipients int                          `json:"total_recipients"`
	DietaryNotes    string                       `json:"dietary_notes"`
	Latitude        *float64                     `json:"latitude"`
	Longitude       *float64                     `json:"longitude"`
	IsActive        *bool                        `json:"is_active"`
}

type CreateDistributionItemRequest struct {
	MenuItemID   *uuid.UUID `json:"menu_item_id"`
	MealName     string     `json:"meal_name" binding:"required"`
	PortionsSent int        `json:"portions_sent" binding:"required,gt=0"`
	UnitPrice    float64    `json:"unit_price"`
}

type CreateDistributionRequest struct {
	DistributionPointID uuid.UUID                       `json:"distribution_point_id" binding:"required"`
	DeliveryDate        string                          `json:"delivery_date" binding:"required"` // YYYY-MM-DD
	PackageType         models.PackageType              `json:"package_type"`                     // FOOD_TRAY | TOTEBAG
	IsHolidayDelivery   bool                            `json:"is_holiday_delivery"`
	DriverName          string                          `json:"driver_name" binding:"required"`
	VehiclePlate        string                          `json:"vehicle_plate" binding:"required"`
	Items               []CreateDistributionItemRequest `json:"items" binding:"required,min=1"`
	Notes               string                          `json:"notes"`
}

type ItemReceivedInput struct {
	ItemID           uuid.UUID `json:"item_id" binding:"required"`
	PortionsReceived int       `json:"portions_received" binding:"required,min=0"`
}

type UpdateDistributionStatusRequest struct {
	Status             models.DistributionStatus `json:"status" binding:"required"`
	RecipientName      string                    `json:"recipient_name"`
	RecipientTitle     string                    `json:"recipient_title"`
	ProofOfDeliveryURL string                    `json:"proof_of_delivery_url"`
	Items              []ItemReceivedInput       `json:"items"`
	Notes              string                    `json:"notes"`
}

type BASTGenerateRequest struct {
	DistributionPointID         uuid.UUID `json:"distribution_point_id" binding:"required"`
	PeriodStart                 string    `json:"period_start" binding:"required"` // YYYY-MM-DD
	PeriodEnd                   string    `json:"period_end" binding:"required"`   // YYYY-MM-DD
	SPPGHeadName                string    `json:"sppg_head_name"`
	RecipientRepresentativeName string    `json:"recipient_representative_name"`
	OfficialNotes               string    `json:"official_notes"`
}

type BASTPreviewData struct {
	DistributionPoint *models.DistributionPoint `json:"distribution_point"`
	PeriodStart       string                    `json:"period_start"`
	PeriodEnd         string                    `json:"period_end"`
	TotalDeliveries   int                       `json:"total_deliveries"`
	TotalPortions     int                       `json:"total_portions"`
	TotalAmount       float64                   `json:"total_amount"`
	Deliveries        []models.Distribution     `json:"deliveries"`
}

type BASTDocumentResponse struct {
	ID                          uuid.UUID         `json:"id"`
	DocumentNumber              string            `json:"document_number"`
	DistributionPointID         uuid.UUID         `json:"distribution_point_id"`
	DistributionPointName       string            `json:"distribution_point_name"`
	PeriodStart                 string            `json:"period_start"`
	PeriodEnd                   string            `json:"period_end"`
	TotalPortions               int               `json:"total_portions"`
	TotalAmount                 float64           `json:"total_amount"`
	FileURL                     string            `json:"file_url"`
	FileSizeBytes               int64             `json:"file_size_bytes"`
	GeneratedAt                 time.Time         `json:"generated_at"`
	SPPGHeadName                string            `json:"sppg_head_name"`
	RecipientRepresentativeName string            `json:"recipient_representative_name"`
	Status                      models.BASTStatus `json:"status"`
}

type DriverLocationRequest struct {
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
}
