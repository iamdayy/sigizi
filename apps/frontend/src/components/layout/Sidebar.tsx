'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { NavigationItem, ApiResponse } from '@daydev/shared-types';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Boxes,
  Calculator,
  Receipt,
  Truck,
  FileText,
  Users,
  UtensilsCrossed,
  Utensils,
  ShieldCheck,
  FileSpreadsheet,
  UserCheck,
  Building2,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Boxes,
  Calculator,
  Receipt,
  Truck,
  FileText,
  Users,
  Utensils,
  ShieldCheck,
  FileSpreadsheet,
  UserCheck,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const { data: navItems, isLoading } = useQuery<NavigationItem[]>({
    queryKey: ['navigation', user?.role],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<NavigationItem[]>>('/navigation');
      return res.data.data;
    },
    enabled: !!user,
  });

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
      case 'HEAD_SPPG':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'FINANCE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'WAREHOUSE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'NUTRITIONIST':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'QC':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'DRIVER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'VOLUNTEER':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/25">
          <UtensilsCrossed className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base text-brand-dark tracking-tight flex items-center gap-1.5">
            MBG SPPG
            <span className="text-[10px] uppercase font-semibold bg-brand-light/50 text-brand-primary px-1.5 py-0.5 rounded border border-brand-light">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            Unit Jaksel 01
          </p>
        </div>
      </div>

      {/* Role Context Chip */}
      <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Otoritas Akses:</span>
          <span
            className={cn(
              'text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider',
              getRoleBadgeColor(user?.role)
            )}
          >
            {user?.role || 'MEMUAT'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          navItems?.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-[12px] text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-brand-light/40 text-brand-primary font-semibold'
                    : 'text-slate-500 hover:text-brand-primary hover:bg-slate-50'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-brand-primary' : 'text-slate-400 group-hover:text-brand-primary'
                    )}
                  />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-light text-brand-primary">
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })
        )}
      </nav>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center space-x-2 text-xs text-emerald-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium">Sistem Terhubung</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Auto Recon: 23:59 WIB
        </p>
      </div>
    </aside>
  );
}
