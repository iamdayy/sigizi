import { AuditModel } from './audit';

export type UserRole = 'ADMIN' | 'FINANCE' | 'WAREHOUSE';

export interface User extends AuditModel {
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  phone_number?: string;
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
}

