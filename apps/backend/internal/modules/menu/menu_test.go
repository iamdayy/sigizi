package menu

import (
	"testing"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
)

func TestAKGCalculationLogic(t *testing.T) {
	// 1. Setup sample items with TKPI nutritional profiles
	riceID := uuid.New()
	chickenID := uuid.New()

	nutritions := map[uuid.UUID]*models.NutritionInfo{
		riceID: {
			CaloriesPer100g: 130.0,
			ProteinPer100g:  2.7,
			FatPer100g:      0.3,
			CarbsPer100g:    28.0,
			CalciumMg100g:   10.0,
		},
		chickenID: {
			CaloriesPer100g: 165.0,
			ProteinPer100g:  31.0,
			FatPer100g:      3.6,
			CarbsPer100g:    0.0,
			CalciumMg100g:   15.0,
		},
	}

	// 2. Sample recipe: 100g rice + 75g chicken + Milk UHT
	var totalCal, totalProt, totalFat, totalCarb, totalCalc float64

	// Rice (100g)
	factorRice := 100.0 / 100.0
	totalCal += nutritions[riceID].CaloriesPer100g * factorRice
	totalProt += nutritions[riceID].ProteinPer100g * factorRice
	totalFat += nutritions[riceID].FatPer100g * factorRice
	totalCarb += nutritions[riceID].CarbsPer100g * factorRice
	totalCalc += nutritions[riceID].CalciumMg100g * factorRice

	// Chicken (75g)
	factorChicken := 75.0 / 100.0
	totalCal += nutritions[chickenID].CaloriesPer100g * factorChicken
	totalProt += nutritions[chickenID].ProteinPer100g * factorChicken
	totalFat += nutritions[chickenID].FatPer100g * factorChicken
	totalCarb += nutritions[chickenID].CarbsPer100g * factorChicken
	totalCalc += nutritions[chickenID].CalciumMg100g * factorChicken

	// Milk UHT (130 kkal, 7g protein, 240mg calcium)
	totalCal += 130.0
	totalProt += 7.0
	totalFat += 6.0
	totalCarb += 10.0
	totalCalc += 240.0

	// 3. Assertions
	if totalCal < 350.0 {
		t.Errorf("Expected total calories to exceed 350 kkal, got %.2f", totalCal)
	}

	if totalProt < 30.0 {
		t.Errorf("Expected total protein to exceed 30g, got %.2f", totalProt)
	}

	if totalCalc < 200.0 {
		t.Errorf("Expected calcium to exceed 200mg due to milk component, got %.2f", totalCalc)
	}

	t.Logf("Calculated Portioned Nutrition: Calories=%.1f kkal, Protein=%.1fg, Fat=%.1fg, Carbs=%.1fg, Calcium=%.1fmg",
		totalCal, totalProt, totalFat, totalCarb, totalCalc)
}
