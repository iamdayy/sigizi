package menu

import (
	"context"
	"fmt"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Service interface {
	// NutritionInfo
	UpsertNutritionInfo(ctx context.Context, req *UpsertNutritionInfoRequest, userID uuid.UUID) (*models.NutritionInfo, error)
	ListNutritionInfo(ctx context.Context) ([]models.NutritionInfo, error)

	// Menu Cycles
	CreateMenuCycle(ctx context.Context, req *CreateMenuCycleRequest, userID uuid.UUID) (*models.MenuCycle, error)
	ListMenuCycles(ctx context.Context) ([]models.MenuCycle, error)
	GetMenuCycle(ctx context.Context, id uuid.UUID) (*models.MenuCycle, error)
	GetActiveMenuCycle(ctx context.Context) (*models.MenuCycle, error)
	ApproveMenuCycle(ctx context.Context, id uuid.UUID, req *ApproveMenuCycleRequest, userID uuid.UUID) (*models.MenuCycle, error)
	SetActiveMenuCycle(ctx context.Context, id uuid.UUID) error

	// Menu Items
	UpsertMenuItem(ctx context.Context, cycleID uuid.UUID, req *UpsertMenuItemRequest, userID uuid.UUID) (*models.MenuItem, error)
	GetCycleNutritionSummary(ctx context.Context, cycleID uuid.UUID) (*MenuCycleNutritionSummary, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) UpsertNutritionInfo(ctx context.Context, req *UpsertNutritionInfoRequest, userID uuid.UUID) (*models.NutritionInfo, error) {
	src := req.Source
	if src == "" {
		src = "TKPI Kemenkes RI"
	}

	info := &models.NutritionInfo{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
			UpdatedBy: &userID,
		},
		ItemID:          req.ItemID,
		CaloriesPer100g: req.CaloriesPer100g,
		ProteinPer100g:  req.ProteinPer100g,
		FatPer100g:      req.FatPer100g,
		CarbsPer100g:    req.CarbsPer100g,
		FiberPer100g:    req.FiberPer100g,
		CalciumMg100g:   req.CalciumMg100g,
		IronMg100g:      req.IronMg100g,
		Source:          src,
	}

	if err := s.repo.UpsertNutritionInfo(ctx, info); err != nil {
		return nil, fmt.Errorf("failed to save nutrition info: %w", err)
	}

	return s.repo.GetNutritionInfoByItemID(ctx, req.ItemID)
}

func (s *service) ListNutritionInfo(ctx context.Context) ([]models.NutritionInfo, error) {
	return s.repo.ListNutritionInfo(ctx)
}

func (s *service) CreateMenuCycle(ctx context.Context, req *CreateMenuCycleRequest, userID uuid.UUID) (*models.MenuCycle, error) {
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start_date: %w", err)
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end_date: %w", err)
	}

	if endDate.Before(startDate) {
		return nil, fmt.Errorf("end_date cannot be earlier than start_date")
	}

	totalDays := req.TotalDays
	if totalDays <= 0 {
		totalDays = 20
	}

	cycle := &models.MenuCycle{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
		},
		Name:      req.Name,
		TotalDays: totalDays,
		StartDate: startDate,
		EndDate:   endDate,
		IsActive:  false,
		Notes:     req.Notes,
	}

	if err := s.repo.CreateMenuCycle(ctx, cycle); err != nil {
		return nil, fmt.Errorf("failed to create menu cycle: %w", err)
	}

	return s.repo.GetMenuCycleByID(ctx, cycle.ID)
}

func (s *service) ListMenuCycles(ctx context.Context) ([]models.MenuCycle, error) {
	return s.repo.ListMenuCycles(ctx)
}

func (s *service) GetMenuCycle(ctx context.Context, id uuid.UUID) (*models.MenuCycle, error) {
	return s.repo.GetMenuCycleByID(ctx, id)
}

func (s *service) GetActiveMenuCycle(ctx context.Context) (*models.MenuCycle, error) {
	return s.repo.GetActiveMenuCycle(ctx)
}

func (s *service) ApproveMenuCycle(ctx context.Context, id uuid.UUID, req *ApproveMenuCycleRequest, userID uuid.UUID) (*models.MenuCycle, error) {
	cycle, err := s.repo.GetMenuCycleByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("menu cycle not found: %w", err)
	}

	if cycle.CreatedBy != nil && *cycle.CreatedBy == userID {
		return nil, fmt.Errorf("tidak bisa menyetujui siklus menu buatan sendiri")
	}

	if len(cycle.Items) != cycle.TotalDays {
		return nil, fmt.Errorf("cannot approve cycle: not all %d days have menus configured", cycle.TotalDays)
	}

	for _, item := range cycle.Items {
		if !item.IsAKGCompliant {
			return nil, fmt.Errorf("cannot approve cycle: day %d is not AKG compliant", item.DayNumber)
		}
	}

	now := time.Now()
	cycle.ApprovedByID = &userID
	cycle.ApprovedAt = &now
	if req.Notes != "" {
		if cycle.Notes != "" {
			cycle.Notes += " | Approval: " + req.Notes
		} else {
			cycle.Notes = "Approval: " + req.Notes
		}
	}
	cycle.UpdatedBy = &userID

	if err := s.repo.UpdateMenuCycle(ctx, cycle); err != nil {
		return nil, fmt.Errorf("failed to approve menu cycle: %w", err)
	}

	return s.repo.GetMenuCycleByID(ctx, id)
}

