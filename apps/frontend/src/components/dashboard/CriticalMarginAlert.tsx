'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface CriticalMarginAlertProps {
  criticalCount: number;
}

export default function CriticalMarginAlert({ criticalCount }: CriticalMarginAlertProps) {
  if (criticalCount <= 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/80 via-rose-900/60 to-red-950/80 border border-red-500/40 p-5 shadow-xl shadow-red-950/40 mb-6 backdrop-blur-xl">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-red-100">
                Peringatan Margin Kritis MBG SPPG
              </h3>
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500 text-white shadow-sm">
                {criticalCount} Batch Terdeteksi
              </span>
            </div>
            <p className="text-xs text-red-200/90 mt-1 max-w-2xl leading-relaxed">
              Terdapat batch produksi makanan dengan gross margin di bawah batas aman regulasi (&lt; 10%). 
              Hal ini mengindikasikan lonjakan harga bahan baku pada batch FEFO yang dikonsumsi.
            </p>
          </div>
        </div>

        <a
          href="/dashboard/finance/cogs"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-lg shadow-red-500/25 transition-all duration-150 shrink-0"
        >
          <span>Audit HPP Bahan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
