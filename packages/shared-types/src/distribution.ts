import { AuditModel } from './audit';

export type DistributionPointType = 'SCHOOL' | 'POSYANDU' | 'PESANTREN';
export type EducationLevel = 'PAUD' | 'SD' | 'SMP' | 'SMA' | 'SMK' | 'SLB' | 'NONE';
export type PackageType = 'FOOD_TRAY' | 'TOTEBAG';

export interface DistributionPoint extends AuditModel {
  npsn?: string; // NPSN (School only)
  name: string;
  type: DistributionPointType;
  education_level?: EducationLevel;
  address: string;
  district: string;
  city: string;
  contact_person: string;
  phone_number: string;
  total_recipients: number;
  total_students?: number; // backward compat alias
  dietary_notes?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

// For backward compatibility
export type School = DistributionPoint;

export interface CreateDistributionPointRequest {
  npsn?: string;
  name: string;
  type: DistributionPointType;
  education_level?: EducationLevel;
  address: string;
  district: string;
  city: string;
  contact_person: string;
  phone_number: string;
  total_recipients: number;
  total_students?: number; // backward compat alias
  dietary_notes?: string;
  latitude?: number;
  longitude?: number;
}

export type CreateSchoolRequest = CreateDistributionPointRequest;

export type DistributionStatus = 'SCHEDULED' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'REJECTED';

export interface CreateDistributionItemRequest {
  menu_item_id?: string;
  meal_name: string;
  portions_sent: number;
  unit_price?: number;
}

export interface CreateDistributionRequest {
  distribution_point_id: string;
  delivery_date: string;
  package_type?: PackageType;
  is_holiday_delivery?: boolean;
  driver_name: string;
  vehicle_plate: string;
  items: CreateDistributionItemRequest[];
  notes?: string;
}

export interface UpdateDistributionStatusRequest {
  status: DistributionStatus;
  recipient_name?: string;
  recipient_title?: string;
  proof_of_delivery_url?: string;
  items?: { item_id: string; portions_received: number }[];
  notes?: string;
}

export interface DistributionItem extends AuditModel {
  distribution_id: string;
  menu_item_id?: string;
  meal_name: string;
  portions_sent: number;
  portions_received: number;
  unit_price: number;
  subtotal: number;
}

export interface Distribution extends AuditModel {
  delivery_number: string;
  distribution_point_id: string;
  distribution_point?: DistributionPoint;
  school?: DistributionPoint; // backward compatibility
  delivery_date: string; // YYYY-MM-DD
  status: DistributionStatus;
  package_type: PackageType;
  is_holiday_delivery: boolean;
  driver_name: string;
  vehicle_plate: string;
  total_portions: number;
  total_value: number;
  recipient_name?: string;
  recipient_title?: string;
  received_at?: string;
  proof_of_delivery_url?: string;
  notes?: string;
  items: DistributionItem[];
}

export interface BASTDocument extends AuditModel {
  document_number: string;
  distribution_point_id: string;
  distribution_point?: DistributionPoint;
  school?: DistributionPoint; // backward compat
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  total_portions: number;
  total_amount: number;
  file_url: string;
  file_size_bytes?: number;
  generated_at: string;
  sppg_head_name: string;
  recipient_representative_name: string;
  school_principal_name?: string; // backward compat
  status: 'GENERATED' | 'SIGNED' | 'ARCHIVED';
}

export interface BASTGenerateRequest {
  distribution_point_id?: string;
  school_id?: string; // backward compat
  period_start: string;
  period_end: string;
  sppg_head_name?: string;
  recipient_representative_name?: string;
  school_principal_name?: string; // backward compat
  official_notes?: string;
}

export interface BASTPreviewData {
  distribution_point: DistributionPoint;
  school?: DistributionPoint; // backward compat
  period_start: string;
  period_end: string;
  deliveries: Distribution[];
  total_deliveries: number;
  total_portions: number;
  total_amount: number;
}

export interface BASTDocumentResponse {
  id: string;
  document_number: string;
  distribution_point_id: string;
  distribution_point_name: string;
  school_id?: string; // backward compat
  school_name?: string; // backward compat
  period_start: string;
  period_end: string;
  total_portions: number;
  total_amount: number;
  file_url: string;
  file_size_bytes?: number;
  generated_at: string;
  sppg_head_name: string;
  recipient_representative_name: string;
  school_principal_name?: string; // backward compat
  status: 'GENERATED' | 'SIGNED' | 'ARCHIVED';
}
