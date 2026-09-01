package menu

import (
	"context"
	"testing"
	"time"

	"github.com/daydev/mbg-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/driver/sqlite"
)

type mockMenuRepo struct {
	db *gorm.DB
	cycle *models.MenuCycle
	nutritions map[uuid.UUID]*models.NutritionInfo
	menuItem *models.MenuItem
}

func (m *mockMenuRepo) GetDB() *gorm.DB { return m.db }
func (m *mockMenuRepo) WithTx(tx *gorm.DB) Repository { return m }

func (m *mockMenuRepo) UpsertNutritionInfo(ctx context.Context, item *models.NutritionInfo) error { return nil }
func (m *mockMenuRepo) GetNutritionInfoByItemID(ctx context.Context, itemID uuid.UUID) (*models.NutritionInfo, error) {
	if n, ok := m.nutritions[itemID]; ok {
		return n, nil
	}
	return nil, gorm.ErrRecordNotFound
}
func (m *mockMenuRepo) ListNutritionInfo(ctx context.Context) ([]models.NutritionInfo, error) { return nil, nil }

func (m *mockMenuRepo) CreateMenuCycle(ctx context.Context, cycle *models.MenuCycle) error { return nil }
func (m *mockMenuRepo) GetMenuCycleByID(ctx context.Context, id uuid.UUID) (*models.MenuCycle, error) {
	return m.cycle, nil
}
func (m *mockMenuRepo) GetActiveMenuCycle(ctx context.Context) (*models.MenuCycle, error) { return nil, nil }
func (m *mockMenuRepo) ListMenuCycles(ctx context.Context) ([]models.MenuCycle, error) { return nil, nil }
func (m *mockMenuRepo) UpdateMenuCycle(ctx context.Context, cycle *models.MenuCycle) error { return nil }
func (m *mockMenuRepo) SetActiveMenuCycle(ctx context.Context, id uuid.UUID) error { return nil }

func (m *mockMenuRepo) UpsertMenuItem(ctx context.Context, item *models.MenuItem) error {
	m.menuItem = item
	return nil
}
func (m *mockMenuRepo) GetMenuItemByID(ctx context.Context, id uuid.UUID) (*models.MenuItem, error) {
	return m.menuItem, nil
}
func (m *mockMenuRepo) DeleteMenuItemRecipes(ctx context.Context, menuItemID uuid.UUID) error { return nil }


func TestUpsertMenuItem_AKG(t *testing.T) {
	riceID := uuid.New()
	chickenID := uuid.New()
	cycleID := uuid.New()

	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	
	// Create tables manually to avoid gen_random_uuid() issues
	db.Exec(`
		CREATE TABLE menu_items (
			id text PRIMARY KEY,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime,
			created_by text,
			updated_by text,
			deleted_by text,
			menu_cycle_id text,
			day_number integer,
			meal_name text,
			description text,
			includes_milk boolean,
			milk_type text,
			total_calories numeric,
			total_protein numeric,
			total_fat numeric,
			total_carbs numeric,
			akg_percentage numeric,
			is_akg_compliant boolean
		);
	`)
	db.Exec(`
		CREATE TABLE menu_recipe_items (
			id text PRIMARY KEY,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime,
			created_by text,
			updated_by text,
			deleted_by text,
			menu_item_id text,
			item_id text,
			qty_per_portion_gram numeric
		);
	`)

	repo := &mockMenuRepo{
		db: db,
		cycle: &models.MenuCycle{
			AuditModel: models.AuditModel{ID: cycleID},
			TotalDays:  20,
			StartDate:  time.Now(),
			EndDate:    time.Now().Add(20 * 24 * time.Hour),
		},
		nutritions: map[uuid.UUID]*models.NutritionInfo{
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
		},
	}

	svc := NewService(repo)

	tests := []struct {
		name string
		req *UpsertMenuItemRequest
		verify func(t *testing.T, item *models.MenuItem, err error)
	}{
		{
			name: "Normal Meal with UHT Milk",
			req: &UpsertMenuItemRequest{
				DayNumber: 1,
				MealName: "Rice + Chicken + Milk",
				IncludesMilk: true,
				MilkType: "UHT",
				Recipes: []RecipeIngredientInput{
					{ItemID: riceID, QtyPerPortionGram: 100},
					{ItemID: chickenID, QtyPerPortionGram: 75},
				},
			},
			verify: func(t *testing.T, item *models.MenuItem, err error) {
				if err != nil {
					t.Fatalf("expected no error, got %v", err)
				}
				if item.TotalCalories < 350.0 {
					t.Errorf("expected total calories > 350, got %v", item.TotalCalories)
				}
				if item.TotalProtein < 30.0 {
					t.Errorf("expected total protein > 30, got %v", item.TotalProtein)
				}
			},
		},
		{
			name: "AKG Zero (Nutrition Info Not Found)",
			req: &UpsertMenuItemRequest{
				DayNumber: 2,
				MealName: "Unknown Meat",
				IncludesMilk: false,
				Recipes: []RecipeIngredientInput{
					{ItemID: uuid.New(), QtyPerPortionGram: 100},
				},
			},
			verify: func(t *testing.T, item *models.MenuItem, err error) {
				if err != nil {
					t.Fatalf("expected no error, got %v", err)
				}
				if item.TotalCalories != 0 {
					t.Errorf("expected 0 calories, got %v", item.TotalCalories)
				}
				if item.IsAKGCompliant {
					t.Errorf("expected not compliant for 0 calories")
				}
			},
		},
		{
			name: "AKG > 100% (Huge portions)",
			req: &UpsertMenuItemRequest{
				DayNumber: 3,
				MealName: "Feast",
				IncludesMilk: true,
				Recipes: []RecipeIngredientInput{
					{ItemID: chickenID, QtyPerPortionGram: 5000},
				},
			},
			verify: func(t *testing.T, item *models.MenuItem, err error) {
				if err != nil {
					t.Fatalf("expected no error, got %v", err)
				}
				if item.AKGPercentage <= 100.0 {
					t.Errorf("expected AKG > 100%%, got %v%%", item.AKGPercentage)
				}
				// It shouldn't be compliant since it exceeds 35% target
				if item.IsAKGCompliant {
					t.Errorf("expected not compliant for > 35%% AKG target")
				}
			},
		},
		{
			name: "Quantity 0",
			req: &UpsertMenuItemRequest{
				DayNumber: 4,
				MealName: "Air",
				IncludesMilk: false,
				Recipes: []RecipeIngredientInput{
					{ItemID: riceID, QtyPerPortionGram: 0},
				},
			},
			verify: func(t *testing.T, item *models.MenuItem, err error) {
				if err != nil {
					t.Fatalf("expected no error, got %v", err)
				}
				if item.TotalCalories != 0 {
					t.Errorf("expected 0 calories for qty 0, got %v", item.TotalCalories)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			item, err := svc.UpsertMenuItem(context.Background(), cycleID, tt.req, uuid.New())
			tt.verify(t, item, err)
		})
	}
}
