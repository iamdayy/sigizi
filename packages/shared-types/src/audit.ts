export interface AuditModel {
  id: string; // UUID v4
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
}
