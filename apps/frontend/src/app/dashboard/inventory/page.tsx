'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  ItemStockSummary,
  StockMovement,
  CreateItemRequest,
  CreateBatchRequest,
  StockOutRequest,
  StockOutResult,
  ApiResponse,
  ItemCategory,
} from '@daydev/shared-types';
import { formatIDR, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ExportButton from '@/components/ui/ExportButton';
import {
  Boxes,
  Plus,
  PackagePlus,
  PackageMinus,
  History,
  AlertTriangle,
  Calendar,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [selectedItemForBatch, setSelectedItemForBatch] = useState<string>('');
  const [stockOutResult, setStockOutResult] = useState<StockOutResult | null>(null);

  // Form States
  const [newItem, setNewItem] = useState<CreateItemRequest>({
    sku: '',
    name: '',
    category: 'PROTEIN',
    unit: 'kg',
    min_stock_threshold: 10,
    is_perishable: true,
  });

  const [newBatch, setNewBatch] = useState<CreateBatchRequest>({
    item_id: '',
    batch_code: '',
    expiry_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unit_cost: 30000,
    quantity: 50,
    supplier_name: '',
  });

  const [stockOutForm, setStockOutForm] = useState<StockOutRequest>({
    item_id: '',
    requested_qty: 10,
    reference_type: 'MEAL_PRODUCTION',
    reference_id: 'PRD-MANUAL-' + Math.floor(1000 + Math.random() * 9000),
    notes: 'Pengeluaran uji coba stok FEFO',
  });

  // 1. Fetch Inventory Stock Items
  const {
    data: items,
    isLoading: isItemsLoading,
    refetch: refetchItems,
  } = useQuery<ItemStockSummary[]>({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ItemStockSummary[]>>('/inventory/items');
      return res.data.data;
    },
  });

  // 2. Fetch Stock Movements
  const {
    data: movements,
    isLoading: isMovementsLoading,
    refetch: refetchMovements,
  } = useQuery<StockMovement[]>({
    queryKey: ['inventory-movements'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<StockMovement[]>>('/inventory/movements');
      return res.data.data;
    },
  });

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: async (payload: CreateItemRequest) => {
      const res = await apiClient.post<ApiResponse<any>>('/inventory/items', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setIsItemModalOpen(false);
      setNewItem({
        sku: '',
        name: '',
        category: 'PROTEIN',
        unit: 'kg',
        min_stock_threshold: 10,
        is_perishable: true,
      });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (payload: CreateBatchRequest) => {
      const res = await apiClient.post<ApiResponse<any>>('/inventory/batches', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setIsBatchModalOpen(false);
    },
  });

  const stockOutMutation = useMutation({
    mutationFn: async (payload: StockOutRequest) => {
      const res = await apiClient.post<ApiResponse<StockOutResult>>('/inventory/stock-out', payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      setStockOutResult(data);
    },
  });

  // Filter items
  const filteredItems = items?.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalStockCount = items?.reduce((acc, curr) => acc + (curr.total_stock || 0), 0) || 0;
  const lowStockCount = items?.filter((item) => item.is_low_stock).length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4" />
            <span>Manajemen Logistik & Bahan Baku</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Inventaris & Pengeluaran FEFO
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pantau stok bahan makanan, prioritaskan batch terdekat expired (First Expired First Out), dan catat penerimaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButton filename="inventaris-sppg-mbg.xlsx" label="Export Data" />
          <button
            onClick={() => setIsItemModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all duration-150 active:scale-95"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Master Item Baru</span>
          </button>
          <button
            onClick={() => {
              if (items && items.length > 0) {
                setNewBatch((prev) => ({ ...prev, item_id: items[0].id }));
              }
              setIsBatchModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all duration-150 active:scale-95"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Terima Batch Baru</span>
          </button>
          <button
            onClick={() => {
              if (items && items.length > 0) {
                setStockOutForm((prev) => ({ ...prev, item_id: items[0].id }));
              }
              setStockOutResult(null);
              setIsStockOutModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20 transition-all duration-150 active:scale-95"
          >
            <PackageMinus className="w-4 h-4" />
            <span>Uji Stock-Out FEFO</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Master Item</span>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{items?.length || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Jenis bahan terdaftar di sistem</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Volume Stok Fisik</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalStockCount.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Akumulasi seluruh batch aktif</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Peringatan Stok Kritis</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{lowStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Di bawah batas minimum stok</p>
        </div>
      </div>

      {/* Navigation Tabs (Stock Overview vs Movement Log) */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'STOCK'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Daftar Stok Bahan & FEFO</span>
        </button>

        <button
          onClick={() => setActiveTab('MOVEMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'MOVEMENTS'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Mutasi / Pergerakan Stok</span>
        </button>
      </div>

      {/* TAB 1: STOCK VIEW */}
      {activeTab === 'STOCK' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari SKU atau nama bahan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['ALL', 'PROTEIN', 'CARBOHYDRATE', 'VEGETABLE', 'FRUIT', 'SPICE', 'OTHER'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua' : cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Items Grid */}
          {isItemsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 uppercase tracking-wider">
                        {item.sku}
                      </span>
                      <StatusBadge status={item.category} />
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{item.name}</h3>

                    <div className="flex items-baseline space-x-1.5 mt-3">
                      <span className="text-2xl font-black text-white">
                        {item.total_stock.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
                    </div>

                    {/* Stock Progress Bar against Minimum Threshold */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Min Threshold: {item.min_stock_threshold} {item.unit}</span>
                        {item.is_low_stock && (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Rendah
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.is_low_stock ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (item.total_stock / (item.min_stock_threshold * 3 || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Earliest Expiry (FEFO Trigger) */}
                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        FEFO Exp:{' '}
                        <strong className="text-slate-200">
                          {item.earliest_expiry ? formatDate(item.earliest_expiry) : 'Tidak ada'}
                        </strong>
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setNewBatch((prev) => ({ ...prev, item_id: item.id }));
                        setIsBatchModalOpen(true);
                      }}
                      title="Tambah Batch ke Item Ini"
                      className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 transition-all text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Batch</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Boxes}
              title="Tidak ada bahan makanan ditemukan"
              description="Belum ada item yang sesuai dengan kategori atau kata kunci pencarian."
              actionText="Tambah Master Item"
              onAction={() => setIsItemModalOpen(true)}
            />
          )}
        </div>
      )}

      {/* TAB 2: MOVEMENTS AUDIT LOG */}
      {activeTab === 'MOVEMENTS' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Log Transaksi & Pengeluaran FEFO</h3>
            <span className="text-xs text-slate-400">{movements?.length || 0} entri mutasi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">Waktu Mutasi</th>
                  <th className="p-3.5 font-semibold">Tipe</th>
                  <th className="p-3.5 font-semibold">Batch Code</th>
                  <th className="p-3.5 font-semibold">Quantity</th>
                  <th className="p-3.5 font-semibold">Unit Cost Snapshot</th>
                  <th className="p-3.5 font-semibold">Total Cost</th>
                  <th className="p-3.5 font-semibold">Referensi</th>
                  <th className="p-3.5 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isMovementsLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Memuat riwayat mutasi...
                    </td>
                  </tr>
                ) : movements && movements.length > 0 ? (
                  movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400">{formatDate(mov.created_at)}</td>
                      <td className="p-3.5">
                        <StatusBadge status={mov.movement_type} />
                      </td>
                      <td className="p-3.5 font-mono text-blue-400">
                        {mov.item_batch?.batch_code || '-'}
                      </td>
                      <td className="p-3.5 font-semibold text-white">
                        {mov.movement_type === 'OUT' ? '-' : '+'}
                        {mov.quantity}
                      </td>
                      <td className="p-3.5">{formatIDR(mov.unit_cost_snapshot)}</td>
                      <td className="p-3.5 font-semibold text-emerald-400">
                        {formatIDR(mov.total_cost_snapshot)}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {mov.reference_type} #{mov.reference_id}
                      </td>
                      <td className="p-3.5 text-slate-400">{mov.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Belum ada catatan mutasi stok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH MASTER ITEM */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title="Tambah Master Bahan Makanan"
        description="Daftarkan jenis bahan baku baru untuk SPPG."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createItemMutation.mutate(newItem);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Kode SKU</label>
            <input
              type="text"
              required
              placeholder="Contoh: SKU-AYAM-01"
              value={newItem.sku}
              onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Bahan Baku</label>
            <input
              type="text"
              required
              placeholder="Contoh: Daging Ayam Broiler Fillet"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori</label>
              <select
                value={newItem.category}
                onChange={(e) =>
                  setNewItem({ ...newItem, category: e.target.value as ItemCategory })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="PROTEIN">PROTEIN</option>
                <option value="CARBOHYDRATE">CARBOHYDRATE</option>
                <option value="VEGETABLE">VEGETABLE</option>
                <option value="FRUIT">FRUIT</option>
                <option value="SPICE">SPICE</option>
                <option value="DAIRY">DAIRY</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Satuan Ukur</label>
              <input
                type="text"
                required
                placeholder="kg, liter, butir, ikat"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Batas Minimum Stok
              </label>
              <input
                type="number"
                min="1"
                value={newItem.min_stock_threshold}
                onChange={(e) =>
                  setNewItem({ ...newItem, min_stock_threshold: parseFloat(e.target.value) || 0 })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItem.is_perishable}
                  onChange={(e) => setNewItem({ ...newItem, is_perishable: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <span>Mudah Kedaluwarsa (Perishable)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createItemMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              {createItemMutation.isPending ? 'Menyimpan...' : 'Simpan Master Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TERIMA BATCH BARU */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Penerimaan Batch Stok Bahan Baku"
        description="Catat kedatangan stok baru beserta tanggal kadaluarsa dan harga beli lot."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBatchMutation.mutate(newBatch);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pilih Master Bahan
            </label>
            <select
              value={newBatch.item_id}
              onChange={(e) => setNewBatch({ ...newBatch, item_id: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              required
            >
              {items?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name} (Satuan: {item.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kode Batch (Opsional)
              </label>
              <input
                type="text"
                placeholder="Auto jika kosong"
                value={newBatch.batch_code}
                onChange={(e) => setNewBatch({ ...newBatch, batch_code: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tanggal Kadaluarsa (FEFO)
              </label>
              <input
                type="date"
                required
                value={newBatch.expiry_date}
                onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jumlah Diterima (Qty)
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={newBatch.quantity}
                onChange={(e) =>
                  setNewBatch({ ...newBatch, quantity: parseFloat(e.target.value) || 0 })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Harga Pokok Per Satuan (IDR)
              </label>
              <input
                type="number"
                min="100"
                step="any"
                required
                value={newBatch.unit_cost}
                onChange={(e) =>
                  setNewBatch({ ...newBatch, unit_cost: parseFloat(e.target.value) || 0 })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Supplier / Peternak / Pasar
            </label>
            <input
              type="text"
              placeholder="Contoh: PT Sumber Pangan Segar"
              value={newBatch.supplier_name}
              onChange={(e) => setNewBatch({ ...newBatch, supplier_name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createBatchMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              {createBatchMutation.isPending ? 'Menyimpan...' : 'Simpan Batch Masuk'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: UJI STOCK-OUT FEFO */}
      <Modal
        isOpen={isStockOutModalOpen}
        onClose={() => setIsStockOutModalOpen(false)}
        title="Uji Coba Pengeluaran Stok FEFO"
        description="Simulasikan pemakaian stok bahan dengan algoritma FEFO (First Expired First Out)."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            stockOutMutation.mutate(stockOutForm);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pilih Bahan Baku
            </label>
            <select
              value={stockOutForm.item_id}
              onChange={(e) => setStockOutForm({ ...stockOutForm, item_id: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              required
            >
              {items?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name} (Stok: {item.total_stock} {item.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jumlah Dikeluarkan (Qty)
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={stockOutForm.requested_qty}
                onChange={(e) =>
                  setStockOutForm({
                    ...stockOutForm,
                    requested_qty: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ID Referensi
              </label>
              <input
                type="text"
                required
                value={stockOutForm.reference_id}
                onChange={(e) =>
                  setStockOutForm({ ...stockOutForm, reference_id: e.target.value })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan</label>
            <input
              type="text"
              value={stockOutForm.notes}
              onChange={(e) => setStockOutForm({ ...stockOutForm, notes: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Allocation Result Display */}
          {stockOutResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Stok Berhasil Dikeluarkan dengan FEFO!</span>
              </div>
              <p className="text-xs text-slate-300">
                Total Biaya Terhitung:{' '}
                <strong className="text-white">{formatIDR(stockOutResult.total_cost)}</strong>
              </p>
              <div className="text-[11px] text-slate-400 space-y-1">
                {stockOutResult.allocations?.map((alloc, idx) => (
                  <div key={idx} className="flex justify-between font-mono bg-slate-950/60 p-2 rounded">
                    <span>
                      {alloc.batch_code} (Exp: {formatDate(alloc.expiry_date)})
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {alloc.depleted_qty} qty @ {formatIDR(alloc.unit_cost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsStockOutModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={stockOutMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20"
            >
              {stockOutMutation.isPending ? 'Memproses...' : 'Eksekusi Pengeluaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
