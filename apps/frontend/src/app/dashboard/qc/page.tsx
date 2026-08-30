'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  ApiResponse,
  QCDashboardSummary,
  HygieneChecklist,
  TemperatureLog,
  OrganolepticTest,
  FoodSample,
} from '@daydev/shared-types';
import {
  ShieldCheck,
  Thermometer,
  Sparkles,
  Archive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  Flame,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export default function QualityControlPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'hygiene' | 'temp' | 'organoleptic' | 'samples'>('hygiene');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Forms states
  const [tempArea, setTempArea] = useState('Chiller Susu Pasteur (≤ 4°C)');
  const [tempCel, setTempCel] = useState('3.2');
  const [tempNotes, setTempNotes] = useState('');

  const [orgMealName, setOrgMealName] = useState('Nasi Ayam Teriyaki + Sayur Capcay');
  const [orgTestType, setOrgTestType] = useState<'HANDOVER' | 'PRE_SERVING'>('PRE_SERVING');
  const [orgAppearance, setOrgAppearance] = useState(4);
  const [orgAroma, setOrgAroma] = useState(4);
  const [orgTaste, setOrgTaste] = useState(5);
  const [orgTexture, setOrgTexture] = useState(4);
  const [orgNotes, setOrgNotes] = useState('Aroma sedap, ayam matang merata, sayuran masih segar renyah.');

  // Fetch QC Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery<QCDashboardSummary>({
    queryKey: ['qc-summary'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<QCDashboardSummary>>('/qc/summary');
      return res.data.data;
    },
  });

  // Fetch Hygiene Checklists
  const { data: hygieneList, isLoading: isHygieneLoading } = useQuery<HygieneChecklist[]>({
    queryKey: ['qc-hygiene'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<HygieneChecklist[]>>('/qc/hygiene-checklists');
      return res.data.data;
    },
    enabled: activeTab === 'hygiene',
  });

  // Fetch Temperature Logs
  const { data: tempLogs, isLoading: isTempLoading } = useQuery<TemperatureLog[]>({
    queryKey: ['qc-temp'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<TemperatureLog[]>>('/qc/temperature-logs');
      return res.data.data;
    },
    enabled: activeTab === 'temp',
  });

  // Fetch Organoleptic Tests
  const { data: orgTests, isLoading: isOrgLoading } = useQuery<OrganolepticTest[]>({
    queryKey: ['qc-organoleptic'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<OrganolepticTest[]>>('/qc/organoleptic-tests');
      return res.data.data;
    },
    enabled: activeTab === 'organoleptic',
  });

  // Fetch Food Samples
  const { data: foodSamples, isLoading: isSamplesLoading } = useQuery<FoodSample[]>({
    queryKey: ['qc-samples'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<FoodSample[]>>('/qc/food-samples');
      return res.data.data;
    },
    enabled: activeTab === 'samples',
  });

  // Mutations
  const addTempMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/qc/temperature-logs', {
        storage_area: tempArea,
        temperature_cel: parseFloat(tempCel),
        alert_threshold: 4.0,
        notes: tempNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-temp'] });
      queryClient.invalidateQueries({ queryKey: ['qc-summary'] });
      setIsModalOpen(false);
      setTempNotes('');
    },
  });

  const addOrgMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/qc/organoleptic-tests', {
        test_date: new Date().toISOString().split('T')[0],
        test_type: orgTestType,
        meal_name: orgMealName,
        appearance_score: orgAppearance,
        aroma_score: orgAroma,
        taste_score: orgTaste,
        texture_score: orgTexture,
        notes: orgNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-organoleptic'] });
      queryClient.invalidateQueries({ queryKey: ['qc-summary'] });
      setIsModalOpen(false);
    },
  });

  const disposeSampleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/qc/food-samples/${id}/dispose`, {
        notes: 'Pemusnahan sampel retensi > 72 jam sesuai SOP BGN',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qc-samples'] });
      queryClient.invalidateQueries({ queryKey: ['qc-summary'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            Quality Control & Sertifikasi Keamanan Pangan (SLHS / HACCP)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standarisasi Laik Higiene Sanitasi BGN, pemantauan Cold Chain suhu susu/daging, uji organoleptik, dan retensi sampel 72 jam.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-brand-dark text-sm font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'temp' ? 'Catat Suhu Cold Chain' : activeTab === 'organoleptic' ? 'Uji Organoleptik Baru' : 'Input Catatan QC'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Higiene (SLHS)</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">TERVERIFIKASI</div>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            ✓ 7/7 Poin Sanitasi Memenuhi Syarat
          </p>
        </div>

        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cold Chain Alerts</span>
            <Thermometer className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {summary?.active_temp_alerts_count || 0} <span className="text-sm font-normal text-slate-500">Penyimpangan</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Batas Maksimal: ≤ 4.0°C untuk Susu & Daging
          </p>
        </div>

        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-rata Uji Rasa</span>
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {summary?.average_organoleptic_score ? summary.average_organoleptic_score.toFixed(1) : '4.5'} <span className="text-sm font-normal text-slate-500">/ 5.0</span>
          </div>
          <p className="text-xs text-amber-600 mt-1">
            Tampilan, Aroma, Rasa & Tekstur Optimal
          </p>
        </div>

        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sampel Pangan Retensi</span>
            <Archive className="w-5 h-5 text-brand-primary" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {summary?.active_retained_samples || 0} <span className="text-sm font-normal text-slate-500">Sampel Aktif</span>
          </div>
          <p className="text-xs text-brand-primary mt-1">
            Wajib disimpan 72 Jam (3 Hari)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('hygiene')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'hygiene'
              ? 'bg-slate-100 text-emerald-600 border border-emerald-500/30'
              : 'text-slate-500 hover:text-brand-dark'
          )}
        >
          Checklist Higiene & Sanitasi (SLHS)
        </button>
        <button
          onClick={() => setActiveTab('temp')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'temp'
              ? 'bg-slate-100 text-rose-600 border border-rose-500/30'
              : 'text-slate-500 hover:text-brand-dark'
          )}
        >
          Log Suhu Cold Chain & IoT
        </button>
        <button
          onClick={() => setActiveTab('organoleptic')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'organoleptic'
              ? 'bg-slate-100 text-amber-600 border border-amber-500/30'
              : 'text-slate-500 hover:text-brand-dark'
          )}
        >
          Uji Organoleptik (Rasa & Kualitas)
        </button>
        <button
          onClick={() => setActiveTab('samples')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'samples'
              ? 'bg-slate-100 text-brand-primary border border-brand-primary/20'
              : 'text-slate-500 hover:text-brand-dark'
          )}
        >
          Retensi Sampel Pangan (3 Hari)
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'hygiene' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Log Riwayat Checklist Higiene Sanitasi Bangunan & Pengolah</h2>
            <span className="text-xs text-slate-500">Standar Permenkes & Juknis SPPG BGN</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Pengawas Sanitasi</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Air Bersih</th>
                  <th className="p-3">Pest Control</th>
                  <th className="p-3">Personal Hygiene</th>
                  <th className="p-3">Penyimpanan Bahan</th>
                  <th className="p-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hygieneList && hygieneList.length > 0 ? (
                  hygieneList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-100">{item.inspection_date}</td>
                      <td className="p-3">{item.inspector?.full_name || 'Rahmat Hidayat (QC)'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                          {item.overall_status}
                        </span>
                      </td>
                      <td className="p-3">{item.water_quality ? '✓ Sesuai' : '✗ Tidak'}</td>
                      <td className="p-3">{item.pest_control ? '✓ Aman' : '✗ Ditemukan hama'}</td>
                      <td className="p-3">{item.personal_hygiene ? '✓ Celemek & Sarung Tangan Lengkap' : '✗ Kurang'}</td>
                      <td className="p-3">{item.food_storage_check ? '✓ FEFO & Suhu Tepat' : '✗ Bermasalah'}</td>
                      <td className="p-3 text-slate-500 text-xs">{item.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Belum ada catatan inspeksi higiene.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'temp' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Log Suhu Cold Chain Penyimpanan Susu & Protein</h2>
            <span className="text-xs text-slate-500">Mendukung input Manual & Sensor IoT Automatis</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Waktu Pencatatan</th>
                  <th className="p-3">Area Penyimpanan</th>
                  <th className="p-3">Suhu Terukur</th>
                  <th className="p-3">Batas Maksimal</th>
                  <th className="p-3">Metode Input</th>
                  <th className="p-3">Status Keamanan</th>
                  <th className="p-3">Petugas</th>
                  <th className="p-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tempLogs && tempLogs.length > 0 ? (
                  tempLogs.map((log) => (
                    <tr key={log.id} className={cn('hover:bg-slate-50', log.is_alert && 'bg-rose-500/10')}>
                      <td className="p-3 font-medium text-slate-100">
                        {new Date(log.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>
                      <td className="p-3 font-semibold">{log.storage_area}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'text-base font-bold',
                            log.is_alert ? 'text-rose-600' : 'text-emerald-600'
                          )}
                        >
                          {log.temperature_cel}°C
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">≤ {log.alert_threshold}°C</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200">
                          {log.source}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.is_alert ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <AlertTriangle className="w-3.5 h-3.5" /> SUHU TINGGI (ALERT)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> AMAN (COLD CHAIN OK)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-xs">{log.recorded_by?.full_name || 'Petugas QC'}</td>
                      <td className="p-3 text-slate-500 text-xs">{log.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Belum ada pencatatan suhu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'organoleptic' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Hasil Uji Organoleptik (Uji Cita Rasa & Kualitas Sajian)</h2>
            <span className="text-xs text-slate-500">Wajib diuji sebelum didistribusikan ke sekolah</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Tanggal & Tipe</th>
                  <th className="p-3">Menu Sajian</th>
                  <th className="p-3">Tampilan</th>
                  <th className="p-3">Aroma</th>
                  <th className="p-3">Rasa</th>
                  <th className="p-3">Tekstur</th>
                  <th className="p-3">Skor Rata-rata</th>
                  <th className="p-3">Kelayakan Santap</th>
                  <th className="p-3">Catatan Sensorik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgTests && orgTests.length > 0 ? (
                  orgTests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-100">
                        <div>{t.test_date}</div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">{t.test_type}</span>
                      </td>
                      <td className="p-3 font-bold text-brand-dark">{t.meal_name}</td>
                      <td className="p-3">{t.appearance_score} / 5</td>
                      <td className="p-3">{t.aroma_score} / 5</td>
                      <td className="p-3 font-bold text-emerald-600">{t.taste_score} / 5</td>
                      <td className="p-3">{t.texture_score} / 5</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ★ {t.overall_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3">
                        {t.is_passed ? (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                            LAYAK DISTRIBUSI
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-600 border border-rose-500/30">
                            DITOLAK
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-xs max-w-xs truncate">{t.notes || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Belum ada pencatatan uji organoleptik.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'samples' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Daftar Retensi Sampel Pangan (Food Sample Retention)</h2>
            <span className="text-xs text-slate-500">Bukti uji laboratorium jika terjadi keluhan keracunan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Tanggal Sampel</th>
                  <th className="p-3">Menu Sampel</th>
                  <th className="p-3">Lokasi Freezer Sampel</th>
                  <th className="p-3">Batas Akhir Simpan (72 Jam)</th>
                  <th className="p-3">Status Retensi</th>
                  <th className="p-3">Petugas Pengambil</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {foodSamples && foodSamples.length > 0 ? (
                  foodSamples.map((s) => {
                    const isExpired = new Date(s.retention_until) < new Date();
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-100">{s.sample_date}</td>
                        <td className="p-3 font-bold text-brand-dark">{s.meal_name}</td>
                        <td className="p-3">{s.storage_location}</td>
                        <td className="p-3 text-slate-600 font-semibold">{s.retention_until}</td>
                        <td className="p-3">
                          {s.disposed_at ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              SUDAH DIMUSNAHKAN
                            </span>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              SIAP DIMUSNAHKAN (&gt; 72 Jam)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                              DALAM MASA RETENSI AKTIF
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-xs">{s.collected_by?.full_name || 'Ahli Gizi SPPG'}</td>
                        <td className="p-3">
                          {!s.disposed_at && (
                            <button
                              onClick={() => disposeSampleMutation.mutate(s.id)}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg transition-all"
                            >
                              Musnahkan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Belum ada sampel pangan yang disimpan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Input Suhu / Uji Organoleptik */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-100">
                {activeTab === 'temp' ? 'Pencatatan Suhu Cold Chain' : 'Form Uji Organoleptik Rasa & Tampilan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-brand-dark">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {activeTab === 'temp' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Area Penyimpanan</label>
                    <select
                      value={tempArea}
                      onChange={(e) => setTempArea(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="Chiller Susu Pasteur (≤ 4°C)">Chiller Susu Pasteur (≤ 4°C)</option>
                      <option value="Freezer Daging & Ayam (≤ -18°C)">Freezer Daging & Ayam (≤ -18°C)</option>
                      <option value="Chiller Sayur & Buah Segar (4 - 8°C)">Chiller Sayur & Buah Segar (4 - 8°C)</option>
                      <option value="Hot Holding Box Siap Kirim (≥ 60°C)">Hot Holding Box Siap Kirim (≥ 60°C)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Suhu Terukur (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tempCel}
                      onChange={(e) => setTempCel(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan</label>
                    <textarea
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                      placeholder="Misal: Kompresor berfungsi normal, suhu stabil."
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100 h-20"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => addTempMutation.mutate()}
                      disabled={addTempMutation.isPending}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-brand-dark rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20"
                    >
                      {addTempMutation.isPending ? 'Menyimpan...' : 'Simpan Log Suhu'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Menu Sajian</label>
                    <input
                      type="text"
                      value={orgMealName}
                      onChange={(e) => setOrgMealName(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tampilan (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={orgAppearance}
                        onChange={(e) => setOrgAppearance(parseInt(e.target.value))}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Aroma (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={orgAroma}
                        onChange={(e) => setOrgAroma(parseInt(e.target.value))}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rasa (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={orgTaste}
                        onChange={(e) => setOrgTaste(parseInt(e.target.value))}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tekstur (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={orgTexture}
                        onChange={(e) => setOrgTexture(parseInt(e.target.value))}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan Sensorik & Kelayakan</label>
                    <textarea
                      value={orgNotes}
                      onChange={(e) => setOrgNotes(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100 h-16"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => addOrgMutation.mutate()}
                      disabled={addOrgMutation.isPending}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-brand-dark rounded-xl text-sm font-semibold shadow-lg shadow-amber-500/20"
                    >
                      {addOrgMutation.isPending ? 'Menyimpan...' : 'Simpan Uji Rasa'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
