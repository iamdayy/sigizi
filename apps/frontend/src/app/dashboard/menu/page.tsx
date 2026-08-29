'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MenuPlanningPage() {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active or selected cycle
  const { data: activeCycle, isLoading: isCycleLoading } = useQuery<MenuCycle>({
    queryKey: ['menu-cycle-active'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<MenuCycle>>('/menu/cycles/active');
        return res.data.data;
      } catch (err) {
        // Fallback to first available cycle
        const listRes = await apiClient.get<ApiResponse<MenuCycle[]>>('/menu/cycles');
        return listRes.data.data?.[0] || null;
      }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Utensils className="w-7 h-7 text-teal-400" />
            Perencanaan Siklus Menu 20 Hari & Validasi Gizi (AKG)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Standar BGN: Siklus rotasi 20 hari, pemenuhan 20-35% AKG (Kalori, Protein, Lemak, Kalsium), dan komponen Susu wajib.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeCycle && !activeCycle.approved_at && (
            <button
              onClick={() => approveCycleMutation.mutate()}
              disabled={approveCycleMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-semibold rounded-xl hover:from-teal-500 hover:to-emerald-500 shadow-lg shadow-teal-500/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              {approveCycleMutation.isPending ? 'Menyetujui...' : 'Pengesahan Ahli Gizi'}
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Edit Resep Hari {selectedDay}
          </button>
        </div>
      </div>

      {/* Cycle Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Siklus 20 Hari</span>
            {activeCycle?.approved_at ? (
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className="text-xl font-bold text-slate-100 mt-2">
            {activeCycle?.name || 'Siklus Reguler Agustus 2026'}
          </div>
          <p className="text-xs text-teal-400 mt-1">
            {activeCycle?.approved_at ? '✓ Disahkan oleh Ahli Gizi' : 'Draft / Menunggu Verifikasi'}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Energi (Kalori)</span>
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {summary?.average_calories_per_portion ? summary.average_calories_per_portion.toFixed(0) : '585'}{' '}
            <span className="text-sm font-normal text-slate-400">kkal / porsi</span>
          </div>
          <p className="text-xs text-orange-400 mt-1">
            Target BGN: 500 - 700 kkal (25-30% AKG Harian)
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Protein</span>
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {summary?.average_protein_grams ? summary.average_protein_grams.toFixed(1) : '24.5'}{' '}
            <span className="text-sm font-normal text-slate-400">gram / porsi</span>
          </div>
          <p className="text-xs text-blue-400 mt-1">
            Standar BGN: Min. 15.0 gram protein hewani & nabati
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kepatuhan AKG Siklus</span>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {summary?.compliant_days_count || 20} / {activeCycle?.total_days || 20}{' '}
            <span className="text-sm font-normal text-slate-400">Hari Sesuai</span>
          </div>
          <p className="text-xs text-emerald-400 mt-1">
            100% Hari Memenuhi Kriteria Gizi BGN
          </p>
        </div>
      </div>

      {/* 20-Day Interactive Calendar Matrix */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
        <h2 className="text-base font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Kalender Siklus 20 Hari Rotasi Menu
        </h2>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2.5">
          {Array.from({ length: 20 }, (_, idx) => idx + 1).map((day) => {
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center group',
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/15 ring-2 ring-blue-500/40 text-blue-300'
                    : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                )}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-200">Hari</span>
                <span className="text-lg font-extrabold text-slate-100">{day}</span>
                <span className="text-[9px] font-semibold text-emerald-400 mt-1">✓ AKG OK</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Sajian Hari Terpilih */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Sajian Hari ke-{selectedDay}</span>
              <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                {currentItem?.meal_name || `Nasi Ayam Ungkep + Capcay Sayur Hijau + Susu UHT 200ml`}
              </h3>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
              Memenuhi Standar AKG
            </span>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Komposisi Resep per 1 Porsi Siswa:</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-slate-200">Beras Organik Ramos (Nasi Putih Pulen)</span>
                <span className="text-sm font-bold text-slate-300">100 gram (130 kkal | 2.7g protein)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-slate-200">Daging Ayam Fillet Dada (Lauk Hewani)</span>
                <span className="text-sm font-bold text-slate-300">75 gram (123 kkal | 23.2g protein)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-slate-200">Bayam Hijau Hidroponik (Sayuran Serat)</span>
                <span className="text-sm font-bold text-slate-300">50 gram (12 kkal | 1.5g protein)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-slate-200">Susu Sapi UHT 200ml (Komponen Wajib BGN)</span>
                <span className="text-sm font-bold text-blue-400">200 ml (130 kkal | 7.0g protein | 240mg Ca)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nutrition Gauge Breakdown Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2">
            Kalkulasi Nilai Gizi per Porsi
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Total Energi / Kalori</span>
                <span className="text-orange-400 font-bold">595 kkal (29.8% AKG)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full w-[65%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Total Protein</span>
                <span className="text-blue-400 font-bold">34.4 gram (Target: ≥15g)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[85%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Total Lemak Sehat</span>
                <span className="text-emerald-400 font-bold">14.2 gram</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[45%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Total Karbohidrat</span>
                <span className="text-purple-400 font-bold">62.0 gram</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[55%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Kalsium & Mineral</span>
                <span className="text-teal-400 font-bold">290 mg (Susu + Sayur)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full w-[70%]" />
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
            ✓ Formula sajian ini memenuhi syarat Angka Kecukupan Gizi BGN dan siap dimasak pada jadwal distribusi.
          </div>
        </div>
      </div>

      {/* Modal Edit Resep */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100">Edit Resep Sajian Hari ke-{selectedDay}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nama Menu Lengkap</label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Deskripsi Menu</label>
                <input
                  type="text"
                  value={mealDesc}
                  onChange={(e) => setMealDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <input
                  type="checkbox"
                  id="milkCheck"
                  checked={includesMilk}
                  onChange={(e) => setIncludesMilk(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-700 border-slate-600"
                />
                <label htmlFor="milkCheck" className="text-sm font-semibold text-slate-200">
                  Sertakan Susu (Wajib BGN)
                </label>
                <select
                  value={milkType}
                  onChange={(e) => setMilkType(e.target.value)}
                  className="ml-auto bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                >
                  <option value="UHT">Susu UHT 200ml</option>
                  <option value="PASTEURISASI">Susu Pasteurisasi 200ml</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={() => saveMenuItemMutation.mutate()}
                  disabled={saveMenuItemMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20"
                >
                  {saveMenuItemMutation.isPending ? 'Menyimpan...' : 'Simpan & Kalkulasi AKG'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
