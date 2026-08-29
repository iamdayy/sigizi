package qc

import (
	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

// --- Hygiene DTOs ---

type CreateHygieneChecklistRequest struct {
	InspectionDate     string               `json:"inspection_date" binding:"required"` // YYYY-MM-DD
	OverallStatus      models.HygieneStatus `json:"overall_status"`
	BuildingSanitation bool                 `json:"building_sanitation"`
	WaterQuality       bool                 `json:"water_quality"`
	WasteManagement    bool                 `json:"waste_management"`
	PestControl        bool                 `json:"pest_control"`
	PersonalHygiene    bool                 `json:"personal_hygiene"`
	FoodStorageCheck   bool                 `json:"food_storage_check"`
	EquipmentClean     bool                 `json:"equipment_clean"`
	Notes              string               `json:"notes"`
	CorrectionDeadline string               `json:"correction_deadline"` // YYYY-MM-DD
}

// --- Temperature Log DTOs ---

type CreateTemperatureLogRequest struct {
	StorageArea     string                `json:"storage_area" binding:"required"`
	Source          *models.TempLogSource `json:"source"`
	DeviceID        string                `json:"device_id"`
	TemperatureCel  float64               `json:"temperature_cel" binding:"required"`
	HumidityPercent *float64              `json:"humidity_percent"`
	AlertThreshold  *float64              `json:"alert_threshold"`
	Notes           string                `json:"notes"`
}

// --- Organoleptic Test DTOs ---

type CreateOrganolepticTestRequest struct {
	TestDate          string                      `json:"test_date" binding:"required"` // YYYY-MM-DD
	TestType          models.OrganolepticTestType `json:"test_type" binding:"required"`
	ProductionBatchID *uuid.UUID                  `json:"production_batch_id"`
	MealName          string                      `json:"meal_name" binding:"required"`
	AppearanceScore   int                         `json:"appearance_score" binding:"required,min=1,max=5"`
	AromaScore        int                         `json:"aroma_score" binding:"required,min=1,max=5"`
	TasteScore        int                         `json:"taste_score" binding:"required,min=1,max=5"`
	TextureScore      int                         `json:"texture_score" binding:"required,min=1,max=5"`
	Notes             string                      `json:"notes"`
	PhotoURL          string                      `json:"photo_url"`
}

// --- Food Sample Retention DTOs ---

type CreateFoodSampleRequest struct {
	SampleDate        string     `json:"sample_date" binding:"required"` // YYYY-MM-DD
	MealName          string     `json:"meal_name" binding:"required"`
	ProductionBatchID *uuid.UUID `json:"production_batch_id"`
	StorageLocation   string     `json:"storage_location" binding:"required"`
	Notes             string     `json:"notes"`
}

type DisposeFoodSampleRequest struct {
	Notes string `json:"notes"`
}

// --- Dashboard Summary DTO ---

type QCDashboardSummary struct {
	TotalInspectionsThisMonth int                        `json:"total_inspections_this_month"`
	ActiveTempAlertsCount     int                        `json:"active_temp_alerts_count"`
	AverageOrganolepticScore  float64                    `json:"average_organoleptic_score"`
	ActiveRetainedSamples     int                        `json:"active_retained_samples"`
	RecentTempLogs            []models.TemperatureLog    `json:"recent_temp_logs"`
	RecentOrganolepticTests   []models.OrganolepticTest  `json:"recent_organoleptic_tests"`
	PendingDisposalSamples    []models.FoodSample        `json:"pending_disposal_samples"`
}
