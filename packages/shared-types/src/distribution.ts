import { AuditModel } from './audit';

export interface School extends AuditModel {
  npsn: string; // Nomor Pokok Sekolah Nasional
  name: string;
  address: string;
  district: string;
  city: string;
  contact_person: string;
  phone_number: string;
  total_students: number;
  dietary_notes?: string;
  is_active: boolean;
}

export interface CreateSchoolRequest {
  npsn: string;
  name: string;
  address: string;
  district: string;
  city: string;
  contact_person: string;
  phone_number: string;
  total_students: number;
  dietary_notes?: string;
}

export type DistributionStatus = 'SCHEDULED' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'REJECTED';

export interface CreateDistributionItemRequest {
  meal_name: string;
  portions_sent: number;
  unit_price?: number;
}

export interface CreateDistributionRequest {
  school_id: string;
  delivery_date: string;
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
  portions_received?: number;
  notes?: string;
}

export interface DistributionItem extends AuditModel {
  distribution_id: string;
  meal_name: string;
  portions_sent: number;
  portions_received: number;
  unit_price: number;
  subtotal: number;
}

export interface Distribution extends AuditModel {
  delivery_number: string;
  school_id: string;
  delivery_date: string; // YYYY-MM-DD
  status: DistributionStatus;
  driver_name: string;
  vehicle_plate: string;
  total_portions: number;
  total_value: number;
  recipient_name?: string;
  recipient_title?: string;
  received_at?: string;
  proof_of_delivery_url?: string;
  notes?: string;
  school?: School;
  items: DistributionItem[];
}

export interface BASTDocument extends AuditModel {
  document_number: string; // e.g. "BAST/MBG/2026/08/001"
  school_id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  total_portions: number;
  total_amount: number;
  file_url: string;
  file_size_bytes?: number;
  generated_at: string;
  sppg_head_name: string;
  school_principal_name: string;
  status: 'GENERATED' | 'SIGNED' | 'ARCHIVED';
  school?: School;
}

export interface BASTGenerateRequest {
  school_id: string;
  period_start: string;
  period_end: string;
  sppg_head_name?: string;
  school_principal_name?: string;
  official_notes?: string;
}

export interface BASTPreviewData {
  school: School;
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
  school_id: string;
  school_name: string;
  period_start: string;
  period_end: string;
  total_portions: number;
  total_amount: number;
  file_url: string;
  file_size_bytes?: number;
  generated_at: string;
  sppg_head_name: string;
  school_principal_name: string;
  status: 'GENERATED' | 'SIGNED' | 'ARCHIVED';
}

