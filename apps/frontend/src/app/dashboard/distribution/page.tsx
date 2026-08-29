'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  DistributionPoint,
  Distribution,
  DistributionStatus,
  DistributionPointType,
  PackageType,
  CreateDistributionPointRequest,
  CreateDistributionRequest,
  UpdateDistributionStatusRequest,
  ApiResponse,
} from '@daydev/shared-types';
import { formatIDR, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ExportButton from '@/components/ui/ExportButton';
import {
  Truck,
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  FileText,
  Edit,
  Baby,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function DistributionPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'DELIVERIES' | 'POINTS'>('DELIVERIES');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Distribution | null>(null);

  // Form States
  const [newPoint, setNewPoint] = useState<CreateDistributionPointRequest>({
    npsn: '20109988',
    name: 'SD Negeri Kemang 05 Pagi',
    type: 'SCHOOL',
    education_level: 'SD',
    address: 'Jl. Kemang Timur No. 12',
    district: 'Mampang Prapatan',
    city: 'Jakarta Selatan',
    contact_person: 'Ibu Ratna S.Pd (Kepala Sekolah)',
    phone_number: '081288991122',
    total_recipients: 320,
    dietary_notes: 'Tidak ada alergi makanan spesifik',
  });

  const [newDelivery, setNewDelivery] = useState<CreateDistributionRequest>({
    distribution_point_id: '',
    delivery_date: new Date().toISOString().split('T')[0],
    package_type: 'FOOD_TRAY',
    is_holiday_delivery: false,
    driver_name: 'Budi Santoso',
    vehicle_plate: 'B 1234 SPG',
    items: [
      {
        meal_name: 'Menu Bergizi Standar A (Nasi, Ayam, Telur, Sayur + Susu UHT)',
        portions_sent: 250,
        unit_price: 15000,
      },
    ],
    notes: 'Pengiriman sarapan pagi',
  });

  const [statusUpdateForm, setStatusUpdateForm] = useState<UpdateDistributionStatusRequest>({
    status: 'DELIVERED',
    recipient_name: 'Drs. H. Bambang (Kepala Sekolah)',
    recipient_title: 'Kepala Sekolah',
    portions_received: 250,
    notes: 'Makanan diterima dalam kondisi higienis dan hangat.',
  });

  // 1. Fetch Distributions
  const { data: distributions, isLoading: isDistLoading } = useQuery<Distribution[]>({
    queryKey: ['distributions-list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Distribution[]>>('/distributions');
      return res.data.data;
    },
  });

  // 2. Fetch Distribution Points
  const { data: distributionPoints, isLoading: isPointsLoading } = useQuery<DistributionPoint[]>({
    queryKey: ['distribution-points-list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<DistributionPoint[]>>('/distribution-points');
      return res.data.data;
    },
  });

  // Mutations
  const createPointMutation = useMutation({
    mutationFn: async (payload: CreateDistributionPointRequest) => {
      const res = await apiClient.post<ApiResponse<DistributionPoint>>('/distribution-points', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-points-list'] });
      setIsPointModalOpen(false);
    },
  });

  const createDeliveryMutation = useMutation({
    mutationFn: async (payload: CreateDistributionRequest) => {
      const res = await apiClient.post<ApiResponse<Distribution>>('/distributions', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions-list'] });
      setIsDeliveryModalOpen(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDistributionStatusRequest }) => {
      const res = await apiClient.patch<ApiResponse<Distribution>>(`/distributions/${id}/status`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions-list'] });
      setIsStatusModalOpen(false);
    },
  });

  // Filter distributions
  const filteredDistributions = distributions?.filter((d) => {
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const pointName = d.distribution_point?.name || d.school?.name || '';
    const matchesSearch =
      d.delivery_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pointName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.driver_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter distribution points
  const filteredPoints = distributionPoints?.filter((p) => {
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact_person.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalPortionsDelivered =
    distributions
      ?.filter((d) => d.status === 'DELIVERED')
      .reduce((acc, curr) => acc + (curr.total_portions || 0), 0) || 0;

  const totalRecipients = distributionPoints?.reduce((acc, curr) => acc + (curr.total_recipients || 0), 0) || 0;

  const getPointTypeBadge = (type: DistributionPointType) => {
    switch (type) {
      case 'SCHOOL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">SEKOLAH</span>;
      case 'POSYANDU':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">POSYANDU (3B)</span>;
      case 'PESANTREN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">PESANTREN</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">LAINNYA</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4" />
            <span>Operasional Distribusi Logistik SPPG BGN</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Distribusi Makanan & Titik Sasaran Penerima
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Mencakup Sekolah (Food Tray), Posyandu Kelompok 3B Bumil/Balita (Totebag Kemasan), dan Pondok Pesantren.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButton filename="distribusi-mbg-sppg.xlsx" label="Export Data" />
          <button
            onClick={() => setIsPointModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all duration-150 active:scale-95"
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Daftar Titik Sasaran Baru</span>
          </button>
          <button
            onClick={() => {
              if (distributionPoints && distributionPoints.length > 0) {
                setNewDelivery((prev) => ({ ...prev, distribution_point_id: distributionPoints[0].id }));
              }
              setIsDeliveryModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all duration-150 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Jadwal Pengiriman</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Titik Sasaran Terdaftar</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{distributionPoints?.length || 0} Titik Sasaran</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Total {totalRecipients.toLocaleString('id-ID')} siswa, bumil & balita
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Porsi Sukses Terkirim</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {totalPortionsDelivered.toLocaleString('id-ID')} Porsi
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Telah diverifikasi di lokasi penerima</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pengiriman Hari Ini</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{distributions?.length || 0} Delivery</p>
          <p className="text-[11px] text-indigo-400/80 mt-1">Armada terhubung sistem</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('DELIVERIES')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'DELIVERIES'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Jadwal & Riwayat Pengiriman</span>
        </button>

        <button
          onClick={() => setActiveTab('POINTS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'POINTS'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Data Titik Sasaran (Sekolah / 3B / Ponpes)</span>
        </button>
      </div>

      {/* TAB 1: DELIVERIES */}
      {activeTab === 'DELIVERIES' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari No. Delivery atau Titik Penerima..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'SCHEDULED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 font-semibold">No. Delivery</th>
                    <th className="p-3.5 font-semibold">Titik Penerima</th>
                    <th className="p-3.5 font-semibold">Paket</th>
                    <th className="p-3.5 font-semibold">Tanggal</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold">Driver & Plat</th>
                    <th className="p-3.5 font-semibold">Porsi</th>
                    <th className="p-3.5 font-semibold">Total Nilai</th>
                    <th className="p-3.5 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {isDistLoading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Memuat data pengiriman...
                      </td>
                    </tr>
                  ) : filteredDistributions && filteredDistributions.length > 0 ? (
                    filteredDistributions.map((d) => {
                      const point = d.distribution_point || d.school;
                      return (
                        <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-mono text-blue-400 font-semibold">
                            {d.delivery_number}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-white">{point?.name}</p>
                              {point?.type && getPointTypeBadge(point.type)}
                            </div>
                            <p className="text-[11px] text-slate-400">{point?.district}</p>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.package_type === 'TOTEBAG'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {d.package_type === 'TOTEBAG' ? 'Kemasan (Totebag)' : 'Siap Santap (Tray)'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">{formatDate(d.delivery_date)}</td>
                          <td className="p-3.5">
                            <StatusBadge status={d.status} />
                          </td>
                          <td className="p-3.5">
                            <p className="text-slate-200">{d.driver_name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{d.vehicle_plate}</p>
                          </td>
                          <td className="p-3.5 font-bold text-white">{d.total_portions} Porsi</td>
                          <td className="p-3.5 font-semibold text-emerald-400">
                            {formatIDR(d.total_value)}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedDelivery(d);
                                  setStatusUpdateForm({
                                    status: d.status,
                                    recipient_name: d.recipient_name || '',
                                    recipient_title: d.recipient_title || '',
                                    portions_received: d.total_portions,
                                    notes: d.notes || '',
                                  });
                                  setIsStatusModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Update</span>
                              </button>
                              <Link
                                href="/dashboard/distribution/bast"
                                className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[11px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                <span>BAST</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Tidak ada catatan pengiriman ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISTRIBUTION POINTS */}
      {activeTab === 'POINTS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['ALL', 'SCHOOL', 'POSYANDU', 'PESANTREN'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-slate-800 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'ALL' ? 'Semua Titik Sasaran' : t === 'SCHOOL' ? 'Sekolah' : t === 'POSYANDU' ? 'Posyandu (3B)' : 'Pesantren'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isPointsLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
              ))
            ) : filteredPoints && filteredPoints.length > 0 ? (
              filteredPoints.map((point) => (
                <div
                  key={point.id}
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {getPointTypeBadge(point.type)}
                        {point.npsn && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            NPSN: {point.npsn}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AKTIF
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{point.name}</h3>

                    <div className="space-y-1.5 mt-3 text-xs text-slate-400">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>
                          {point.address}, {point.district}, {point.city}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          <strong className="text-slate-200">{point.total_recipients}</strong> Penerima Manfaat
                        </span>
                      </div>

                      {point.dietary_notes && (
                        <p className="text-[11px] text-amber-400/90 italic mt-1">
                          Catatan: {point.dietary_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Kontak: {point.contact_person}</span>
                    <span className="font-mono text-slate-300">{point.phone_number}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3">
                <EmptyState
                  icon={Building2}
                  title="Belum ada titik sasaran terdaftar"
                  description="Daftarkan sekolah, posyandu (kelompok 3B), atau pesantren sasaran program MBG."
                  actionText="Tambah Titik Sasaran"
                  onAction={() => setIsPointModalOpen(true)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: DAFTAR TITIK SASARAN BARU */}
      <Modal
        isOpen={isPointModalOpen}
        onClose={() => setIsPointModalOpen(false)}
        title="Daftarkan Titik Sasaran Penerima MBG"
        description="Dukungan untuk Sekolah (PAUD-SMA), Posyandu (Kelompok 3B), dan Pondok Pesantren."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPointMutation.mutate(newPoint);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipe Titik Sasaran</label>
              <select
                value={newPoint.type}
                onChange={(e) => setNewPoint({ ...newPoint, type: e.target.value as DistributionPointType })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="SCHOOL">Sekolah (PAUD / SD / SMP / SMA)</option>
                <option value="POSYANDU">Posyandu (Kelompok 3B: Ibu Hamil / Balita)</option>
                <option value="PESANTREN">Pondok Pesantren</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Penerima (Siswa/Bumil/Balita)
              </label>
              <input
                type="number"
                min="1"
                required
                value={newPoint.total_recipients}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, total_recipients: parseInt(e.target.value) || 0 })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lembaga / Titik Distribusi</label>
            <input
              type="text"
              required
              value={newPoint.name}
              onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {newPoint.type === 'SCHOOL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor NPSN</label>
              <input
                type="text"
                value={newPoint.npsn || ''}
                onChange={(e) => setNewPoint({ ...newPoint, npsn: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              required
              value={newPoint.address}
              onChange={(e) => setNewPoint({ ...newPoint, address: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kecamatan</label>
              <input
                type="text"
                required
                value={newPoint.district}
                onChange={(e) => setNewPoint({ ...newPoint, district: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                required
                value={newPoint.city}
                onChange={(e) => setNewPoint({ ...newPoint, city: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Kontak PIC / Kepala / Bidan
              </label>
              <input
                type="text"
                required
                value={newPoint.contact_person}
                onChange={(e) => setNewPoint({ ...newPoint, contact_person: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor WhatsApp / HP</label>
              <input
                type="text"
                required
                value={newPoint.phone_number}
                onChange={(e) => setNewPoint({ ...newPoint, phone_number: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPointModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createPointMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              {createPointMutation.isPending ? 'Menyimpan...' : 'Simpan Titik Sasaran'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: JADWAL PENGIRIMAN BARU */}
      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Jadwalkan Pengiriman Makanan"
        description="Tetapkan titik tujuan, jenis paket makanan, armada driver, dan alokasi porsi."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDeliveryMutation.mutate(newDelivery);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Titik Sasaran Tujuan</label>
            <select
              value={newDelivery.distribution_point_id}
              onChange={(e) => setNewDelivery({ ...newDelivery, distribution_point_id: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              required
            >
              {distributionPoints?.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name} ({pt.total_recipients} Penerima - {pt.type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jenis Kemasan / Paket</label>
              <select
                value={newDelivery.package_type}
                onChange={(e) => setNewDelivery({ ...newDelivery, package_type: e.target.value as PackageType })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="FOOD_TRAY">Food Tray (Siap Santap - Hari Sekolah)</option>
                <option value="TOTEBAG">Totebag Kemasan (Libur Sekolah / 3B)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Porsi Dikirim
              </label>
              <input
                type="number"
                min="1"
                required
                value={newDelivery.items[0]?.portions_sent || 250}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  const updated = [...newDelivery.items];
                  updated[0] = { ...updated[0], portions_sent: val };
                  setNewDelivery({ ...newDelivery, items: updated });
                }}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tanggal Pengiriman
              </label>
              <input
                type="date"
                required
                value={newDelivery.delivery_date}
                onChange={(e) => setNewDelivery({ ...newDelivery, delivery_date: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDelivery.is_holiday_delivery || false}
                  onChange={(e) => setNewDelivery({ ...newDelivery, is_holiday_delivery: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800"
                />
                <span>Pengiriman Masa Libur Sekolah</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Driver / Pengemudi
              </label>
              <input
                type="text"
                required
                value={newDelivery.driver_name}
                onChange={(e) => setNewDelivery({ ...newDelivery, driver_name: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Plat Nomor Kendaraan
              </label>
              <input
                type="text"
                required
                placeholder="B 1234 SPG"
                value={newDelivery.vehicle_plate}
                onChange={(e) => setNewDelivery({ ...newDelivery, vehicle_plate: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan</label>
            <input
              type="text"
              value={newDelivery.notes}
              onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeliveryModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createDeliveryMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              {createDeliveryMutation.isPending ? 'Menyimpan...' : 'Jadwalkan Pengiriman'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: UPDATE STATUS PENGIRIMAN */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Update Status Delivery #${selectedDelivery?.delivery_number}`}
        description="Perbarui status perjalanan atau konfirmasi serah terima di lokasi penerima."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedDelivery) return;
            updateStatusMutation.mutate({
              id: selectedDelivery.id,
              payload: statusUpdateForm,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Status Pengiriman
            </label>
            <select
              value={statusUpdateForm.status}
              onChange={(e) =>
                setStatusUpdateForm({
                  ...statusUpdateForm,
                  status: e.target.value as DistributionStatus,
                })
              }
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="SCHEDULED">SCHEDULED (Terjadwal)</option>
              <option value="PREPARING">PREPARING (Persiapan Dapur)</option>
              <option value="IN_TRANSIT">IN_TRANSIT (Dalam Perjalanan)</option>
              <option value="DELIVERED">DELIVERED (Diterima di Lokasi)</option>
              <option value="REJECTED">REJECTED (Ditolak / Masalah)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Penerima di Lokasi
              </label>
              <input
                type="text"
                value={statusUpdateForm.recipient_name}
                onChange={(e) =>
                  setStatusUpdateForm({ ...statusUpdateForm, recipient_name: e.target.value })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jabatan Penerima
              </label>
              <input
                type="text"
                placeholder="Kepala Sekolah / Bidan / Pengurus"
                value={statusUpdateForm.recipient_title}
                onChange={(e) =>
                  setStatusUpdateForm({ ...statusUpdateForm, recipient_title: e.target.value })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Serah Terima
            </label>
            <input
              type="text"
              value={statusUpdateForm.notes}
              onChange={(e) =>
                setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })
              }
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updateStatusMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            >
              {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
