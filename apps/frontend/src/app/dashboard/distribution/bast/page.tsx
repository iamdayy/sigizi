'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  School,
  Distribution,
  BASTPreviewData,
  BASTDocument,
  BASTGenerateRequest,
  BASTDocumentResponse,
  ApiResponse,
} from '@daydev/shared-types';
import { formatIDR, formatDate } from '@/lib/utils';
import {
  FileText,
  School as SchoolIcon,
  Calendar,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Eye,
  ExternalLink,
} from 'lucide-react';

export default function BASTGeneratorPage() {
  const queryClient = useQueryClient();

  // Form State
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [sppgHeadName, setSppgHeadName] = useState('Dr. Siti Nurhaliza (Kepala SPPG)');
  const [principalName, setPrincipalName] = useState('');
  const [officialNotes, setOfficialNotes] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState<BASTDocumentResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 1. Fetch School Master Data
  const { data: schools, isLoading: isSchoolsLoading } = useQuery<School[]>({
    queryKey: ['schools'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<School[]>>('/schools');
      return res.data.data;
    },
  });

  // Auto-select first school once loaded
  React.useEffect(() => {
    if (schools && schools.length > 0 && !selectedSchoolId) {
      setSelectedSchoolId(schools[0].id);
      setPrincipalName(schools[0].contact_person);
    }
  }, [schools, selectedSchoolId]);

  // Update principal name when school selection changes
  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSchoolId(id);
    const found = schools?.find((s) => s.id === id);
    if (found) {
      setPrincipalName(found.contact_person);
    }
  };

  // 2. Fetch Live BAST Preview
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    refetch: refetchPreview,
  } = useQuery<BASTPreviewData | null>({
    queryKey: ['bast-preview', selectedSchoolId, periodStart, periodEnd],
    queryFn: async () => {
      if (!selectedSchoolId || !periodStart || !periodEnd) return null;
      const res = await apiClient.get<ApiResponse<BASTPreviewData>>('/bast/preview', {
        params: {
          school_id: selectedSchoolId,
          period_start: periodStart,
          period_end: periodEnd,
        },
      });
      return res.data.data;
    },
    enabled: !!selectedSchoolId && !!periodStart && !!periodEnd,
  });

  // 3. Fetch Historical BAST Documents Archive
  const { data: bastArchive, isLoading: isArchiveLoading } = useQuery<BASTDocument[]>({
    queryKey: ['bast-documents'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BASTDocument[]>>('/bast/documents');
      return res.data.data;
    },
  });

  // 4. Generate BAST Mutation
  const generateMutation = useMutation({
    mutationFn: async (payload: BASTGenerateRequest) => {
      const res = await apiClient.post<ApiResponse<BASTDocumentResponse>>(
        '/bast/generate',
        payload
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      setGeneratedDoc(data);
      setErrorMessage('');
      queryClient.invalidateQueries({ queryKey: ['bast-documents'] });
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Gagal men-generate dokumen BAST.'
      );
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId) return;

    setErrorMessage('');
    generateMutation.mutate({
      school_id: selectedSchoolId,
      period_start: periodStart,
      period_end: periodEnd,
      sppg_head_name: sppgHeadName,
      school_principal_name: principalName,
      official_notes: officialNotes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            Generator Dokumen BAST MBG
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/30">
              PDF Generator
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pembuatan otomatis Berita Acara Serah Terima makanan bergizi per sekolah dengan rekonsiliasi pengiriman
          </p>
        </div>
      </div>

      {/* Main Grid: Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Parameter BAST Serah Terima</span>
          </h2>

          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-4">
            {/* School Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Sekolah Penerima (Pihak Kedua)
              </label>
              <div className="relative">
                <SchoolIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedSchoolId}
                  onChange={handleSchoolChange}
                  disabled={isSchoolsLoading}
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all"
                >
                  {schools?.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name} ({s.total_recipients || s.total_students || 0} Penerima Manfaat)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Picker */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Periode Mulai
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Periode Selesai
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                    className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500 rounded-xl pl-10 pr-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Signatory Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kepala Satuan SPPG (Pihak I)
              </label>
              <input
                type="text"
                value={sppgHeadName}
                onChange={(e) => setSppgHeadName(e.target.value)}
                required
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Kepala Sekolah Penerima (Pihak II)
              </label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                required
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={generateMutation.isPending || (previewData?.total_deliveries || 0) === 0}
              className="w-full mt-3 flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merender PDF &amp; Mengunggah ke R2...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Dokumen BAST (PDF)</span>
                </>
              )}
            </button>
          </form>

          {/* Success Banner upon Generation */}
          {generatedDoc && (
            <div className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>BAST Berhasil Diterbitkan!</span>
              </div>
              <p className="text-[11px] text-emerald-300/80 mb-3 font-mono">
                No: {generatedDoc.document_number}
              </p>
              <a
                href={generatedDoc.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh / Lihat PDF Resmi</span>
              </a>
            </div>
          )}
        </div>

        {/* Right Column: Live Data Preview & Deliveries Recapitulation */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100">
                  Pratinjau Rekapitulasi Penyaluran MBG
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifikasi data riil surat jalan sebelum dicetak ke format BAST resmi
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {previewData?.total_deliveries || 0} Pengiriman
              </span>
            </div>

            {/* Preview Summary Stat Badges */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium">Total Porsi</span>
                <p className="text-base font-bold text-white mt-0.5">
                  {previewData?.total_portions.toLocaleString('id-ID') || 0} Porsi
                </p>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium">Total Nilai Alokasi</span>
                <p className="text-base font-bold text-emerald-400 mt-0.5">
                  {formatIDR(previewData?.total_amount || 0)}
                </p>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 font-medium">Sasaran Siswa</span>
                <p className="text-base font-bold text-blue-400 mt-0.5">
                  {previewData?.school?.total_students || 0} Anak
                </p>
              </div>
            </div>

            {/* Deliveries Table Preview */}
            <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-900/60">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">No. Surat Jalan</th>
                    <th className="py-2.5 px-3">Menu Makanan</th>
                    <th className="py-2.5 px-3 text-right">Porsi</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {isPreviewLoading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                        Memuat data pengiriman...
                      </td>
                    </tr>
                  ) : previewData?.deliveries && previewData.deliveries.length > 0 ? (
                    previewData.deliveries.map((d: Distribution) => (
                      <tr key={d.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 px-3 font-medium">
                          {formatDate(d.delivery_date)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {d.delivery_number}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {d.items && d.items.length > 0 ? d.items[0].meal_name : 'Menu Gizi Seimbang MBG'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {d.total_portions}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        Tidak ada catatan pengiriman makanan pada rentang tanggal ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Standar Dokumen:</span>
            <span className="text-slate-300 font-medium">Format Resmi Badan Gizi Nasional (BGN)</span>
          </div>
        </div>
      </div>

      {/* Historical BAST Archive Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Arsip Dokumen BAST Resmi Diterbitkan
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar dokumen serah terima yang tersimpan di penyimpanan Cloudflare R2 / Disk
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Nomor Dokumen</th>
                <th className="pb-3 px-4">Sekolah Penerima</th>
                <th className="pb-3 px-4">Periode Penyaluran</th>
                <th className="pb-3 px-4 text-right">Total Porsi</th>
                <th className="pb-3 px-4 text-right">Total Anggaran</th>
                <th className="pb-3 px-4 text-center">Status</th>
                <th className="pb-3 pl-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isArchiveLoading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Memuat arsip BAST...
                  </td>
                </tr>
              ) : bastArchive && bastArchive.length > 0 ? (
                bastArchive.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4 font-mono font-medium text-purple-300">
                      {doc.document_number}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      {doc.distribution_point?.name || doc.school?.name || 'Titik Penerima'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatDate(doc.period_start)} - {formatDate(doc.period_end)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {doc.total_portions.toLocaleString('id-ID')} Porsi
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {formatIDR(doc.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh PDF</span>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada dokumen BAST yang diterbitkan. Gunakan formulir di atas untuk men-generate dokumen baru.
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