func (s *service) SetActiveMenuCycle(ctx context.Context, id uuid.UUID) error {
	return s.repo.SetActiveMenuCycle(ctx, id)
}

func (s *service) UpsertMenuItem(ctx context.Context, cycleID uuid.UUID, req *UpsertMenuItemRequest, userID uuid.UUID) (*models.MenuItem, error) {
	cycle, err := s.repo.GetMenuCycleByID(ctx, cycleID)
	if err != nil {
		return nil, fmt.Errorf("menu cycle not found: %w", err)
	}

	if req.DayNumber < 1 || req.DayNumber > cycle.TotalDays {
		return nil, fmt.Errorf("day_number must be between 1 and %d", cycle.TotalDays)
	}

	// 1. Calculate Nutrition based on recipes & TKPI data
	var totalCalories, totalProtein, totalFat, totalCarbs float64
	recipes := make([]models.MenuRecipeItem, len(req.Recipes))

	for i, r := range req.Recipes {
		nutInfo, err := s.repo.GetNutritionInfoByItemID(ctx, r.ItemID)
		if err != nil {
			// Gracefully handle missing nutrition info instead of crashing,
			// allowing the menu to be created with 0 macros for this item.
			nutInfo = nil
		}
		if nutInfo != nil {
			factor := r.QtyPerPortionGram / 100.0
			totalCalories += nutInfo.CaloriesPer100g * factor
			totalProtein += nutInfo.ProteinPer100g * factor
			totalFat += nutInfo.FatPer100g * factor
			totalCarbs += nutInfo.CarbsPer100g * factor
		}

		recipes[i] = models.MenuRecipeItem{
			ItemID:            r.ItemID,
			QtyPerPortionGram: r.QtyPerPortionGram,
		}
	}

	// If milk is included (BGN requirement), add milk nutrients if not explicitly in recipe
	milkType := req.MilkType
	if req.IncludesMilk {
		if milkType == "" {
			milkType = "UHT"
		}
		// Standard 200ml milk portion nutrients
		totalCalories += 130.0
		totalProtein += 7.0
		totalFat += 6.5
		totalCarbs += 10.0
	}

	// AKG benchmark: 2000 kkal/day. Target MBG lunch: 20% - 35% (400 - 700 kkal)
	akgPercentage := (totalCalories / 2000.0) * 100.0
	isCompliant := akgPercentage >= 20.0 && akgPercentage <= 35.0 && totalProtein >= 15.0

	menuItem := &models.MenuItem{
		AuditModel: models.AuditModel{
			CreatedBy: &userID,
			UpdatedBy: &userID,
		},
		MenuCycleID:    cycleID,
		DayNumber:      req.DayNumber,
		MealName:       req.MealName,
		Description:    req.Description,
		IncludesMilk:   req.IncludesMilk,
		MilkType:       milkType,
		TotalCalories:  totalCalories,
		TotalProtein:   totalProtein,
		TotalFat:       totalFat,
		TotalCarbs:     totalCarbs,
		AKGPercentage:  akgPercentage,
		IsAKGCompliant: isCompliant,
	}

	err = s.repo.GetDB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txRepo := s.repo.WithTx(tx)
		if err := txRepo.UpsertMenuItem(ctx, menuItem); err != nil {
			return err
		}

		// Re-assign recipes
		_ = txRepo.DeleteMenuItemRecipes(ctx, menuItem.ID)
		for i := range recipes {
			recipes[i].MenuItemID = menuItem.ID
			recipes[i].CreatedBy = &userID
			if err := tx.Create(&recipes[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to save menu item and recipes: %w", err)
	}

	return s.repo.GetMenuItemByID(ctx, menuItem.ID)
}

func (s *service) GetCycleNutritionSummary(ctx context.Context, cycleID uuid.UUID) (*MenuCycleNutritionSummary, error) {
	cycle, err := s.repo.GetMenuCycleByID(ctx, cycleID)
	if err != nil {
		return nil, fmt.Errorf("menu cycle not found: %w", err)
	}

	var totalCal, totalProt, totalFat, totalCarb, totalAKG float64
	var compliantCount int

	for _, item := range cycle.Items {
		totalCal += item.TotalCalories
		totalProt += item.TotalProtein
		totalFat += item.TotalFat
		totalCarb += item.TotalCarbs
		totalAKG += item.AKGPercentage
		if item.IsAKGCompliant {
			compliantCount++
		}
	}

	itemCount := len(cycle.Items)
	if itemCount == 0 {
		itemCount = 1 // avoid div by zero
	}

	return &MenuCycleNutritionSummary{
		MenuCycleID:               cycle.ID,
		MenuCycleName:             cycle.Name,
		TotalDays:                 cycle.TotalDays,
		CompliantDaysCount:        compliantCount,
		AverageCaloriesPerPortion: totalCal / float64(itemCount),
		AverageProteinGrams:       totalProt / float64(itemCount),
		AverageFatGrams:           totalFat / float64(itemCount),
		AverageCarbsGrams:         totalCarb / float64(itemCount),
		AverageAKGPercentage:      totalAKG / float64(itemCount),
		IsCycleFullyCompliant:     compliantCount == cycle.TotalDays && cycle.TotalDays > 0,
		Items:                     cycle.Items,
	}, nil
}
