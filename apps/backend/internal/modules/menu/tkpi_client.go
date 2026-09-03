package menu

import (
	"context"
	"fmt"
	"strings"
)

// TKPIEntry represents a food item in the TKPI Kemenkes database
type TKPIEntry struct {
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	CaloriesPer100g float64 `json:"calories_per_100g"`
	ProteinPer100g  float64 `json:"protein_per_100g"`
	FatPer100g      float64 `json:"fat_per_100g"`
	CarbsPer100g    float64 `json:"carbs_per_100g"`
}

type TKPIClient interface {
	Search(ctx context.Context, query string) ([]TKPIEntry, error)
	GetByCode(ctx context.Context, code string) (*TKPIEntry, error)
}

type mockTKPIClient struct {
	database []TKPIEntry
}

func NewTKPIClient() TKPIClient {
	return &mockTKPIClient{
		database: []TKPIEntry{
			{Code: "TKPI-BRS-01", Name: "Beras Putih Giling", CaloriesPer100g: 357, ProteinPer100g: 8.4, FatPer100g: 1.7, CarbsPer100g: 77.1},
			{Code: "TKPI-AYM-01", Name: "Daging Ayam Segar", CaloriesPer100g: 298, ProteinPer100g: 18.2, FatPer100g: 25.0, CarbsPer100g: 0},
			{Code: "TKPI-TLR-01", Name: "Telur Ayam Ras", CaloriesPer100g: 154, ProteinPer100g: 12.4, FatPer100g: 10.8, CarbsPer100g: 0.7},
			{Code: "TKPI-SAY-01", Name: "Bayam Segar", CaloriesPer100g: 16, ProteinPer100g: 0.9, FatPer100g: 0.4, CarbsPer100g: 2.9},
			{Code: "TKPI-SUS-01", Name: "Susu Sapi Segar", CaloriesPer100g: 61, ProteinPer100g: 3.2, FatPer100g: 3.5, CarbsPer100g: 4.3},
			{Code: "TKPI-DGG-01", Name: "Daging Sapi Segar", CaloriesPer100g: 201, ProteinPer100g: 18.8, FatPer100g: 14.0, CarbsPer100g: 0},
			{Code: "TKPI-TMP-01", Name: "Tempe Kedelai Murni", CaloriesPer100g: 150, ProteinPer100g: 14.0, FatPer100g: 7.7, CarbsPer100g: 9.1},
			{Code: "TKPI-THU-01", Name: "Tahu Putih", CaloriesPer100g: 80, ProteinPer100g: 10.9, FatPer100g: 4.7, CarbsPer100g: 0.8},
		},
	}
}

func (m *mockTKPIClient) Search(ctx context.Context, query string) ([]TKPIEntry, error) {
	// Simulate API call delay
	var results []TKPIEntry
	queryLower := strings.ToLower(query)
	
	for _, entry := range m.database {
		if strings.Contains(strings.ToLower(entry.Name), queryLower) || strings.Contains(strings.ToLower(entry.Code), queryLower) {
			results = append(results, entry)
		}
	}
	return results, nil
}

func (m *mockTKPIClient) GetByCode(ctx context.Context, code string) (*TKPIEntry, error) {
	// Simulate API call delay
	for _, entry := range m.database {
		if strings.EqualFold(entry.Code, code) {
			return &entry, nil
		}
	}
	return nil, fmt.Errorf("TKPI data not found for code: %s", code)
}
