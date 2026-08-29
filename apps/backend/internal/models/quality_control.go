package models

import (
	"time"

	"github.com/google/uuid"
)

// --- Hygiene & Sanitation Checklist (SLHS / HACCP) ---

type HygieneStatus string

const (
	HygienePass    HygieneStatus = "PASS"
	HygieneFail    HygieneStatus = "FAIL"
	HygienePartial HygieneStatus = "PARTIAL"
)

type HygieneChecklist struct {
	AuditModel
	InspectionDate     time.Time     `gorm:"type:date;not null;index" json:"inspection_date"`
	InspectorID        uuid.UUID     `gorm:"type:uuid;not null;index" json:"inspector_id"`
	Inspector          *User         `gorm:"foreignKey:InspectorID" json:"inspector,omitempty"`
	OverallStatus      HygieneStatus `gorm:"type:varchar(16);not null;default:'PASS'" json:"overall_status"`
	BuildingSanitation bool          `gorm:"type:boolean;not null;default:true" json:"building_sanitation"`
	WaterQuality       bool          `gorm:"type:boolean;not null;default:true" json:"water_quality"`
	WasteManagement    bool          `gorm:"type:boolean;not null;default:true" json:"waste_management"`
	PestControl        bool          `gorm:"type:boolean;not null;default:true" json:"pest_control"`
	PersonalHygiene    bool          `gorm:"type:boolean;not null;default:true" json:"personal_hygiene"`
	FoodStorageCheck   bool          `gorm:"type:boolean;not null;default:true" json:"food_storage_check"`
	EquipmentClean     bool          `gorm:"type:boolean;not null;default:true" json:"equipment_clean"`
	Notes              string        `gorm:"type:text" json:"notes,omitempty"`
	CorrectionDeadline *time.Time    `gorm:"type:date" json:"correction_deadline,omitempty"`
}

// --- Cold Chain Temperature Log (IoT-ready) ---

type TempLogSource string

const (
	TempSourceManual TempLogSource = "MANUAL"
	TempSourceIoT    TempLogSource = "IOT_SENSOR"
)

type TemperatureLog struct {
	AuditModel
	StorageArea     string        `gorm:"type:varchar(100);not null;index" json:"storage_area"` // e.g. "Chiller Susu Pasteur", "Freezer Daging"
	Source          TempLogSource `gorm:"type:varchar(32);not null;default:'MANUAL'" json:"source"`
	DeviceID        string        `gorm:"type:varchar(64)" json:"device_id,omitempty"` // For future IoT sensor identifier
	RecordedAt      time.Time     `gorm:"type:timestamptz;not null;index" json:"recorded_at"`
	TemperatureCel  float64       `gorm:"type:numeric(5,2);not null" json:"temperature_cel"`
	HumidityPercent *float64      `gorm:"type:numeric(5,2)" json:"humidity_percent,omitempty"`
	RecordedByID    *uuid.UUID    `gorm:"type:uuid" json:"recorded_by_id,omitempty"`
	RecordedBy      *User         `gorm:"foreignKey:RecordedByID" json:"recorded_by,omitempty"`
	IsAlert         bool          `gorm:"type:boolean;not null;default:false;index" json:"is_alert"`
	AlertThreshold  float64       `gorm:"type:numeric(5,2);not null;default:4.0" json:"alert_threshold"`
	Notes           string        `gorm:"type:text" json:"notes,omitempty"`
}

// --- Organoleptic Test ---

type OrganolepticTestType string

const (
	OrgTestHandover   OrganolepticTestType = "HANDOVER"    // Uji saat serah terima bahan baku dari vendor
	OrgTestPreServing OrganolepticTestType = "PRE_SERVING" // Uji sebelum makanan disajikan / dikirim ke sekolah
)

type OrganolepticTest struct {
	AuditModel
	TestDate          time.Time            `gorm:"type:date;not null;index" json:"test_date"`
	TestType          OrganolepticTestType `gorm:"type:varchar(32);not null;index" json:"test_type"`
	ProductionBatchID *uuid.UUID           `gorm:"type:uuid" json:"production_batch_id,omitempty"`
	MealName          string               `gorm:"type:varchar(255);not null" json:"meal_name"`
	TesterID          uuid.UUID            `gorm:"type:uuid;not null;index" json:"tester_id"`
	Tester            *User                `gorm:"foreignKey:TesterID" json:"tester,omitempty"`
	AppearanceScore   int                  `gorm:"type:integer;not null" json:"appearance_score"`   // 1 - 5
	AromaScore        int                  `gorm:"type:integer;not null" json:"aroma_score"`        // 1 - 5
	TasteScore        int                  `gorm:"type:integer;not null" json:"taste_score"`        // 1 - 5
	TextureScore      int                  `gorm:"type:integer;not null" json:"texture_score"`      // 1 - 5
	OverallScore      float64              `gorm:"type:numeric(3,1);not null" json:"overall_score"` // Average score
	IsPassed          bool                 `gorm:"type:boolean;not null;default:true" json:"is_passed"`
	Notes             string               `gorm:"type:text" json:"notes,omitempty"`
	PhotoURL          string               `gorm:"type:text" json:"photo_url,omitempty"`
}

// --- Food Sample Retention (Wajib disimpan 3x24 jam) ---

type FoodSample struct {
	AuditModel
	SampleDate        time.Time  `gorm:"type:date;not null;index" json:"sample_date"`
	MealName          string     `gorm:"type:varchar(255);not null" json:"meal_name"`
	ProductionBatchID *uuid.UUID `gorm:"type:uuid" json:"production_batch_id,omitempty"`
	StorageLocation   string     `gorm:"type:varchar(100);not null" json:"storage_location"` // e.g. "Freezer Retensi Sampel A1"
	RetentionUntil    time.Time  `gorm:"type:date;not null;index" json:"retention_until"`
	DisposedAt        *time.Time `gorm:"type:timestamptz" json:"disposed_at,omitempty"`
	CollectedByID     uuid.UUID  `gorm:"type:uuid;not null;index" json:"collected_by_id"`
	CollectedBy       *User      `gorm:"foreignKey:CollectedByID" json:"collected_by,omitempty"`
	Notes             string     `gorm:"type:text" json:"notes,omitempty"`
}
