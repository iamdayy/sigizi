import { AuditModel } from './audit';
import { User } from './iam';

export type HygieneStatus = 'PASS' | 'FAIL' | 'PARTIAL';

export interface HygieneChecklist extends AuditModel {
  inspection_date: string;
  inspector_id: string;
  inspector?: User;
  overall_status: HygieneStatus;
  building_sanitation: boolean;
  water_quality: boolean;
  waste_management: boolean;
  pest_control: boolean;
  personal_hygiene: boolean;
  food_storage_check: boolean;
  equipment_clean: boolean;
  notes?: string;
  correction_deadline?: string;
}

export interface CreateHygieneChecklistRequest {
  inspection_date: string;
  overall_status?: HygieneStatus;
  building_sanitation: boolean;
  water_quality: boolean;
  waste_management: boolean;
  pest_control: boolean;
  personal_hygiene: boolean;
  food_storage_check: boolean;
  equipment_clean: boolean;
  notes?: string;
  correction_deadline?: string;
}

export type TempLogSource = 'MANUAL' | 'IOT_SENSOR';

export interface TemperatureLog extends AuditModel {
  storage_area: string;
  source: TempLogSource;
  device_id?: string;
  recorded_at: string;
  temperature_cel: number;
  humidity_percent?: number;
  recorded_by_id?: string;
  recorded_by?: User;
  is_alert: boolean;
  alert_threshold: number;
  notes?: string;
}

export interface CreateTemperatureLogRequest {
  storage_area: string;
  source?: TempLogSource;
  device_id?: string;
  temperature_cel: number;
  humidity_percent?: number;
  alert_threshold?: number;
  notes?: string;
}

export type OrganolepticTestType = 'HANDOVER' | 'PRE_SERVING';

export interface OrganolepticTest extends AuditModel {
  test_date: string;
  test_type: OrganolepticTestType;
  production_batch_id?: string;
  meal_name: string;
  tester_id: string;
  tester?: User;
  appearance_score: number;
  aroma_score: number;
  taste_score: number;
  texture_score: number;
  overall_score: number;
  is_passed: boolean;
  notes?: string;
  photo_url?: string;
}

export interface CreateOrganolepticTestRequest {
  test_date: string;
  test_type: OrganolepticTestType;
  production_batch_id?: string;
  meal_name: string;
  appearance_score: number;
  aroma_score: number;
  taste_score: number;
  texture_score: number;
  notes?: string;
  photo_url?: string;
}

export interface FoodSample extends AuditModel {
  sample_date: string;
  meal_name: string;
  production_batch_id?: string;
  storage_location: string;
  retention_until: string;
  disposed_at?: string;
  collected_by_id: string;
  collected_by?: User;
  notes?: string;
}

export interface CreateFoodSampleRequest {
  sample_date: string;
  meal_name: string;
  production_batch_id?: string;
  storage_location: string;
  notes?: string;
}

export interface QCDashboardSummary {
  total_inspections_this_month: number;
  active_temp_alerts_count: number;
  average_organoleptic_score: number;
  active_retained_samples: number;
  recent_temp_logs: TemperatureLog[];
  recent_organoleptic_tests: OrganolepticTest[];
  pending_disposal_samples: FoodSample[];
}
