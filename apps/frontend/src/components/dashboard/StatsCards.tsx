'use client';

import React from 'react';
import { formatIDR } from '@/lib/utils';
import { Utensils, DollarSign, Boxes, TrendingUp, AlertTriangle } from 'lucide-react';

interface StatsCardsProps {
  totalPortions: number;
  totalRevenue: number;
  totalCOGS: number;
  totalGrossProfit: number;
  activeBatchCount: number;
  lowStockItemCount: number;
}

export default function StatsCards({
  totalPortions,
  totalRevenue,
  totalCOGS,
  totalGrossProfit,
  activeBatchCount,
  lowStockItemCount,
}: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Porsi MBG Diproduksi',
      value: `${totalPortions.toLocaleString('id-ID')} Porsi`,
      subtext: 'Bulan Berjalan',
      icon: Utensils,
      color: 'from-blue-600 to-indigo-600',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Total Alokasi Pendapatan',
      value: formatIDR(totalRevenue),
      subtext: 'Klaim Penyaluran SPPG',
      icon: DollarSign,
      color: 'from-emerald-600 to-teal-600',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Akumulasi Laba Kotor',
      value: formatIDR(totalGrossProfit),
      subtext: `COGS: ${formatIDR(totalCOGS)}`,
      icon: TrendingUp,
      color: 'from-purple-600 to-pink-600',
      iconColor: 'text-purple-400',
    },
    {
      title: 'Batch Aktif (FEFO Logistik)',
      value: `${activeBatchCount} Batch`,
      subtext: lowStockItemCount > 0 ? `${lowStockItemCount} bahan stok kritis` : 'Stok dalam batas aman',
      icon: Boxes,
      color: 'from-amber-600 to-orange-600',
      iconColor: 'text-amber-400',
      alert: lowStockItemCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-xl hover:border-slate-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {card.value}
              </p>
              <p className={`text-xs mt-1 ${card.alert ? 'text-rose-400 font-medium flex items-center gap-1' : 'text-slate-400'}`}>
                {card.alert && <AlertTriangle className="w-3 h-3" />}
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
