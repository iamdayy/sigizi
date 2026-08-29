package models

import (
	"time"

	"github.com/google/uuid"
)

type DistributionStatus string

const (
	DistStatusScheduled DistributionStatus = "SCHEDULED"
	DistStatusPreparing DistributionStatus = "PREPARING"
	DistStatusInTransit DistributionStatus = "IN_TRANSIT"
	DistStatusDelivered DistributionStatus = "DELIVERED"
	DistStatusRejected  DistributionStatus = "REJECTED"
)

type BASTStatus string

const (
	BASTStatusGenerated BASTStatus = "GENERATED"
	BASTStatusSigned    BASTStatus = "SIGNED"
	BASTStatusArchived  BASTStatus = "ARCHIVED"
)

type DistributionPointType string

const (
	DPTypeSchool    DistributionPointType = "SCHOOL"    // PAUD, SD, SMP, SMA, SMK, SLB
	DPTypePosyandu  DistributionPointType = "POSYANDU"  // Posyandu untuk Kelompok 3B (Bumil, Busui, Balita)
	DPTypePesantren DistributionPointType = "PESANTREN" // Pondok Pesantren
)

type EducationLevel string

const (
	EduPAUD EducationLevel = "PAUD"
	EduSD   EducationLevel = "SD"
	EduSMP  EducationLevel = "SMP"
	EduSMA  EducationLevel = "SMA"
	EduSMK  EducationLevel = "SMK"
	EduSLB  EducationLevel = "SLB"
	EduNone EducationLevel = "NONE"
)

type PackageType string

const (
	PackageFoodTray PackageType = "FOOD_TRAY" // Siap Santap (Food Tray - hari aktif sekolah)
	PackageTotebag  PackageType = "TOTEBAG"   // Kemasan / Totebag (Libur sekolah / Kelompok 3B)
)

type DistributionPoint struct {
	AuditModel
	NPSN            string                `gorm:"type:varchar(32);uniqueIndex" json:"npsn,omitempty"`
	Name            string                `gorm:"type:varchar(255);not null" json:"name"`
	Type            DistributionPointType `gorm:"type:varchar(32);not null;default:'SCHOOL';index" json:"type"`
	EducationLevel  *EducationLevel       `gorm:"type:varchar(16)" json:"education_level,omitempty"`
	Address         string                `gorm:"type:text;not null" json:"address"`
	District        string                `gorm:"type:varchar(100);not null" json:"district"`
	City            string                `gorm:"type:varchar(100);not null" json:"city"`
	ContactPerson   string                `gorm:"type:varchar(150);not null" json:"contact_person"`
	PhoneNumber     string                `gorm:"type:varchar(50);not null" json:"phone_number"`
	TotalRecipients int                   `gorm:"type:integer;not null" json:"total_recipients"`
	DietaryNotes    string                `gorm:"type:text" json:"dietary_notes,omitempty"`
	Latitude        *float64              `gorm:"type:numeric(10,7)" json:"latitude,omitempty"`
	Longitude       *float64              `gorm:"type:numeric(10,7)" json:"longitude,omitempty"`
	IsActive        bool                  `gorm:"type:boolean;not null;default:true" json:"is_active"`
}

type Distribution struct {
	AuditModel
	DeliveryNumber      string             `gorm:"type:varchar(64);uniqueIndex;not null" json:"delivery_number"`
	DistributionPointID uuid.UUID          `gorm:"type:uuid;index" json:"distribution_point_id"`
	DistributionPoint   *DistributionPoint `gorm:"foreignKey:DistributionPointID" json:"distribution_point,omitempty"`
	DeliveryDate        time.Time          `gorm:"type:date;not null;index" json:"delivery_date"`
	Status              DistributionStatus `gorm:"type:varchar(32);not null;default:'SCHEDULED';index" json:"status"`
	PackageType         PackageType        `gorm:"type:varchar(32);not null;default:'FOOD_TRAY'" json:"package_type"`
	IsHolidayDelivery   bool               `gorm:"type:boolean;not null;default:false" json:"is_holiday_delivery"`
	DriverName          string             `gorm:"type:varchar(150);not null" json:"driver_name"`
	VehiclePlate        string             `gorm:"type:varchar(32);not null" json:"vehicle_plate"`
	TotalPortions       int                `gorm:"type:integer;not null" json:"total_portions"`
	TotalValue          float64            `gorm:"type:numeric(18,4);not null;default:0" json:"total_value"`
	RecipientName       string             `gorm:"type:varchar(150)" json:"recipient_name,omitempty"`
	RecipientTitle      string             `gorm:"type:varchar(100)" json:"recipient_title,omitempty"`
	ReceivedAt          *time.Time         `gorm:"type:timestamptz" json:"received_at,omitempty"`
	ProofOfDeliveryURL  string             `gorm:"type:text" json:"proof_of_delivery_url,omitempty"`
	Notes               string             `gorm:"type:text" json:"notes,omitempty"`
	Items               []DistributionItem `gorm:"foreignKey:DistributionID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

type DistributionItem struct {
	AuditModel
	DistributionID   uuid.UUID  `gorm:"type:uuid;not null;index" json:"distribution_id"`
	MenuItemID       *uuid.UUID `gorm:"type:uuid" json:"menu_item_id,omitempty"`
	MealName         string     `gorm:"type:varchar(255);not null" json:"meal_name"`
	PortionsSent     int        `gorm:"type:integer;not null" json:"portions_sent"`
	PortionsReceived int        `gorm:"type:integer;not null;default:0" json:"portions_received"`
	UnitPrice        float64    `gorm:"type:numeric(15,4);not null;default:15000" json:"unit_price"`
	Subtotal         float64    `gorm:"type:numeric(18,4);not null" json:"subtotal"`
}

type BASTDocument struct {
	AuditModel
	DocumentNumber              string             `gorm:"type:varchar(64);uniqueIndex;not null" json:"document_number"`
	DistributionPointID         uuid.UUID          `gorm:"type:uuid;index" json:"distribution_point_id"`
	DistributionPoint           *DistributionPoint `gorm:"foreignKey:DistributionPointID" json:"distribution_point,omitempty"`
	PeriodStart                 time.Time          `gorm:"type:date;not null" json:"period_start"`
	PeriodEnd                   time.Time          `gorm:"type:date;not null" json:"period_end"`
	TotalPortions               int                `gorm:"type:integer;not null" json:"total_portions"`
	TotalAmount                 float64            `gorm:"type:numeric(18,4);not null" json:"total_amount"`
	FileURL                     string             `gorm:"type:text;not null" json:"file_url"`
	FileSizeBytes               int64              `gorm:"type:bigint" json:"file_size_bytes,omitempty"`
	GeneratedAt                 time.Time          `gorm:"type:timestamptz;not null" json:"generated_at"`
	SPPGHeadName                string             `gorm:"type:varchar(150);not null" json:"sppg_head_name"`
	RecipientRepresentativeName string             `gorm:"type:varchar(150);default:'Penerima Manfaat'" json:"recipient_representative_name"` // Kepsek / Bidan Desa / Pimpinan Ponpes
	Status                      BASTStatus         `gorm:"type:varchar(32);not null;default:'GENERATED'" json:"status"`
}
