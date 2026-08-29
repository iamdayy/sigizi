'use client';

import React from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { formatIDR } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';

interface MarginGaugeProps {
  marginPercentage: number;
  averageCOGSPerPortion: number;
  sellingPricePerPortion: number;
  totalRevenue: number;
  totalCOGS: number;
}

export default function MarginGauge({
  marginPercentage,
  averageCOGSPerPortion,
  sellingPricePerPortion,
  totalRevenue,
  totalCOGS,
}: MarginGaugeProps) {
  const isCritical = marginPercentage < 10;
  const isOptimal = marginPercentage >= 20;

  const chartData = [
    {
      name: 'Gross Margin',
      value: Math.min(Math.max(marginPercentage, 0), 100),
      fill: isCritical ? '#f43f5e' : isOptimal ? '#10b981' : '#f59e0b',
    },
  ];

  return (
    <Card className="p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-brand-dark flex items-center gap-2">
            Rasio Gross Margin Dinamis (FEFO)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dihitung berdasarkan realisasi biaya batch bahan terpakai
          </p>
        </div>
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isCritical
              ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
              : isOptimal
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}
        >
          {isCritical ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>KRITIS (&lt; 10%)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isOptimal ? 'OPTIMAL' : 'MODERAT'}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Radial Chart Gauge */}
        <div className="lg:col-span-5 h-56 flex flex-col items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              barSize={18}
              data={chartData}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: '#f1f5f9' }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-2 text-center">
            <span className="text-3xl font-extrabold tracking-tight text-brand-dark">
              {marginPercentage.toFixed(1)}%
            </span>
            <span className="block text-[11px] font-medium text-slate-500">
              Rata-rata Margin
            </span>
          </div>

          <div className="flex justify-between w-full px-6 text-[11px] text-slate-500 font-semibold -mt-6">
            <span>0%</span>
            <span className="text-rose-500">Batas 10%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Detailed Metrics Breakdown */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="p-3.5 rounded-[16px] bg-brand-bg flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">
                Alokasi Porsi APBN MBG
              </span>
              <p className="text-sm font-bold text-brand-dark">
                {formatIDR(sellingPricePerPortion || 15000)} / porsi
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">
                HPP Aktual (COGS)
              </span>
              <p className="text-sm font-bold text-amber-500">
                {formatIDR(averageCOGSPerPortion)} / porsi
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-[16px] bg-brand-bg flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">
                Akumulasi Pendapatan Alokasi
              </span>
              <p className="text-sm font-bold text-brand-primary">
                {formatIDR(totalRevenue)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">
                Akumulasi Beban Bahan (COGS)
              </span>
              <p className="text-sm font-bold text-brand-dark">
                {formatIDR(totalCOGS)}
              </p>
            </div>
          </div>

          {/* Regulatory Notice */}
          <div className="text-[11px] text-slate-500 flex items-center gap-2 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0"></span>
            Standar BGN: Ambang batas margin minimum 10% menjamin keberlanjutan unit SPPG.
          </div>
        </div>
      </div>
    </Card>
  );
}
