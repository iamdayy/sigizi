'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginRequest, AuthResponse, ApiResponse } from '@daydev/shared-types';
import { apiClient } from './api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check initial auth state from localStorage
    try {
      const storedUser = localStorage.getItem('mbg_user');
      const token = localStorage.getItem('mbg_access_token');
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse stored user', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      const { access_token, refresh_token, user: loggedInUser } = res.data.data;

      localStorage.setItem('mbg_access_token', access_token);
      localStorage.setItem('mbg_refresh_token', refresh_token);
      localStorage.setItem('mbg_user', JSON.stringify(loggedInUser));

      setUser(loggedInUser);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('mbg_refresh_token');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      localStorage.removeItem('mbg_access_token');
      localStorage.removeItem('mbg_refresh_token');
      localStorage.removeItem('mbg_user');
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
