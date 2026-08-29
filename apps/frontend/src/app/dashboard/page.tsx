'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  FinancialDashboardStats,
  ItemStockSummary,
  ApiResponse,
  ProductionBatch
} from '@daydev/shared-types';
import StatsCards from '@/components/dashboard/StatsCards';
import MarginGauge from '@/components/dashboard/MarginGauge';
import CriticalMarginAlert from '@/components/dashboard/CriticalMarginAlert';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  FileText,
  Truck,
  Boxes,
  Calculator,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  // 1. Fetch Financial Dashboard Metrics
  const {
    data: finStats,
    isLoading: isFinLoading,
    refetch: refetchFin,
  } = useQuery<FinancialDashboardStats>({
    queryKey: ['financial-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<FinancialDashboardStats>>('/finance/dashboard');
      return res.data.data;
    },
  });

  // 2. Fetch Inventory Stock for Low-Stock alerts
  const { data: stockItems } = useQuery<ItemStockSummary[]>({
    queryKey: ['inventory-stock'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ItemStockSummary[]>>('/inventory/items');
      return res.data.data;
    },
  });

  // 3. Fetch Recent Production Batches
  const { data: prodBatches } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ProductionBatch[]>>('/finance/production?limit=5');
      return res.data.data;
    },
  });

  const lowStockCount = stockItems?.filter((item) => item.is_low_stock).length || 0;
  const activeBatchesCount =
    stockItems?.reduce((acc, curr) => acc + curr.active_batch_count, 0) || 0;

  const totalPortions = finStats?.total_portions_produced || 1250;
  const totalRevenue = finStats?.total_revenue || 18750000;
  const totalCOGS = finStats?.total_cogs || 14250000;
  const totalGrossProfit = finStats?.total_gross_profit || 4500000;
  const avgMargin = finStats?.average_margin_percentage || 24.0;
  const criticalCount = finStats?.critical_margin_batch_count || 0;

  const avgCOGSPerPortion = totalPortions > 0 ? totalCOGS / totalPortions : 11400;

  return (
    <div className="space-y-6">
      {/* Page Header with Real-time Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            Dashboard Operasional &amp; Keuangan SPPG
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Live Real-Time
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pemantauan Penyaluran MBG, Pergerakan Stok FEFO, dan Realisasi Gross Margin Biaya Bahan
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchFin()}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/dashboard/distribution/bast"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all duration-150"
          >
            <FileText className="w-4 h-4" />
            <span>Buat Dokumen BAST</span>
          </a>
        </div>
      </div>

      {/* Critical Gross Margin Alert (< 10%) */}
      <CriticalMarginAlert criticalCount={criticalCount} />

      {/* Key Metrics Cards */}
      <StatsCards
        totalPortions={totalPortions}
        totalRevenue={totalRevenue}
        totalCOGS={totalCOGS}
        totalGrossProfit={totalGrossProfit}
        activeBatchCount={activeBatchesCount}
        lowStockItemCount={lowStockCount}
      />

      {/* Main Charts & FEFO Gauge Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamic Margin Gauge */}
        <div className="lg:col-span-7">
          <MarginGauge
            marginPercentage={avgMargin}
            averageCOGSPerPortion={avgCOGSPerPortion}
            sellingPricePerPortion={15000}
            totalRevenue={totalRevenue}
            totalCOGS={totalCOGS}
          />
        </div>

        {/* SPPG Quick Management Panel */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center justify-between">
              <span>Alur Operasional Harian SPPG</span>
              <Sparkles className="w-4 h-4 text-blue-400" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pintasan cepat proses dapur, logistik sekolah, dan audit
            </p>

            <div className="mt-4 space-y-2.5">
              <a
                href="/dashboard/inventory"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-800/40 transition-all duration-150 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Gudang &amp; Penerimaan Batch</p>
                    <p className="text-[11px] text-slate-400">Input stok bahan baru dengan tanggal kedaluwarsa</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </a>

              <a
                href="/dashboard/finance/cogs"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-800/40 transition-all duration-150 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Kalkulasi HPP &amp; Produksi Porsi</p>
                    <p className="text-[11px] text-slate-400">Dapur konsumsi bahan FEFO &amp; kalkulasi margin</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </a>

              <a
                href="/dashboard/distribution/bast"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-800/40 transition-all duration-150 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Generator Dokumen BAST (PDF)</p>
                    <p className="text-[11px] text-slate-400">Cetak Berita Acara Serah Terima per Sekolah</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </a>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Rekonsiliasi Otomatis (Cron):</span>
            <span className="font-semibold text-emerald-400">23:59 WIB Harian</span>
          </div>
        </div>
      </div>

      {/* Recent Production Batches & Exact COGS Realization Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Realisasi HPP &amp; Gross Margin Batch Terakhir
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Perhitungan dinamis dari unit cost batch FEFO yang dideplesi
            </p>
          </div>
          <a
            href="/dashboard/finance"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Lihat Semua Jurnal
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Kode Produksi</th>
                <th className="pb-3 px-4">Menu MBG</th>
                <th className="pb-3 px-4 text-right">Jumlah Porsi</th>
                <th className="pb-3 px-4 text-right">HPP / Porsi</th>
                <th className="pb-3 px-4 text-right">Gross Margin</th>
                <th className="pb-3 pl-4 text-center">Status Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {prodBatches && prodBatches.length > 0 ? (
                prodBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4 font-mono font-medium text-slate-400">
                      {b.production_code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      {b.meal_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {b.total_portions} Porsi
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-amber-300">
                      {formatIDR(b.cogs_per_portion)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span
                        className={
                          b.is_margin_critical
                            ? 'text-rose-400'
                            : b.margin_percentage >= 20
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {b.margin_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-center">
                      {b.is_margin_critical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          KRITIS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          SESUAI
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada batch produksi makanan hari ini. Silakan input pada menu Produksi &amp; COGS.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
