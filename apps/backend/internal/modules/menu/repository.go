package menu

import (
	"context"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	GetDB() *gorm.DB

	// NutritionInfo
	UpsertNutritionInfo(ctx context.Context, item *models.NutritionInfo) error
	GetNutritionInfoByItemID(ctx context.Context, itemID uuid.UUID) (*models.NutritionInfo, error)
	ListNutritionInfo(ctx context.Context) ([]models.NutritionInfo, error)

	// Menu Cycles
	CreateMenuCycle(ctx context.Context, cycle *models.MenuCycle) error
	GetMenuCycleByID(ctx context.Context, id uuid.UUID) (*models.MenuCycle, error)
	GetActiveMenuCycle(ctx context.Context) (*models.MenuCycle, error)
	ListMenuCycles(ctx context.Context) ([]models.MenuCycle, error)
	UpdateMenuCycle(ctx context.Context, cycle *models.MenuCycle) error
	SetActiveMenuCycle(ctx context.Context, id uuid.UUID) error

	// Menu Items & Recipes
	UpsertMenuItem(ctx context.Context, item *models.MenuItem) error
	GetMenuItemByID(ctx context.Context, id uuid.UUID) (*models.MenuItem, error)
	DeleteMenuItemRecipes(ctx context.Context, menuItemID uuid.UUID) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) GetDB() *gorm.DB {
	return r.db
}

func (r *repository) UpsertNutritionInfo(ctx context.Context, item *models.NutritionInfo) error {
	var existing models.NutritionInfo
	err := r.db.WithContext(ctx).Where("item_id = ?", item.ItemID).First(&existing).Error
	if err == nil {
		item.ID = existing.ID
		return r.db.WithContext(ctx).Save(item).Error
	}
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *repository) GetNutritionInfoByItemID(ctx context.Context, itemID uuid.UUID) (*models.NutritionInfo, error) {
	var item models.NutritionInfo
	err := r.db.WithContext(ctx).Preload("Item").Where("item_id = ?", itemID).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) ListNutritionInfo(ctx context.Context) ([]models.NutritionInfo, error) {
	var list []models.NutritionInfo
	err := r.db.WithContext(ctx).Preload("Item").Order("created_at DESC").Find(&list).Error
	return list, err
}

func (r *repository) CreateMenuCycle(ctx context.Context, cycle *models.MenuCycle) error {
	return r.db.WithContext(ctx).Create(cycle).Error
}

func (r *repository) GetMenuCycleByID(ctx context.Context, id uuid.UUID) (*models.MenuCycle, error) {
	var cycle models.MenuCycle
	err := r.db.WithContext(ctx).
		Preload("ApprovedBy").
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("day_number ASC")
		}).
		Preload("Items.Recipes").
		Preload("Items.Recipes.Item").
		Where("id = ?", id).
		First(&cycle).Error
	if err != nil {
		return nil, err
	}
	return &cycle, nil
}

func (r *repository) GetActiveMenuCycle(ctx context.Context) (*models.MenuCycle, error) {
	var cycle models.MenuCycle
	err := r.db.WithContext(ctx).
		Preload("ApprovedBy").
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("day_number ASC")
		}).
		Preload("Items.Recipes").
		Preload("Items.Recipes.Item").
		Where("is_active = true").
		First(&cycle).Error
	if err != nil {
		return nil, err
	}
	return &cycle, nil
}

func (r *repository) ListMenuCycles(ctx context.Context) ([]models.MenuCycle, error) {
	var list []models.MenuCycle
	err := r.db.WithContext(ctx).
		Preload("ApprovedBy").
		Order("start_date DESC").
		Find(&list).Error
	return list, err
}

func (r *repository) UpdateMenuCycle(ctx context.Context, cycle *models.MenuCycle) error {
	return r.db.WithContext(ctx).Save(cycle).Error
}

func (r *repository) SetActiveMenuCycle(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Deactivate all others
		if err := tx.Model(&models.MenuCycle{}).Where("id != ?", id).Update("is_active", false).Error; err != nil {
			return err
		}
		// Activate selected
		return tx.Model(&models.MenuCycle{}).Where("id = ?", id).Update("is_active", true).Error
	})
}

func (r *repository) UpsertMenuItem(ctx context.Context, item *models.MenuItem) error {
	var existing models.MenuItem
	err := r.db.WithContext(ctx).
		Where("menu_cycle_id = ? AND day_number = ?", item.MenuCycleID, item.DayNumber).
		First(&existing).Error
	if err == nil {
		item.ID = existing.ID
		return r.db.WithContext(ctx).Save(item).Error
	}
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *repository) GetMenuItemByID(ctx context.Context, id uuid.UUID) (*models.MenuItem, error) {
	var item models.MenuItem
	err := r.db.WithContext(ctx).Preload("Recipes").Preload("Recipes.Item").Where("id = ?", id).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *repository) DeleteMenuItemRecipes(ctx context.Context, menuItemID uuid.UUID) error {
	return r.db.WithContext(ctx).Where("menu_item_id = ?", menuItemID).Delete(&models.MenuRecipeItem{}).Error
}
