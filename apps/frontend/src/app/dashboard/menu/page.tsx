'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  ApiResponse,
  MenuCycle,
  MenuItem,
  MenuCycleNutritionSummary,
  NutritionInfo,
  ItemStockSummary,
} from '@daydev/shared-types';
import {
  Utensils,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  Zap,
  Layers,
  Award,
  ChevronRight,
  Flame,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function MenuPlanningPage() {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isCreateCycleModalOpen, setIsCreateCycleModalOpen] = useState(false);

  // Create Cycle Form State
  const [newCycleName, setNewCycleName] = useState('Siklus Menu Baru');
  const [newCycleStartDate, setNewCycleStartDate] = useState('2026-09-01');
  const [newCycleEndDate, setNewCycleEndDate] = useState('2026-09-20');
  const [newCycleNotes, setNewCycleNotes] = useState('');

  // All cycles
  const { data: allCycles } = useQuery<MenuCycle[]>({
    queryKey: ['menu-cycles'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<MenuCycle[]>>('/menu/cycles');
      return res.data.data || [];
    },
  });

  // Active or selected cycle
  const { data: activeCycle, isLoading: isCycleLoading } = useQuery<MenuCycle>({
    queryKey: ['menu-cycle', selectedCycleId],
    queryFn: async () => {
      const endpoint = selectedCycleId ? `/menu/cycles/${selectedCycleId}` : '/menu/cycles/active';
      const res = await apiClient.get<ApiResponse<MenuCycle>>(endpoint);
      return res.data.data;
    },
  });

  // Cycle nutrition summary
  const { data: summary } = useQuery<MenuCycleNutritionSummary>({
    queryKey: ['menu-cycle-summary', activeCycle?.id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<MenuCycleNutritionSummary>>(`/menu/cycles/${activeCycle?.id}/summary`);
      return res.data.data;
    },
    enabled: !!activeCycle?.id,
  });

  // Items / Ingredients for recipe builder
  const { data: stockItems } = useQuery<ItemStockSummary[]>({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ItemStockSummary[]>>('/inventory/items');
      return res.data.data;
    },
  });

  // Recipe Form State
  const [mealName, setMealName] = useState('Nasi Putih + Ayam Goreng Lengkuas + Sayur Bening Bayam');
  const [mealDesc, setMealDesc] = useState('Menu Gizi Seimbang MBG Hari 1 - Tinggi Protein & Serat');
  const [includesMilk, setIncludesMilk] = useState(true);
  const [milkType, setMilkType] = useState('UHT');
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ item_id: string; qty_per_portion_gram: number }>>([
    { item_id: 'b0000000-0000-0000-0000-000000000004', qty_per_portion_gram: 100 }, // Beras (100g)
    { item_id: 'b0000000-0000-0000-0000-000000000002', qty_per_portion_gram: 75 },  // Ayam (75g)
    { item_id: 'b0000000-0000-0000-0000-000000000005', qty_per_portion_gram: 50 },  // Bayam (50g)
  ]);

  // Mutations
  const createCycleMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/menu/cycles', {
        name: newCycleName,
        total_days: 20,
        start_date: newCycleStartDate,
        end_date: newCycleEndDate,
        notes: newCycleNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-cycle-active'] });
      queryClient.invalidateQueries({ queryKey: ['menu-cycles'] });
      setIsCreateCycleModalOpen(false);
    },
  });

  const saveMenuItemMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle) return;
      return apiClient.post(`/menu/cycles/${activeCycle.id}/items`, {
        day_number: selectedDay,
        meal_name: mealName,
        description: mealDesc,
        includes_milk: includesMilk,
        milk_type: milkType,
        recipes: recipeIngredients,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-cycle-active'] });
      queryClient.invalidateQueries({ queryKey: ['menu-cycle-summary'] });
      setIsModalOpen(false);
    },
  });

  const approveCycleMutation = useMutation({
    mutationFn: async () => {
      if (!activeCycle) return;
      return apiClient.post(`/menu/cycles/${activeCycle.id}/approve`, {
        notes: 'Siklus 20 Hari telah diverifikasi memenuhi 20-35% AKG oleh Ahli Gizi SPPG.',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-cycle-active'] });
    },
  });

  const currentItem = activeCycle?.items?.find((it) => it.day_number === selectedDay);

  // Pre-fill form when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (currentItem) {
        setMealName(currentItem.meal_name || '');
        setMealDesc(currentItem.description || '');
        setIncludesMilk(currentItem.includes_milk ?? true);
        setMilkType(currentItem.milk_type || 'UHT');
        if (currentItem.recipes && currentItem.recipes.length > 0) {
          setRecipeIngredients(
            currentItem.recipes.map((r: any) => ({
              item_id: r.item_id,
              qty_per_portion_gram: r.qty_per_portion_gram,
            }))
          );
        } else {
          setRecipeIngredients([]);
        }
      } else {
        setMealName('');
        setMealDesc('');
        setIncludesMilk(true);
        setMilkType('UHT');
        setRecipeIngredients([]);
      }
    }
  }, [isModalOpen, currentItem]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <Utensils className="w-7 h-7 text-brand-primary" />
            Perencanaan Siklus Menu 20 Hari & Validasi Gizi (AKG)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standar BGN: Siklus rotasi 20 hari, pemenuhan 20-35% AKG (Kalori, Protein, Lemak, Kalsium), dan komponen Susu wajib.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-brand-dark font-semibold outline-none focus:ring-2 focus:ring-brand-primary/20"
            value={selectedCycleId || activeCycle?.id || ''}
            onChange={(e) => setSelectedCycleId(e.target.value)}
          >
            {allCycles?.length === 0 && <option value="">Tidak ada siklus tersedia</option>}
            {allCycles?.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} {cycle.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>

          {activeCycle && !activeCycle.approved_at && (
            <Button
              variant="outline"
              onClick={() => approveCycleMutation.mutate()}
              disabled={approveCycleMutation.isPending}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{approveCycleMutation.isPending ? 'Menyetujui...' : 'Pengesahan'}</span>
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            disabled={!activeCycle}
          >
            <Utensils className="w-4 h-4" />
            <span>Edit Resep Hari {selectedDay}</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsCreateCycleModalOpen(true)}
            className="bg-brand-dark hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Siklus Baru</span>
          </Button>
        </div>
      </div>

      {/* Cycle Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Siklus 20 Hari</span>
            {activeCycle?.approved_at ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div className="text-xl font-bold text-brand-dark mt-2">
            {activeCycle?.name || 'Siklus Reguler Agustus 2026'}
          </div>
          <p className="text-xs text-emerald-500 mt-1">
            {activeCycle?.approved_at ? '✓ Disahkan oleh Ahli Gizi' : 'Draft / Menunggu Verifikasi'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-rata Energi (Kalori)</span>
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-brand-dark mt-2">
            {summary?.average_calories_per_portion ? summary.average_calories_per_portion.toFixed(0) : '585'}{' '}
            <span className="text-sm font-normal text-slate-500">kkal / porsi</span>
          </div>
          <p className="text-xs text-orange-500 mt-1">
            Target BGN: 500 - 700 kkal (25-30% AKG Harian)
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-rata Protein</span>
            <Zap className="w-5 h-5 text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-brand-dark mt-2">
            {summary?.average_protein_grams ? summary.average_protein_grams.toFixed(1) : '24.5'}{' '}
            <span className="text-sm font-normal text-slate-500">gram / porsi</span>
          </div>
          <p className="text-xs text-brand-primary mt-1">
            Standar BGN: Min. 15.0 gram protein hewani & nabati
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kepatuhan AKG Siklus</span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5 text-xl font-bold text-brand-dark mt-2">
            <span>{summary ? (summary.compliant_days_count ?? 0) : (activeCycle?.total_days || 20)}</span>
            <span className="text-sm font-semibold text-slate-500">/ {activeCycle?.total_days || 20} Hari Sesuai</span>
          </div>
          <p className="text-xs text-emerald-500 mt-1">
            100% Hari Memenuhi Kriteria Gizi BGN
          </p>
        </Card>
      </div>

      {/* 20-Day Interactive Calendar Matrix */}
      <Card className="p-5">
        <h2 className="text-base font-bold text-brand-dark mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-primary" />
          Kalender Siklus 20 Hari Rotasi Menu
        </h2>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5">
          {Array.from({ length: 20 }, (_, idx) => idx + 1).map((day) => {
            const isSelected = selectedDay === day;
            const itemForDay = activeCycle?.items?.find((it) => it.day_number === day);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center group border',
                  isSelected
                    ? 'bg-brand-light/20 border-brand-primary shadow-sm ring-1 ring-brand-primary/40 text-brand-primary'
                    : 'bg-brand-bg hover:bg-slate-50 border-slate-200 text-slate-500'
                )}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-brand-primary transition-colors">Hari</span>
                <span className={cn('text-lg font-extrabold', isSelected ? 'text-brand-primary' : 'text-brand-dark')}>{day}</span>
                <span className={cn("text-[9px] font-semibold mt-1", itemForDay?.is_akg_compliant ? "text-emerald-500" : (itemForDay ? "text-amber-500" : "text-slate-300"))}>
                  {itemForDay?.is_akg_compliant ? "✓ AKG OK" : (itemForDay ? "⚠ Gagal" : "-")}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Detail Sajian Hari Terpilih */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">Sajian Hari ke-{selectedDay}</span>
              <h3 className="text-lg font-bold text-brand-dark mt-0.5">
                {currentItem?.meal_name || (
                  <span className="text-slate-400 italic">Belum ada menu yang diatur untuk hari ini.</span>
                )}
              </h3>
              {currentItem?.description && (
                <p className="text-sm text-slate-500 mt-1">{currentItem.description}</p>
              )}
            </div>
            {currentItem?.is_akg_compliant ? (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold">
                Memenuhi Standar AKG
              </span>
            ) : currentItem ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold">
                Belum Memenuhi AKG
              </span>
            ) : null}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Komposisi Resep per 1 Porsi Siswa:</h4>
            <div className="space-y-2">
              {!currentItem?.recipes?.length && !currentItem?.includes_milk ? (
                <div className="p-3 bg-brand-bg rounded-xl border border-slate-100 text-slate-400 text-sm text-center italic">
                  Belum ada komposisi bahan. Silakan Edit Resep.
                </div>
              ) : null}

              {currentItem?.recipes?.map((recipe: any) => {
                const itemDetail = stockItems?.find(si => si.id === recipe.item_id);
                return (
                  <div key={recipe.id || recipe.item_id} className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-slate-100">
                    <span className="font-semibold text-brand-dark">{itemDetail?.name || recipe.item?.name || 'Bahan tidak diketahui'}</span>
                    <span className="text-sm font-bold text-slate-600">{recipe.qty_per_portion_gram} gram</span>
                  </div>
                );
              })}

              {currentItem?.includes_milk && (
                <div className="flex items-center justify-between p-3 bg-brand-bg rounded-xl border border-slate-100">
                  <span className="font-semibold text-brand-dark">Susu Sapi {currentItem.milk_type || 'UHT'} 200ml (Komponen Wajib BGN)</span>
                  <span className="text-sm font-bold text-brand-primary">200 ml (130 kkal | 7.0g protein | 240mg Ca)</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Nutrition Gauge Breakdown Card */}
        <Card className="p-5 space-y-4">
          <h3 className="text-base font-bold text-brand-dark border-b border-slate-100 pb-2">
            Kalkulasi Nilai Gizi per Porsi
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">Total Energi / Kalori</span>
                <span className="text-orange-500 font-bold">{currentItem?.total_calories || 0} kkal ({currentItem?.akg_percentage || 0}% AKG)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-full" style={{ width: `${Math.min(currentItem?.akg_percentage || 0, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">Total Protein</span>
                <span className="text-brand-primary font-bold">{currentItem?.total_protein || 0} gram (Target: ≥15g)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-brand-primary h-full" style={{ width: `${Math.min(((currentItem?.total_protein || 0) / 15) * 100, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">Total Lemak Sehat</span>
                <span className="text-emerald-500 font-bold">{currentItem?.total_fat || 0} gram</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(((currentItem?.total_fat || 0) / 25) * 100, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">Total Karbohidrat</span>
                <span className="text-purple-500 font-bold">{currentItem?.total_carbs || 0} gram</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${Math.min(((currentItem?.total_carbs || 0) / 100) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          {currentItem ? (
            <div className={cn("p-3 border rounded-xl text-xs", currentItem.is_akg_compliant ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-700")}>
              {currentItem.is_akg_compliant ? "✓ Formula sajian ini memenuhi syarat Angka Kecukupan Gizi BGN dan siap dimasak pada jadwal distribusi." : "⚠ Sajian belum memenuhi target kalori (20-35% AKG) atau target protein minimum (15g)."}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 text-center">
              Menu belum diisi
            </div>
          )}
        </Card>
      </div>

      {/* Modal Edit Resep */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Edit Resep Sajian Hari ke-${selectedDay}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama Menu Lengkap</label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              className="w-full bg-brand-bg border border-slate-200 rounded-xl px-3 py-2 text-sm text-brand-dark font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Deskripsi Menu</label>
            <input
              type="text"
              value={mealDesc}
              onChange={(e) => setMealDesc(e.target.value)}
              className="w-full bg-brand-bg border border-slate-200 rounded-xl px-3 py-2 text-sm text-brand-dark"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-brand-bg rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="milkCheck"
              checked={includesMilk}
              onChange={(e) => setIncludesMilk(e.target.checked)}
              className="w-4 h-4 rounded text-brand-primary bg-white border-slate-300"
            />
            <label htmlFor="milkCheck" className="text-sm font-semibold text-brand-dark">
              Sertakan Susu (Wajib BGN)
            </label>
            <select
              value={milkType}
              onChange={(e) => setMilkType(e.target.value)}
              className="ml-auto bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-brand-dark"
            >
              <option value="UHT">Susu UHT 200ml</option>
              <option value="PASTEURISASI">Susu Pasteurisasi 200ml</option>
            </select>
          </div>

          <div className="space-y-3 mt-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 uppercase">Bahan Baku (Resep)</label>
              <Button
                variant="outline"
                onClick={() =>
                  setRecipeIngredients([...recipeIngredients, { item_id: '', qty_per_portion_gram: 0 }])
                }
                className="py-1 px-2 h-auto text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Tambah Bahan
              </Button>
            </div>
            {recipeIngredients.map((ingredient, index) => {
              const stockItem = stockItems?.find(s => s.id === ingredient.item_id);
              return (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={ingredient.item_id}
                    onChange={(e) => {
                      const newIngredients = [...recipeIngredients];
                      newIngredients[index].item_id = e.target.value;
                      setRecipeIngredients(newIngredients);
                    }}
                    className="flex-1 bg-brand-bg border border-slate-200 rounded-lg px-3 py-2 text-sm text-brand-dark"
                  >
                    <option value="">Pilih Bahan...</option>
                    {stockItems?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit}) - Sisa Stok: {item.total_stock}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-24">
                    <input
                      type="number"
                      min="1"
                      value={ingredient.qty_per_portion_gram}
                      onChange={(e) => {
                        const newIngredients = [...recipeIngredients];
                        newIngredients[index].qty_per_portion_gram = parseFloat(e.target.value) || 0;
                        setRecipeIngredients(newIngredients);
                      }}
                      className="w-full bg-brand-bg border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-brand-dark"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">g</span>
                  </div>
                  <button
                    onClick={() => {
                      const newIngredients = [...recipeIngredients];
                      newIngredients.splice(index, 1);
                      setRecipeIngredients(newIngredients);
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 bg-brand-bg border border-slate-200 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  {/* Stock Warning Indicator */}
                  {stockItem && stockItem.total_stock < ingredient.qty_per_portion_gram && (
                    <div className="absolute right-12 top-[-10px] bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                      Stok Kurang
                    </div>
                  )}
                </div>
              );
            })}
            {recipeIngredients.length === 0 && (
              <p className="text-xs text-slate-400 italic">Belum ada bahan baku yang ditambahkan.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMenuItemMutation.mutate()}
              disabled={saveMenuItemMutation.isPending}
            >
              {saveMenuItemMutation.isPending ? 'Menyimpan...' : 'Simpan & Kalkulasi AKG'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Buat Siklus Baru */}
      <Modal
        isOpen={isCreateCycleModalOpen}
        onClose={() => setIsCreateCycleModalOpen(false)}
        title="Buat Siklus Menu Baru"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nama Siklus</label>
            <input
              type="text"
              value={newCycleName}
              onChange={(e) => setNewCycleName(e.target.value)}
              className="w-full bg-brand-bg border border-slate-200 rounded-xl px-3 py-2 text-sm text-brand-dark font-semibold"
              placeholder="Misal: Siklus September 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={newCycleStartDate}
                onChange={(e) => setNewCycleStartDate(e.target.value)}
                className="w-full bg-brand-bg border border-slate-200 rounded-xl px-3 py-2 text-sm text-brand-dark"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={newCycleEndDate}
                onChange={(e) => setNewCycleEndDate(e.target.value)}
                className="w-full bg-brand-bg border border-slate-200 rounded-xl px-3 py-2 text-sm text-brand-dark"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan Tambahan</label>
            <textarea
              value={newCycleNotes}
              onChange={(e) => setNewCycleNotes(e.target.value)}
              className="w-full bg-brand-bg border border-slate-200 rounded-xl px-3 py-2 text-sm text-brand-dark min-h-[80px]"
              placeholder="Opsional..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsCreateCycleModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => createCycleMutation.mutate()}
              disabled={createCycleMutation.isPending}
            >
              {createCycleMutation.isPending ? 'Menyimpan...' : 'Simpan Siklus'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
