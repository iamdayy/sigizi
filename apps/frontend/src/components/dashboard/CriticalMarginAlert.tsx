'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface CriticalMarginAlertProps {
  criticalCount: number;
}

export default function CriticalMarginAlert({ criticalCount }: CriticalMarginAlertProps) {
  if (criticalCount <= 0) return null;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-rose-50 border border-rose-100 p-5 shadow-sm mb-6">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white border border-rose-100 rounded-[16px] text-rose-600 shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-rose-700">
                Peringatan Margin Kritis MBG SPPG
              </h3>
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-sm">
                {criticalCount} Batch Terdeteksi
              </span>
            </div>
            <p className="text-xs text-rose-600/90 mt-1 max-w-2xl leading-relaxed">
              Terdapat batch produksi makanan dengan gross margin di bawah batas aman regulasi (&lt; 10%). 
              Hal ini mengindikasikan lonjakan harga bahan baku pada batch FEFO yang dikonsumsi.
            </p>
          </div>
        </div>

        <Link href="/dashboard/finance/cogs">
          <Button variant="danger">
            <span>Audit HPP Bahan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
