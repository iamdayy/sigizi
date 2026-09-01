'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
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
      title: 'Total Porsi Diproduksi',
      value: `${totalPortions.toLocaleString('id-ID')} Porsi`,
      subtext: 'Bulan Berjalan',
      icon: Utensils,
      color: 'from-blue-600 to-indigo-600',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Total Pendapatan',
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
      title: 'Batch Aktif',
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
          <Card
            key={idx}
            className="p-5 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-[16px] bg-brand-bg border-none ${card.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-brand-dark tracking-tight">
                {card.value}
              </p>
              <p className={`text-xs mt-1 ${card.alert ? 'text-rose-500 font-medium flex items-center gap-1' : 'text-slate-500'}`}>
                {card.alert && <AlertTriangle className="w-3 h-3" />}
                {card.subtext}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
