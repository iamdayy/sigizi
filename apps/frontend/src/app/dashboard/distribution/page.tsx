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
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
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
    items: [],
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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-brand-primary/20">SEKOLAH</span>;
      case 'POSYANDU':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">POSYANDU (3B)</span>;
      case 'PESANTREN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">PESANTREN</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">LAINNYA</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-brand-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4" />
            <span>Operasional Distribusi Logistik SPPG BGN</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-dark tracking-tight">
            Distribusi Makanan & Titik Sasaran Penerima
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mencakup Sekolah (Food Tray), Posyandu Kelompok 3B Bumil/Balita (Totebag Kemasan), dan Pondok Pesantren.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButton filename="distribusi-mbg-sppg.xlsx" label="Export Data" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPointModalOpen(true)}
          >
            <Building2 className="w-4 h-4 text-brand-primary" />
            <span>Daftar Titik Sasaran Baru</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (distributionPoints && distributionPoints.length > 0) {
                setNewDelivery((prev) => ({ ...prev, distribution_point_id: distributionPoints[0].id }));
              }
              setIsDeliveryModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Buat Jadwal Pengiriman</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Titik Sasaran Terdaftar</span>
              <Building2 className="w-4 h-4 text-brand-primary" />
            </div>
            <p className="text-2xl font-bold text-brand-dark">{distributionPoints?.length || 0} Titik Sasaran</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Total {totalRecipients.toLocaleString('id-ID')} siswa, bumil & balita
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Total Porsi Sukses Terkirim</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {totalPortionsDelivered.toLocaleString('id-ID')} Porsi
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Telah diverifikasi di lokasi penerima</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Jadwal Pengiriman Aktif</span>
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-600">
              {distributions?.filter((d) => d.status !== 'DELIVERED').length || 0} Jadwal
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Sedang dipersiapkan / di jalan</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('DELIVERIES')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'DELIVERIES'
              ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
              : 'text-slate-500 hover:text-brand-dark'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Jadwal & Riwayat Pengiriman</span>
        </button>

        <button
          onClick={() => setActiveTab('POINTS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'POINTS'
              ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
              : 'text-slate-500 hover:text-brand-dark'
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white shadow-sm p-3 rounded-2xl border border-slate-100">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari No. Delivery atau Titik Penerima..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark placeholder-slate-500 focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'SCHEDULED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-brand-primary text-brand-dark shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:text-brand-dark hover:bg-slate-100'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Deliveries Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Delivery</TableHead>
                  <TableHead>Titik Penerima</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Driver & Plat</TableHead>
                  <TableHead>Porsi</TableHead>
                  <TableHead>Total Nilai</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDistLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500">
                      Memuat data pengiriman...
                    </TableCell>
                  </TableRow>
                ) : filteredDistributions && filteredDistributions.length > 0 ? (
                  filteredDistributions.map((d) => {
                    const point = d.distribution_point || d.school;
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-brand-primary font-semibold">
                          {d.delivery_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-brand-dark">{point?.name}</p>
                            {point?.type && getPointTypeBadge(point.type)}
                          </div>
                          <p className="text-[11px] text-slate-500">{point?.district}</p>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.package_type === 'TOTEBAG'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {d.package_type === 'TOTEBAG' ? 'Kemasan (Totebag)' : 'Siap Santap (Tray)'}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500">{formatDate(d.delivery_date)}</TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                        <TableCell>
                          <p className="text-brand-dark">{d.driver_name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{d.vehicle_plate}</p>
                        </TableCell>
                        <TableCell className="font-bold text-brand-dark">{d.total_portions} Porsi</TableCell>
                        <TableCell className="font-semibold text-emerald-600">
                          {formatIDR(d.total_value)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedDelivery(d);
                                setStatusUpdateForm({
                                  status: d.status,
                                  recipient_name: d.recipient_name || '',
                                  recipient_title: d.recipient_title || '',
                                  items: d.items?.map((item) => ({
                                    item_id: item.id!,
                                    portions_received: item.portions_sent,
                                  })) || [],
                                  notes: d.notes || '',
                                });
                                setIsStatusModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-dark text-[11px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Update</span>
                            </button>
                            <Link
                              href="/dashboard/distribution/bast"
                              className="px-2.5 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/10 text-brand-primary border border-blue-500/20 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>BAST</span>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500">
                      Tidak ada catatan pengiriman ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
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
                    ? 'bg-slate-100 text-brand-primary border border-brand-primary/20'
                    : 'text-slate-500 hover:text-brand-dark'
                }`}
              >
                {t === 'ALL' ? 'Semua Titik Sasaran' : t === 'SCHOOL' ? 'Sekolah' : t === 'POSYANDU' ? 'Posyandu (3B)' : 'Pesantren'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isPointsLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-white shadow-sm border border-slate-200 rounded-2xl animate-pulse" />
              ))
            ) : filteredPoints && filteredPoints.length > 0 ? (
              filteredPoints.map((point) => (
                <Card
                  key={point.id}
                  className="flex flex-col justify-between"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {getPointTypeBadge(point.type)}
                        {point.npsn && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            NPSN: {point.npsn}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        AKTIF
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-brand-dark mb-1">{point.name}</h3>

                    <div className="space-y-1.5 mt-3 text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                        <span>
                          {point.address}, {point.district}, {point.city}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          <strong className="text-brand-dark">{point.total_recipients}</strong> Penerima Manfaat
                        </span>
                      </div>

                      {point.dietary_notes && (
                        <p className="text-[11px] text-amber-600/90 italic mt-1">
                          Catatan: {point.dietary_notes}
                        </p>
                      )}
                    </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Kontak: {point.contact_person}</span>
                    <span className="font-mono text-slate-600">{point.phone_number}</span>
                  </div>
                  </CardContent>
                </Card>
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipe Titik Sasaran</label>
              <select
                value={newPoint.type}
                onChange={(e) => setNewPoint({ ...newPoint, type: e.target.value as DistributionPointType })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              >
                <option value="SCHOOL">Sekolah (PAUD / SD / SMP / SMA)</option>
                <option value="POSYANDU">Posyandu (Kelompok 3B: Ibu Hamil / Balita)</option>
                <option value="PESANTREN">Pondok Pesantren</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lembaga / Titik Distribusi</label>
            <input
              type="text"
              required
              value={newPoint.name}
              onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
            />
          </div>

          {newPoint.type === 'SCHOOL' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor NPSN</label>
              <input
                type="text"
                value={newPoint.npsn || ''}
                onChange={(e) => setNewPoint({ ...newPoint, npsn: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Lengkap</label>
            <input
              type="text"
              required
              value={newPoint.address}
              onChange={(e) => setNewPoint({ ...newPoint, address: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kecamatan</label>
              <input
                type="text"
                required
                value={newPoint.district}
                onChange={(e) => setNewPoint({ ...newPoint, district: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                required
                value={newPoint.city}
                onChange={(e) => setNewPoint({ ...newPoint, city: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Kontak PIC / Kepala / Bidan
              </label>
              <input
                type="text"
                required
                value={newPoint.contact_person}
                onChange={(e) => setNewPoint({ ...newPoint, contact_person: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor WhatsApp / HP</label>
              <input
                type="text"
                required
                value={newPoint.phone_number}
                onChange={(e) => setNewPoint({ ...newPoint, phone_number: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsPointModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={createPointMutation.isPending}
            >
              {createPointMutation.isPending ? 'Menyimpan...' : 'Simpan Titik Sasaran'}
            </Button>
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Titik Sasaran Tujuan</label>
            <select
              value={newDelivery.distribution_point_id}
              onChange={(e) => setNewDelivery({ ...newDelivery, distribution_point_id: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Kemasan / Paket</label>
              <select
                value={newDelivery.package_type}
                onChange={(e) => setNewDelivery({ ...newDelivery, package_type: e.target.value as PackageType })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              >
                <option value="FOOD_TRAY">Food Tray (Siap Santap - Hari Sekolah)</option>
                <option value="TOTEBAG">Totebag Kemasan (Libur Sekolah / 3B)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tanggal Pengiriman
              </label>
              <input
                type="date"
                required
                value={newDelivery.delivery_date}
                onChange={(e) => setNewDelivery({ ...newDelivery, delivery_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs text-slate-600 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDelivery.is_holiday_delivery || false}
                  onChange={(e) => setNewDelivery({ ...newDelivery, is_holiday_delivery: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-50 border-slate-200"
                />
                <span>Pengiriman Masa Libur Sekolah</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Driver / Pengemudi
              </label>
              <input
                type="text"
                required
                value={newDelivery.driver_name}
                onChange={(e) => setNewDelivery({ ...newDelivery, driver_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Plat Nomor Kendaraan
              </label>
              <input
                type="text"
                required
                placeholder="B 1234 SPG"
                value={newDelivery.vehicle_plate}
                onChange={(e) => setNewDelivery({ ...newDelivery, vehicle_plate: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan</label>
            <input
              type="text"
              value={newDelivery.notes}
              onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsDeliveryModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={createDeliveryMutation.isPending}
            >
              {createDeliveryMutation.isPending ? 'Menyimpan...' : 'Buat Jadwal Pengiriman'}
            </Button>
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">
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
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nama Penerima di Lokasi
              </label>
              <input
                type="text"
                value={statusUpdateForm.recipient_name}
                onChange={(e) =>
                  setStatusUpdateForm({ ...statusUpdateForm, recipient_name: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Jabatan Penerima
              </label>
              <input
                type="text"
                placeholder="Kepala Sekolah / Bidan / Pengurus"
                value={statusUpdateForm.recipient_title}
                onChange={(e) =>
                  setStatusUpdateForm({ ...statusUpdateForm, recipient_title: e.target.value })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {statusUpdateForm.status === 'DELIVERED' && statusUpdateForm.items && statusUpdateForm.items.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                Detail Porsi Diterima
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {statusUpdateForm.items.map((itemInput, index) => {
                  const originalItem = selectedDelivery?.items.find((i) => i.id === itemInput.item_id);
                  return (
                    <div key={itemInput.item_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-[11px] font-semibold text-brand-dark leading-tight">
                          {originalItem?.meal_name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-100">
                          Dikirim: {originalItem?.portions_sent}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Porsi Diterima:</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={itemInput.portions_received}
                          onChange={(e) => {
                            const updated = [...(statusUpdateForm.items || [])];
                            updated[index] = {
                              ...updated[index],
                              portions_received: parseInt(e.target.value) || 0,
                            };
                            setStatusUpdateForm({ ...statusUpdateForm, items: updated });
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Catatan Serah Terima
            </label>
            <input
              type="text"
              value={statusUpdateForm.notes}
              onChange={(e) =>
                setStatusUpdateForm({ ...statusUpdateForm, notes: e.target.value })
              }
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-dark focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Memperbarui...' : 'Update Status BAST'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
