package models

import (
	"time"

	"github.com/google/uuid"
)

// --- Nutrition Information per 100 grams of ingredient ---

type NutritionInfo struct {
	AuditModel
	ItemID          uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"item_id"`
	Item            *Item     `gorm:"foreignKey:ItemID" json:"item,omitempty"`
	CaloriesPer100g float64   `gorm:"type:numeric(8,2);not null;default:0" json:"calories_per_100g"` // kkal
	ProteinPer100g  float64   `gorm:"type:numeric(8,2);not null;default:0" json:"protein_per_100g"`  // gram
	FatPer100g      float64   `gorm:"type:numeric(8,2);not null;default:0" json:"fat_per_100g"`      // gram
	CarbsPer100g    float64   `gorm:"type:numeric(8,2);not null;default:0" json:"carbs_per_100g"`    // gram
	FiberPer100g    float64   `gorm:"type:numeric(8,2);not null;default:0" json:"fiber_per_100g"`    // gram
	CalciumMg100g   float64   `gorm:"type:numeric(8,2);not null;default:0" json:"calcium_mg_100g"`   // mg
	IronMg100g      float64   `gorm:"type:numeric(8,2);not null;default:0" json:"iron_mg_100g"`      // mg
	Source          string    `gorm:"type:varchar(100);default:'TKPI Kemenkes RI'" json:"source"`    // Sumber data
}

// --- Menu Cycle Target Groups ---
type TargetGroupType string

const (
	TargetStudent TargetGroupType = "STUDENT"  // PAUD, SD, SMP, SMA (500-700 kkal target)
	TargetGroup3B TargetGroupType = "GROUP_3B" // Ibu Hamil, Menyusui, Balita (800-900 kkal target)
)

// --- Menu Cycle (20 Days Standard Cycle according to BGN guidelines) ---

type MenuCycle struct {
	AuditModel
	Name         string          `gorm:"type:varchar(255);not null" json:"name"`
	TargetGroup  TargetGroupType `gorm:"type:varchar(32);not null;default:'STUDENT'" json:"target_group"`
	TotalDays    int             `gorm:"type:integer;not null;default:20" json:"total_days"`
	StartDate    time.Time       `gorm:"type:date;not null" json:"start_date"`
	EndDate      time.Time       `gorm:"type:date;not null" json:"end_date"`
	IsActive     bool            `gorm:"type:boolean;not null;default:false;index" json:"is_active"`
	ApprovedByID *uuid.UUID      `gorm:"type:uuid" json:"approved_by_id,omitempty"` // Nutritionist / Kepala SPPG
	ApprovedBy   *User           `gorm:"foreignKey:ApprovedByID" json:"approved_by,omitempty"`
	ApprovedAt   *time.Time      `gorm:"type:timestamptz" json:"approved_at,omitempty"`
	Notes        string          `gorm:"type:text" json:"notes,omitempty"`
	Items        []MenuItem      `gorm:"foreignKey:MenuCycleID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

// --- Menu Item per Day (e.g. Day 1: Nasi Ayam Teriyaki + Sayur Capcay + Susu UHT) ---

type MenuItem struct {
	AuditModel
	MenuCycleID    uuid.UUID        `gorm:"type:uuid;not null;index" json:"menu_cycle_id"`
	DayNumber      int              `gorm:"type:integer;not null" json:"day_number"` // 1 to 20
	MealName       string           `gorm:"type:varchar(255);not null" json:"meal_name"`
	Description    string           `gorm:"type:text" json:"description,omitempty"`
	IncludesMilk   bool             `gorm:"type:boolean;not null;default:true" json:"includes_milk"`
	MilkType       string           `gorm:"type:varchar(50);default:'UHT'" json:"milk_type,omitempty"` // UHT, PASTEURISASI
	TotalCalories  float64          `gorm:"type:numeric(10,2);not null;default:0" json:"total_calories"`
	TotalProtein   float64          `gorm:"type:numeric(10,2);not null;default:0" json:"total_protein"`
	TotalFat       float64          `gorm:"type:numeric(10,2);not null;default:0" json:"total_fat"`
	TotalCarbs     float64          `gorm:"type:numeric(10,2);not null;default:0" json:"total_carbs"`
	AKGPercentage  float64          `gorm:"type:numeric(5,2);not null;default:0" json:"akg_percentage"` // Target: 20-35% of daily AKG (typically 500-700 kkal)
	IsAKGCompliant bool             `gorm:"type:boolean;not null;default:false" json:"is_akg_compliant"`
	Recipes        []MenuRecipeItem `gorm:"foreignKey:MenuItemID;constraint:OnDelete:CASCADE" json:"recipes,omitempty"`
}

// --- Recipe Ingredient per Portion ---

type MenuRecipeItem struct {
	AuditModel
	MenuItemID        uuid.UUID `gorm:"type:uuid;not null;index" json:"menu_item_id"`
	ItemID            uuid.UUID `gorm:"type:uuid;not null;index" json:"item_id"`
	Item              *Item     `gorm:"foreignKey:ItemID" json:"item,omitempty"`
	QtyPerPortionGram float64   `gorm:"type:numeric(10,2);not null" json:"qty_per_portion_gram"` // Grams of ingredient per 1 student portion
}
