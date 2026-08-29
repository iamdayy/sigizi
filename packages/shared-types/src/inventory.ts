import { AuditModel } from './audit';

export type ItemCategory = 'PROTEIN' | 'CARBOHYDRATE' | 'VEGETABLE' | 'FRUIT' | 'DAIRY' | 'SPICE' | 'PACKAGING' | 'OTHER';

export interface Item extends AuditModel {
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string; // e.g. "kg", "gram", "pcs", "liter"
  min_stock_threshold: number;
  is_perishable: boolean;
  total_stock?: number;
  batches?: ItemBatch[];
}

export interface ItemBatch extends AuditModel {
  item_id: string;
  batch_code: string;
  expiry_date: string; // YYYY-MM-DD
  unit_cost: number; // in IDR (Decimal/Float)
  initial_qty: number;
  current_qty: number;
  received_date: string;
  supplier_name?: string;
  item?: Item;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTE';
export type ReferenceType = 'PURCHASE_RECEIPT' | 'MEAL_PRODUCTION' | 'DISTRIBUTION' | 'STOCK_OPNAME' | 'EXPIRED_DISPOSAL';

export interface StockMovement extends AuditModel {
  item_batch_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_type: ReferenceType;
  reference_id: string;
  notes?: string;
  unit_cost_snapshot: number;
  total_cost_snapshot: number;
  item_batch?: ItemBatch;
}

export interface CreateItemRequest {
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  min_stock_threshold?: number;
  is_perishable: boolean;
}

export interface CreateBatchRequest {
  item_id: string;
  batch_code?: string;
  expiry_date: string;
  unit_cost: number;
  quantity: number;
  supplier_name?: string;
}

export interface StockInBatchInput {
  item_id: string;
  batch_code?: string;
  expiry_date: string;
  unit_cost: number;
  quantity: number;
  supplier_name?: string;
}

export interface StockOutRequest {
  item_id: string;
  requested_qty: number;
  reference_type: ReferenceType;
  reference_id: string;
  notes?: string;
}

export interface DepletedBatchAllocation {
  batch_id: string;
  batch_code: string;
  expiry_date: string;
  depleted_qty: number;
  remaining_qty: number;
  unit_cost: number;
  subtotal_cost: number;
}

export interface StockOutResult {
  item_id: string;
  item_name: string;
  total_qty_depleted: number;
  total_cost: number;
  allocations: DepletedBatchAllocation[];
}

export interface ItemStockSummary {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  min_stock_threshold: number;
  is_perishable: boolean;
  total_stock: number;
  active_batch_count: number;
  earliest_expiry?: string | null;
  is_low_stock: boolean;
  batches?: ItemBatch[];
}

