package menu

import (
	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

type UpsertNutritionInfoRequest struct {
	ItemID          uuid.UUID `json:"item_id" binding:"required"`
	CaloriesPer100g float64   `json:"calories_per_100g" binding:"required"`
	ProteinPer100g  float64   `json:"protein_per_100g" binding:"required"`
	FatPer100g      float64   `json:"fat_per_100g" binding:"required"`
	CarbsPer100g    float64   `json:"carbs_per_100g" binding:"required"`
	FiberPer100g    float64   `json:"fiber_per_100g"`
	CalciumMg100g   float64   `json:"calcium_mg_100g"`
	IronMg100g      float64   `json:"iron_mg_100g"`
	Source          string    `json:"source"`
}

type CreateMenuCycleRequest struct {
	Name      string `json:"name" binding:"required"`
	TotalDays int    `json:"total_days"` // defaults to 20
	StartDate string `json:"start_date" binding:"required"` // YYYY-MM-DD
	EndDate   string `json:"end_date" binding:"required"`   // YYYY-MM-DD
	Notes     string `json:"notes"`
}

type RecipeIngredientInput struct {
	ItemID            uuid.UUID `json:"item_id" binding:"required"`
	QtyPerPortionGram float64   `json:"qty_per_portion_gram" binding:"required,gt=0"`
}

type UpsertMenuItemRequest struct {
	DayNumber    int                     `json:"day_number" binding:"required,min=1,max=20"`
	MealName     string                  `json:"meal_name" binding:"required"`
	Description  string                  `json:"description"`
	IncludesMilk bool                    `json:"includes_milk"`
	MilkType     string                  `json:"milk_type"` // UHT, PASTEURISASI
	Recipes      []RecipeIngredientInput `json:"recipes" binding:"required,min=1"`
}

type MenuCycleNutritionSummary struct {
	MenuCycleID               uuid.UUID `json:"menu_cycle_id"`
	MenuCycleName             string    `json:"menu_cycle_name"`
	TotalDays                 int       `json:"total_days"`
	CompliantDaysCount        int       `json:"compliant_days_count"`
	AverageCaloriesPerPortion float64   `json:"average_calories_per_portion"`
	AverageProteinGrams       float64   `json:"average_protein_grams"`
	AverageFatGrams           float64   `json:"average_fat_grams"`
	AverageCarbsGrams         float64   `json:"average_carbs_grams"`
	AverageAKGPercentage      float64   `json:"average_akg_percentage"`
	IsCycleFullyCompliant     bool      `json:"is_cycle_fully_compliant"`
	Items                     []models.MenuItem `json:"items"`
}

type ApproveMenuCycleRequest struct {
	Notes string `json:"notes"`
}
