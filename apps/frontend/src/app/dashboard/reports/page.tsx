'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  ApiResponse,
  VirtualAccount,
  VATransaction,
  GeneratedReport,
  ReportType,
} from '@daydev/shared-types';
import {
  FileSpreadsheet,
  Landmark,
  FileText,
  Download,
  Plus,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export default function ReportsAndVAPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'reports' | 'va'>('reports');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // Form states for report generation
  const [reportType, setReportType] = useState<ReportType>('BIWEEKLY_LPA');
  const [periodStart, setPeriodStart] = useState('2026-08-01');
  const [periodEnd, setPeriodEnd] = useState('2026-08-15');
  const [headName, setHeadName] = useState('Dr. Siti Nurhaliza (Kepala SPPG)');
  const [reportNotes, setReportNotes] = useState('Laporan Pertanggungjawaban Realisasi MBG Periode I Agustus 2026');

  // Top-Up state
  const [topUpAmount, setTopUpAmount] = useState('50000000');
  const [topUpDesc, setTopUpDesc] = useState('Penyaluran Dana Tahap II APBN dari Kas Negara / SIPGN');

  // Queries
  const { data: reports, isLoading: isReportsLoading } = useQuery<GeneratedReport[]>({
    queryKey: ['reports-list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<GeneratedReport[]>>('/reports');
      return res.data.data;
    },
  });

  const { data: virtualAccounts } = useQuery<VirtualAccount[]>({
    queryKey: ['virtual-accounts'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<VirtualAccount[]>>('/finance/virtual-accounts');
      return res.data.data;
    },
  });

  const activeVA = virtualAccounts?.[0];

  const { data: vaTransactions } = useQuery<VATransaction[]>({
    queryKey: ['va-transactions', activeVA?.id],
    queryFn: async () => {
      if (!activeVA?.id) return [];
      const res = await apiClient.get<ApiResponse<VATransaction[]>>(`/finance/virtual-accounts/${activeVA.id}/transactions`);
      return res.data.data;
    },
    enabled: !!activeVA?.id,
  });

  // Mutations
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/reports/generate', {
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        head_name: headName,
        notes: reportNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
      setIsGenerateModalOpen(false);
    },
  });

  const topUpMutation = useMutation({
    mutationFn: async () => {
      if (!activeVA?.id) return;
      return apiClient.post(`/finance/virtual-accounts/${activeVA.id}/transactions`, {
        transaction_type: 'TOP_UP',
        channel: 'SIPGN_AUTO_TOPUP',
        amount: parseFloat(topUpAmount),
        description: topUpDesc,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['va-transactions'] });
      setIsTopUpModalOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
            Laporan Periodik BGN & Rekening Virtual Account
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generator Buku Kas Umum (BKU), Laporan Harian, LPA 2-Mingguan, dan Manajemen Dana Virtual Account (Auto Top-Up).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'va' && (
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              Simulasi Top-Up Dana BGN
            </button>
          )}
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Generate Laporan Baru
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Virtual Account Giro SPPG</span>
            <Landmark className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {formatCurrency(activeVA?.current_balance || 150000000)}
          </div>
          <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            {activeVA?.bank_name || 'Bank Rakyat Indonesia'} ({activeVA?.account_number || '8888019928374650'})
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Integrasi Bank API & SIPGN</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">AKTIF & TERHUBUNG</div>
          <p className="text-xs text-slate-400 mt-1">
            Auto-Sync Rekening Koran & Webhook Penyaluran
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dokumen Laporan Terarsip</span>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">
            {reports?.length || 0} <span className="text-sm font-normal text-slate-400">Berkas PDF</span>
          </div>
          <p className="text-xs text-blue-400 mt-1">
            Siap Dikirim / Diekspor ke BGN Pusat
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'reports'
              ? 'bg-slate-800 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          Daftar Arsip Laporan Pertanggungjawaban (PDF)
        </button>
        <button
          onClick={() => setActiveTab('va')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            activeTab === 'va'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          Mutasi Rekening Virtual Account & Top-Up BGN
        </button>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Arsip Laporan Dana & Operasional SPPG</h2>
            <span className="text-xs text-slate-400">Standar Format Format Juknis Penggunaan Dana BGN</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Nomor Dokumen</th>
                  <th className="p-3">Jenis Laporan</th>
                  <th className="p-3">Periode</th>
                  <th className="p-3">Porsi MBG</th>
                  <th className="p-3">Total Anggaran</th>
                  <th className="p-3">Waktu Generate</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports && reports.length > 0 ? (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-medium text-slate-100">{r.report_number}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {r.report_type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">
                        {r.period_start} s/d {r.period_end}
                      </td>
                      <td className="p-3 font-semibold">{r.total_portions} Porsi</td>
                      <td className="p-3 font-bold text-emerald-400">{formatCurrency(r.total_amount)}</td>
                      <td className="p-3 text-slate-400 text-xs">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="p-3">
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh PDF
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Belum ada laporan yang di-generate. Silakan klik "Generate Laporan Baru".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VA Tab */}
      {activeTab === 'va' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-slate-100">Mutasi Rekening Virtual Account Operasional</h2>
            <span className="text-xs text-slate-400">Terintegrasi otomatis dengan SIPGN</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Tanggal Transaksi</th>
                  <th className="p-3">No. Referensi</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Kanal Penyaluran</th>
                  <th className="p-3">Deskripsi</th>
                  <th className="p-3">Nominal (Rp)</th>
                  <th className="p-3">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vaTransactions && vaTransactions.length > 0 ? (
                  vaTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-medium text-slate-100">{tx.transaction_date}</td>
                      <td className="p-3 text-slate-400 text-xs font-mono">{tx.reference_number || '-'}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-bold',
                            tx.transaction_type === 'TOP_UP'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          )}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-semibold text-slate-300">{tx.channel}</td>
                      <td className="p-3 text-slate-200">{tx.description}</td>
                      <td
                        className={cn(
                          'p-3 font-bold',
                          tx.transaction_type === 'TOP_UP' ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {tx.transaction_type === 'TOP_UP' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3 font-semibold text-slate-300">{formatCurrency(tx.balance_after)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Belum ada riwayat transaksi mutasi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Generate Report */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100">Generate Laporan Resmi BGN</h3>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Jenis Laporan BGN</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-semibold"
                >
                  <option value="BIWEEKLY_LPA">Laporan Penggunaan Anggaran (LPA) 2 Mingguan</option>
                  <option value="DAILY_FUND_USAGE">Laporan Penggunaan Dana Harian</option>
                  <option value="CASH_BOOK">Buku Kas Umum (BKU)</option>
                  <option value="MONTHLY">Laporan Pertanggungjawaban Bulanan</option>
                  <option value="PETTY_CASH_BOOK">Buku Bantu Kas Kecil</option>
                  <option value="FOOD_SUPPLY_BOOK">Buku Bantu Persediaan Bahan Pangan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Awal Periode</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Akhir Periode</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Pengesah / Kepala SPPG</label>
                <input
                  type="text"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Catatan Dokumen</label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 h-16"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={() => generateReportMutation.mutate()}
                  disabled={generateReportMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20"
                >
                  {generateReportMutation.isPending ? 'Memproses PDF...' : 'Generate & Simpan PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Top-Up VA */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100">Simulasi Auto Top-Up Kas BGN</h3>
              <button onClick={() => setIsTopUpModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nominal Top-Up (Rp)</label>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Uraian Penyaluran</label>
                <input
                  type="text"
                  value={topUpDesc}
                  onChange={(e) => setTopUpDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={() => topUpMutation.mutate()}
                  disabled={topUpMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20"
                >
                  {topUpMutation.isPending ? 'Memproses...' : 'Proses Top-Up'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
