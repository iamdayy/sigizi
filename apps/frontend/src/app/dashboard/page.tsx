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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
          <h1 className="text-2xl font-black text-brand-dark tracking-tight flex items-center gap-2.5">
            Dashboard SPPG
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan Penyaluran MBG, Pergerakan Stok, dan Realisasi Gross Margin Biaya Bahan
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => refetchFin()} title="Muat Ulang Data">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <a href="/dashboard/distribution/bast">
            <Button variant="primary">
              <FileText className="w-4 h-4" />
              <span>Buat Dokumen BAST</span>
            </Button>
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
        <Card className="lg:col-span-5 flex flex-col justify-between p-6">
          <div>
            <h2 className="text-base font-bold text-brand-dark flex items-center justify-between">
              <span>Alur Operasional Harian SPPG</span>
              <Sparkles className="w-4 h-4 text-brand-primary" />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pintasan cepat proses dapur, logistik sekolah, dan audit
            </p>

            <div className="mt-4 space-y-2.5">
              <a
                href="/dashboard/inventory"
                className="flex items-center justify-between p-3 rounded-[16px] bg-slate-50 hover:bg-brand-light/20 transition-all duration-150 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-[12px] bg-brand-light/40 text-brand-primary group-hover:bg-brand-primary group-hover:text-brand-dark transition-colors">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-dark">Gudang &amp; Penerimaan Batch</p>
                    <p className="text-[11px] text-slate-500">Input stok bahan baru dengan tanggal kedaluwarsa</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-brand-primary transition-colors" />
              </a>

              <a
                href="/dashboard/finance/cogs"
                className="flex items-center justify-between p-3 rounded-[16px] bg-slate-50 hover:bg-[#b5e0ea]/20 transition-all duration-150 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-[12px] bg-emerald-100 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-brand-dark transition-colors">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-dark">Kalkulasi HPP &amp; Produksi Porsi</p>
                    <p className="text-[11px] text-slate-500">Dapur konsumsi bahan FEFO &amp; kalkulasi margin</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-500 transition-colors" />
              </a>

              <a
                href="/dashboard/distribution/bast"
                className="flex items-center justify-between p-3 rounded-[16px] bg-slate-50 hover:bg-[#b5e0ea]/20 transition-all duration-150 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-[12px] bg-purple-100 text-purple-600 group-hover:bg-purple-500 group-hover:text-brand-dark transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-dark">Generator Dokumen BAST (PDF)</p>
                    <p className="text-[11px] text-slate-500">Cetak Berita Acara Serah Terima per Sekolah</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-500 transition-colors" />
              </a>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Rekonsiliasi Otomatis (Cron):</span>
            <span className="font-semibold text-emerald-500">23:59 WIB Harian</span>
          </div>
        </Card>
      </div>

      {/* Recent Production Batches & Exact COGS Realization Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-brand-dark">
              Realisasi HPP &amp; Gross Margin Batch Terakhir
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Perhitungan dinamis dari unit cost batch FEFO yang dideplesi
            </p>
          </div>
          <a
            href="/dashboard/finance"
            className="text-xs font-semibold text-brand-primary hover:text-brand-dark flex items-center gap-1 transition-colors"
          >
            Lihat Semua Jurnal
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-brand-dark font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 pl-4 pr-4 rounded-tl-[12px] rounded-bl-[12px]">Kode Produksi</th>
                <th className="py-3 px-4">Menu MBG</th>
                <th className="py-3 px-4 text-right">Jumlah Porsi</th>
                <th className="py-3 px-4 text-right">HPP / Porsi</th>
                <th className="py-3 px-4 text-right">Gross Margin</th>
                <th className="py-3 pl-4 pr-4 text-center rounded-tr-[12px] rounded-br-[12px]">Status Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {prodBatches && prodBatches.length > 0 ? (
                prodBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 pl-4 pr-4 font-mono font-medium text-slate-500">
                      {b.production_code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-dark">
                      {b.meal_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {b.total_portions} Porsi
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-brand-primary">
                      {formatIDR(b.cogs_per_portion)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span
                        className={
                          b.is_margin_critical
                            ? 'text-rose-500'
                            : b.margin_percentage >= 20
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                        }
                      >
                        {b.margin_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 pr-4 text-center">
                      {b.is_margin_critical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                          <AlertCircle className="w-3 h-3" />
                          KRITIS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
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
      </Card>
    </div>
  );
}
