import { AuditModel } from './audit';
import { Item, ItemBatch } from './inventory';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COGS';

export interface Account extends AuditModel {
  code: string; // e.g. "1-1001", "5-1001"
  name: string;
  type: AccountType;
  normal_balance: 'DEBIT' | 'CREDIT';
  is_active: boolean;
  description?: string;
  parent_id?: string | null;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  type: AccountType;
  normal_balance: 'DEBIT' | 'CREDIT';
  description?: string;
  parent_id?: string | null;
}

export interface CreateJournalLineRequest {
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryRequest {
  entry_date: string; // YYYY-MM-DD
  description: string;
  reference_type: string;
  reference_id?: string;
  lines: CreateJournalLineRequest[];
}

export interface JournalLine extends AuditModel {
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
  account?: Account;
}

export interface JournalEntry extends AuditModel {
  entry_number: string;
  entry_date: string; // YYYY-MM-DD
  description: string;
  reference_type: string;
  reference_id?: string;
  is_auto_reconciled: boolean;
  total_debit: number;
  total_credit: number;
  lines: JournalLine[];
}

export interface ProductionIngredientInput {
  item_id: string;
  qty_required: number;
}

export interface MealProductionRequest {
  meal_name: string;
  target_portions: number;
  selling_price_per_portion: number; // e.g. 15,000 IDR government standard
  ingredients: ProductionIngredientInput[];
  notes?: string;
}

export interface IngredientCostDetail {
  item_id: string;
  item_name: string;
  qty_used: number;
  unit: string;
  batches_used: {
    batch_id: string;
    batch_code: string;
    expiry_date: string;
    qty: number;
    unit_cost: number;
    subtotal: number;
  }[];
  total_ingredient_cost: number;
}

export interface MealProductionResult extends AuditModel {
  production_code: string;
  meal_name: string;
  total_portions: number;
  selling_price_per_portion: number;
  total_cogs: number;
  cogs_per_portion: number;
  gross_profit_per_portion: number;
  total_gross_profit: number;
  margin_percentage: number;
  is_margin_critical: boolean; // TRUE if margin_percentage < 10%
  ingredients_breakdown: IngredientCostDetail[];
}

export interface ProductionBatch extends AuditModel {
  production_code: string;
  production_date: string;
  meal_name: string;
  total_portions: number;
  selling_price_per_portion: number;
  total_cogs: number;
  cogs_per_portion: number;
  gross_profit_per_portion: number;
  total_gross_profit: number;
  margin_percentage: number;
  is_margin_critical: boolean;
  notes?: string;
}


export interface DailyReconciliationReport {
  reconciliation_date: string;
  processed_at: string;
  total_distributions_count: number;
  total_portions_delivered: number;
  total_stock_out_cost: number;
  journal_entry_id: string;
  journal_entry_number: string;
  status: 'SUCCESS' | 'SKIPPED_NO_MOVEMENTS' | 'ERROR';
  message: string;
}

export interface FinancialDashboardStats {
  period: string;
  total_portions_produced: number;
  total_revenue: number;
  total_cogs: number;
  total_gross_profit: number;
  average_margin_percentage: number;
  critical_margin_batch_count: number;
  recent_cogs_trend: {
    date: string;
    cogs_per_portion: number;
    margin_percentage: number;
    meal_name: string;
    is_critical: boolean;
  }[];
}
