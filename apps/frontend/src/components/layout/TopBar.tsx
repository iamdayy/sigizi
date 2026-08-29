'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { LogOut, User as UserIcon, Calendar, Clock, Bell } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TopBar() {
  const { user, logout } = useAuth();
  const todayStr = new Date().toISOString();

  return (
    <header className="h-16 border-b border-slate-100 bg-white/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left Info: Current Date & Active SPPG Base */}
      <div className="flex items-center space-x-6 text-xs text-slate-500">
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <Calendar className="w-3.5 h-3.5 text-brand-primary" />
          <span className="text-brand-dark font-medium">{formatDate(todayStr)}</span>
        </div>
        <div className="hidden md:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <Clock className="w-3.5 h-3.5 text-brand-dark" />
          <span className="text-brand-dark font-medium">Zona Waktu: Asia/Jakarta (WIB)</span>
        </div>
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center space-x-4">
        {/* Notification Bell Dropdown */}
        <div className="relative group">
          <button
            title="Notifikasi & Peringatan Sistem"
            className="p-2 rounded-xl text-slate-500 hover:text-[#0071e4] hover:bg-slate-50 border border-slate-100 transition-all duration-150 relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {/* Dropdown Menu */}
          <div className="hidden group-hover:block absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-[16px] shadow-brand p-4 z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-brand-dark">Notifikasi SPPG</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-light/40 text-brand-primary">
                2 Baru
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs">
                <div className="flex items-center justify-between text-rose-600 font-semibold text-[11px]">
                  <span>Peringatan FEFO</span>
                  <span className="text-[10px] text-slate-400">10m lalu</span>
                </div>
                <p className="text-slate-600 text-[11px] mt-1">
                  Batch Daging Ayam (BATCH-CHK-01) kedaluwarsa dalam 3 hari.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-brand-light/20 border border-brand-light/30 text-xs">
                <div className="flex items-center justify-between text-brand-primary font-semibold text-[11px]">
                  <span>Rekonsiliasi Otomatis</span>
                  <span className="text-[10px] text-slate-400">23:59 WIB</span>
                </div>
                <p className="text-slate-600 text-[11px] mt-1">
                  Rekonsiliasi harian terjadwal otomatis setiap 23:59 WIB.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Info Capsule */}
        <div className="flex items-center space-x-3 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-brand-light/50 flex items-center justify-center text-brand-primary font-semibold text-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-brand-dark leading-tight">
              {user?.full_name}
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          title="Keluar dari Sistem"
          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
