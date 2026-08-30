'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  ProductionBatch,
  MealProductionRequest,
  MealProductionResult,
  ItemStockSummary,
  FinancialDashboardStats,
  ApiResponse,
} from '@daydev/shared-types';
import { formatIDR, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ExportButton from '@/components/ui/ExportButton';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import {
  Calculator,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Utensils,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function ProductionCOGSPage() {
  const queryClient = useQueryClient();
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Form State for Meal Production
  const [productionForm, setProductionForm] = useState<MealProductionRequest>({
    meal_name: 'Menu Sehat Bergizi A (Nasi + Ayam + Telur + Sayur)',
    target_portions: 250,
    selling_price_per_portion: 15000,
    ingredients: [
      { item_id: '', qty_required: 25 },
      { item_id: '', qty_required: 15 },
    ],
    notes: 'Produksi harian batch pagi untuk 3 sekolah',
  });

  const [productionResult, setProductionResult] = useState<MealProductionResult | null>(null);

  // 1. Fetch Production Batches
  const {
    data: batches,
    isLoading: isBatchesLoading,
    refetch: refetchBatches,
  } = useQuery<ProductionBatch[]>({
    queryKey: ['production-batches'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ProductionBatch[]>>('/finance/production');
      return res.data.data;
    },
  });

  // 2. Fetch Dashboard Stats for Chart
  const { data: finStats } = useQuery<FinancialDashboardStats>({
    queryKey: ['financial-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<FinancialDashboardStats>>('/finance/dashboard');
      return res.data.data;
    },
  });

  // 3. Fetch Inventory Items for Ingredient Dropdown
  const { data: items } = useQuery<ItemStockSummary[]>({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ItemStockSummary[]>>('/inventory/items');
      return res.data.data;
    },
  });

  // Production Mutation
  const produceMutation = useMutation({
    mutationFn: async (payload: MealProductionRequest) => {
      const res = await apiClient.post<ApiResponse<MealProductionResult>>(
        '/finance/production',
        payload
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['production-batches'] });
      queryClient.invalidateQueries({ queryKey: ['financial-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setProductionResult(data);
    },
  });

  const addIngredientRow = () => {
    setProductionForm({
      ...productionForm,
      ingredients: [
        ...productionForm.ingredients,
        { item_id: items?.[0]?.id || '', qty_required: 10 },
      ],
    });
  };

  const removeIngredientRow = (index: number) => {
    setProductionForm({
      ...productionForm,
      ingredients: productionForm.ingredients.filter((_, i) => i !== index),
    });
  };

  const updateIngredientRow = (index: number, field: 'item_id' | 'qty_required', value: any) => {
    const updated = [...productionForm.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setProductionForm({ ...productionForm, ingredients: updated });
  };

  const chartData =
    finStats?.recent_cogs_trend?.map((t) => ({
      date: t.date.split('-').slice(1).join('/'),
      cogs: t.cogs_per_portion,
      margin: t.margin_percentage,
      meal: t.meal_name,
    })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-brand-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4" />
            <span>Manajemen Biaya & Dapur SPPG</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-dark tracking-tight">
            Produksi Makanan & Dynamic COGS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hitung Harga Pokok Produksi (HPP) secara otomatis berdasarkan unit cost batch bahan FEFO yang terpakai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButton filename="laporan-cogs-mbg.xlsx" label="Export Laporan COGS" />
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (items && items.length > 0) {
                setProductionForm((prev) => ({
                  ...prev,
                  ingredients: [
                    { item_id: items[0].id, qty_required: 20 },
                    { item_id: items[1]?.id || items[0].id, qty_required: 10 },
                  ],
                }));
              }
              setProductionResult(null);
              setIsProductionModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Proses Batch Dapur Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Total Porsi Terproduksi</span>
              <Utensils className="w-4 h-4 text-brand-primary" />
            </div>
            <p className="text-2xl font-bold text-brand-dark">
              {(finStats?.total_portions_produced || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Porsi makanan bergizi</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Rata-rata Margin Kotor</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {(finStats?.average_margin_percentage || 0).toFixed(1)}%
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Standar target &gt; 10%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Total Akumulasi HPP (COGS)</span>
              <Calculator className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-brand-dark">
              {formatIDR(finStats?.total_cogs || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Biaya aktual bahan habis pakai</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Batch Margin Kritis (&lt;10%)</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-600">
              {finStats?.critical_margin_batch_count || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Perlu efisiensi harga beli</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Tren COGS per Porsi */}
      <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-200 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-brand-dark">Tren HPP (COGS) per Porsi vs Margin</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historis fluktuasi biaya bahan baku terhadap plafon alokasi pemerintah (Rp 15.000)
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600">HPP / Porsi (Rp)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-600">Margin (%)</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cogsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value: any, name: any) => [
                  name === 'cogs' ? formatIDR(value) : `${value}%`,
                  name === 'cogs' ? 'HPP per Porsi' : 'Margin',
                ]}
              />
              <Area
                type="monotone"
                dataKey="cogs"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#cogsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Production Batches History Table */}
      <Card>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-brand-dark">Riwayat Batch Dapur & Kalkulasi HPP</h3>
          <span className="text-xs text-slate-500">{batches?.length || 0} batch selesai</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Batch</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Menu Makanan</TableHead>
              <TableHead>Porsi</TableHead>
              <TableHead>HPP / Porsi</TableHead>
              <TableHead>Total HPP</TableHead>
              <TableHead>Margin %</TableHead>
              <TableHead>Status Margin</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isBatchesLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-500">
                  Memuat riwayat batch produksi...
                </TableCell>
              </TableRow>
            ) : batches && batches.length > 0 ? (
              batches.map((b) => {
                const isExpanded = expandedBatchId === b.id;
                return (
                  <React.Fragment key={b.id}>
                    <TableRow>
                      <TableCell className="font-mono text-brand-primary font-semibold">
                        {b.production_code}
                      </TableCell>
                      <TableCell className="text-slate-500">{formatDate(b.production_date)}</TableCell>
                      <TableCell className="font-medium text-brand-dark">{b.meal_name}</TableCell>
                      <TableCell className="font-semibold">{b.total_portions} porsi</TableCell>
                      <TableCell className="font-semibold text-amber-300">
                        {formatIDR(b.cogs_per_portion)}
                      </TableCell>
                      <TableCell className="font-semibold text-brand-dark">
                        {formatIDR(b.total_cogs)}
                      </TableCell>
                      <TableCell className="font-black text-emerald-600">
                        {b.margin_percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {b.is_margin_critical ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-600 border border-rose-500/30">
                            KRITIS (&lt;10%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                            AMAN
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => setExpandedBatchId(isExpanded ? null : b.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Lihat Rincian Biaya"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-200">
                        <TableCell colSpan={9} className="p-4">
                          <div className="p-3 rounded-xl bg-white/80 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                              <span>Rincian Laba Kotor:</span>
                              <span className="text-emerald-600">
                                Laba Kotor Total: {formatIDR(b.total_gross_profit)} (
                                {formatIDR(b.gross_profit_per_portion)}/porsi)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Catatan: {b.notes || 'Diproduksi sesuai standar menu gizi seimbang BGN.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-500">
                  Belum ada batch produksi yang tercatat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL: PROSES BATCH DAPUR BARU */}
      <Modal
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
        title="Proses Batch Produksi Makanan & Kalkulasi FEFO"
        description="Pilih komposisi bahan baku yang akan dikonsumsi. Sistem otomatis mendeplete batch terdekat expired dan mengkalkulasi HPP."
        maxWidth="2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            produceMutation.mutate(productionForm);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Menu</label>
            <input
              type="text"
              required
              value={productionForm.meal_name}
              onChange={(e) => setProductionForm({ ...productionForm, meal_name: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Target Porsi Makanan
              </label>
              <input
                type="number"
                min="1"
                required
                value={productionForm.target_portions}
                onChange={(e) =>
                  setProductionForm({
                    ...productionForm,
                    target_portions: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Harga Jual Alokasi (IDR)
              </label>
              <input
                type="number"
                min="1000"
                required
                value={productionForm.selling_price_per_portion}
                onChange={(e) =>
                  setProductionForm({
                    ...productionForm,
                    selling_price_per_portion: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Dynamic Ingredient Selection Rows */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">
                Komposisi Bahan Baku (Stok Dapur)
              </label>
              <button
                type="button"
                onClick={addIngredientRow}
                className="text-[11px] font-semibold text-brand-primary hover:text-blue-300 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Bahan</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {productionForm.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <select
                      value={ing.item_id}
                      onChange={(e) => updateIngredientRow(idx, 'item_id', e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs text-brand-dark"
                      required
                    >
                      <option value="">Pilih Bahan...</option>
                      {items?.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stok: {item.total_stock} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="Qty"
                      value={ing.qty_required}
                      onChange={(e) =>
                        updateIngredientRow(idx, 'qty_required', parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs text-brand-dark"
                      required
                    />
                  </div>

                  {productionForm.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
            <input
              type="text"
              value={productionForm.notes}
              onChange={(e) => setProductionForm({ ...productionForm, notes: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
            />
          </div>

          {/* Real-time Calculation Result */}
          {productionResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Kalkulasi Berhasil! Batch #{productionResult.production_code}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div>
                  HPP per Porsi:{' '}
                  <strong className="text-brand-dark">
                    {formatIDR(productionResult.cogs_per_portion)}
                  </strong>
                </div>
                <div>
                  Margin Kotor:{' '}
                  <strong className="text-emerald-600">
                    {productionResult.margin_percentage.toFixed(1)}%
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsProductionModalOpen(false)}
            >
              Tutup
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={produceMutation.isPending}
            >
              {produceMutation.isPending ? 'Mengkalkulasi...' : 'Eksekusi Produksi & Deplete FEFO'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
