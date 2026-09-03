import { AuditModel } from './audit';
import { User } from './iam';
import { Item } from './inventory';

export interface NutritionInfo extends AuditModel {
  item_id: string;
  item?: Item;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g?: number;
  calcium_mg_100g?: number;
  iron_mg_100g?: number;
  source: string;
}

export interface UpsertNutritionInfoRequest {
  item_id: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  fiber_per_100g?: number;
  calcium_mg_100g?: number;
  iron_mg_100g?: number;
  source?: string;
}

export interface TKPIEntry {
	code: string;
	name: string;
	calories_per_100g: number;
	protein_per_100g: number;
	fat_per_100g: number;
	carbs_per_100g: number;
}

export interface SyncTKPIRequest {
	item_id: string;
	tkpi_code: string;
}

export interface MenuRecipeItem extends AuditModel {
  menu_item_id: string;
  item_id: string;
  item?: Item;
  qty_per_portion_gram: number;
}

export interface MenuItem extends AuditModel {
  menu_cycle_id: string;
  day_number: number; // 1 - 20
  meal_name: string;
  description?: string;
  includes_milk: boolean;
  milk_type?: string;
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  akg_percentage: number;
  is_akg_compliant: boolean;
  recipes?: MenuRecipeItem[];
}

export interface RecipeIngredientInput {
  item_id: string;
  qty_per_portion_gram: number;
}

export interface UpsertMenuItemRequest {
  day_number: number;
  meal_name: string;
  description?: string;
  includes_milk: boolean;
  milk_type?: string;
  recipes: RecipeIngredientInput[];
}

export interface MenuCycle extends AuditModel {
  name: string;
  target_group: string;
  total_days: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  approved_by_id?: string;
  approved_by?: User;
  approved_at?: string;
  notes?: string;
  items?: MenuItem[];
}

export interface CreateMenuCycleRequest {
  name: string;
  target_group: string;
  total_days?: number;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface MenuCycleNutritionSummary {
  menu_cycle_id: string;
  menu_cycle_name: string;
  total_days: number;
  compliant_days_count: number;
  average_calories_per_portion: number;
  average_protein_grams: number;
  average_fat_grams: number;
  average_carbs_grams: number;
  average_akg_percentage: number;
  is_cycle_fully_compliant: boolean;
  items: MenuItem[];
}

export interface ApproveMenuCycleRequest {
  notes?: string;
}
