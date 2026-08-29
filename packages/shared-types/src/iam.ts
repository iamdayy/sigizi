import { AuditModel } from './audit';

export type UserRole =
  | 'ADMIN'
  | 'FINANCE'
  | 'WAREHOUSE'
  | 'NUTRITIONIST'
  | 'QC'
  | 'DRIVER'
  | 'VOLUNTEER'
  | 'HEAD_SPPG';

export interface User extends AuditModel {
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone_number?: string;
  position?: string;
  nik?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon: string;
  badge?: string;
  roles: UserRole[];
}

export interface CreateUserRequest {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  position?: string;
  nik?: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'LEAVE';

export interface Attendance extends AuditModel {
  user_id: string;
  user?: User;
  date: string;
  status: AttendanceStatus;
  check_in: string;
  check_in_photo_url?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out?: string;
  check_out_photo_url?: string;
  check_out_latitude?: number;
  check_out_longitude?: number;
  work_shift?: string;
  notes?: string;
}

export interface CheckInRequest {
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  work_shift?: string;
  notes?: string;
}

export interface CheckOutRequest {
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}
