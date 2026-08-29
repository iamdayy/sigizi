'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  Account,
  JournalEntry,
  CreateAccountRequest,
  CreateJournalEntryRequest,
  CreateJournalLineRequest,
  DailyReconciliationReport,
  ApiResponse,
  AccountType,
} from '@daydev/shared-types';
import { formatIDR, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ExportButton from '@/components/ui/ExportButton';
import {
  Receipt,
  Plus,
  RefreshCw,
  BookOpen,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function FinanceJournalsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'COA' | 'JOURNALS'>('JOURNALS');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Modal States
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [reconResult, setReconResult] = useState<DailyReconciliationReport | null>(null);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);

  // Form States
  const [newAccount, setNewAccount] = useState<CreateAccountRequest>({
    code: '1-1401',
    name: 'Persediaan Kemasan Makan Siang',
    type: 'ASSET',
    normal_balance: 'DEBIT',
    description: 'Akun pencatatan stok packaging',
  });

  const [newJournal, setNewJournal] = useState<CreateJournalEntryRequest>({
    entry_date: new Date().toISOString().split('T')[0],
    description: 'Penyesuaian Biaya Operasional Dapur',
    reference_type: 'MANUAL_ADJUSTMENT',
    reference_id: 'ADJ-' + Math.floor(100 + Math.random() * 900),
    lines: [
      { account_id: '', debit: 500000, credit: 0, description: 'Beban Dapur' },
      { account_id: '', debit: 0, credit: 500000, description: 'Kas Operasional' },
    ],
  });

  // 1. Fetch Chart of Accounts
  const {
    data: accounts,
    isLoading: isAccountsLoading,
  } = useQuery<Account[]>({
    queryKey: ['finance-accounts'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Account[]>>('/finance/accounts');
      return res.data.data;
    },
  });

  // 2. Fetch Journal Entries
  const {
    data: journalEntries,
    isLoading: isJournalsLoading,
  } = useQuery<JournalEntry[]>({
    queryKey: ['finance-journal-entries'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<JournalEntry[]>>('/finance/journal-entries');
      return res.data.data;
    },
  });

  // Mutations
  const createAccountMutation = useMutation({
    mutationFn: async (payload: CreateAccountRequest) => {
      const res = await apiClient.post<ApiResponse<Account>>('/finance/accounts', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      setIsAccountModalOpen(false);
    },
  });

  const createJournalMutation = useMutation({
    mutationFn: async (payload: CreateJournalEntryRequest) => {
      const res = await apiClient.post<ApiResponse<JournalEntry>>(
        '/finance/journal-entries',
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-journal-entries'] });
      setIsJournalModalOpen(false);
    },
  });

  const reconcileDailyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<DailyReconciliationReport>>(
        '/finance/reconcile-daily'
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance-journal-entries'] });
      setReconResult(data);
      setIsReconModalOpen(true);
    },
  });

  // Journal Line Management
  const addJournalLine = () => {
    setNewJournal({
      ...newJournal,
      lines: [
        ...newJournal.lines,
        {
          account_id: accounts?.[0]?.id || '',
          debit: 0,
          credit: 0,
          description: '',
        },
      ],
    });
  };

  const removeJournalLine = (index: number) => {
    setNewJournal({
      ...newJournal,
      lines: newJournal.lines.filter((_, i) => i !== index),
    });
  };

  const updateJournalLine = (index: number, field: keyof CreateJournalLineRequest, value: any) => {
    const updated = [...newJournal.lines];
    updated[index] = { ...updated[index], [field]: value };
    setNewJournal({ ...newJournal, lines: updated });
  };

  const totalDebitSum = newJournal.lines.reduce((acc, l) => acc + (l.debit || 0), 0);
  const totalCreditSum = newJournal.lines.reduce((acc, l) => acc + (l.credit || 0), 0);
  const isJournalBalanced = Math.abs(totalDebitSum - totalCreditSum) < 0.01 && totalDebitSum > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Akuntansi & Pembukuan SPPG</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Jurnal Umum & Bagan Akun (CoA)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sistem akuntansi berpasangan (double-entry) dengan otomatisasi rekonsiliasi harian 23:59 WIB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButton filename="jurnal-keuangan-sppg.xlsx" label="Export Buku Besar" />
          <button
            onClick={() => reconcileDailyMutation.mutate()}
            disabled={reconcileDailyMutation.isPending}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all duration-150 active:scale-95"
          >
            <RefreshCw
              className={`w-4 h-4 ${reconcileDailyMutation.isPending ? 'animate-spin' : ''}`}
            />
            <span>
              {reconcileDailyMutation.isPending ? 'Merekonsiliasi...' : 'Jalankan Rekonsiliasi 23:59'}
            </span>
          </button>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all duration-150 active:scale-95"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Tambah Akun CoA</span>
          </button>
          <button
            onClick={() => {
              if (accounts && accounts.length >= 2) {
                setNewJournal((prev) => ({
                  ...prev,
                  lines: [
                    {
                      account_id: accounts[0].id,
                      debit: 250000,
                      credit: 0,
                      description: 'Debet Akun',
                    },
                    {
                      account_id: accounts[1].id,
                      debit: 0,
                      credit: 250000,
                      description: 'Kredit Akun',
                    },
                  ],
                }));
              }
              setIsJournalModalOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all duration-150 active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            <span>Buat Jurnal Baru</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Akun Aktif (CoA)</span>
            <BookOpen className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{accounts?.length || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Struktur bagan akun standar SPPG</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Entri Jurnal</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{journalEntries?.length || 0}</p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Semua entri terverifikasi balance</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Otomatisasi Rekonsiliasi</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-300">Aktif (23:59 WIB)</p>
          <p className="text-[11px] text-slate-400 mt-1">Auto journal HPP vs Persediaan</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('JOURNALS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'JOURNALS'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Buku Jurnal Umum (Double-Entry)</span>
        </button>

        <button
          onClick={() => setActiveTab('COA')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-2 ${
            activeTab === 'COA'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Bagan Akun (Chart of Accounts)</span>
        </button>
      </div>

      {/* TAB 1: JOURNAL ENTRIES */}
      {activeTab === 'JOURNALS' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Daftar Transaksi Jurnal Double-Entry</h3>
            <span className="text-xs text-slate-400">{journalEntries?.length || 0} entri</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">No. Jurnal</th>
                  <th className="p-3.5 font-semibold">Tanggal</th>
                  <th className="p-3.5 font-semibold">Deskripsi Transaksi</th>
                  <th className="p-3.5 font-semibold">Referensi</th>
                  <th className="p-3.5 font-semibold">Total Debit</th>
                  <th className="p-3.5 font-semibold">Total Credit</th>
                  <th className="p-3.5 font-semibold">Status Auto</th>
                  <th className="p-3.5 font-semibold text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isJournalsLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Memuat jurnal...
                    </td>
                  </tr>
                ) : journalEntries && journalEntries.length > 0 ? (
                  journalEntries.map((j) => {
                    const isExpanded = expandedEntryId === j.id;
                    return (
                      <React.Fragment key={j.id}>
                        <tr className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-mono text-blue-400 font-semibold">
                            {j.entry_number}
                          </td>
                          <td className="p-3.5 text-slate-400">{formatDate(j.entry_date)}</td>
                          <td className="p-3.5 font-medium text-white max-w-xs truncate">
                            {j.description}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">
                            {j.reference_type} #{j.reference_id || '-'}
                          </td>
                          <td className="p-3.5 font-semibold text-emerald-400">
                            {formatIDR(j.total_debit)}
                          </td>
                          <td className="p-3.5 font-semibold text-emerald-400">
                            {formatIDR(j.total_credit)}
                          </td>
                          <td className="p-3.5">
                            {j.is_auto_reconciled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                AUTO 23:59
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                MANUAL
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setExpandedEntryId(isExpanded ? null : j.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Journal Lines */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80 border-b border-slate-800">
                            <td colSpan={8} className="p-4">
                              <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                                <div className="p-3 bg-slate-950/40 text-[11px] font-bold text-slate-400 border-b border-slate-800 flex justify-between">
                                  <span>Rincian Baris Jurnal (Lines):</span>
                                  <span className="text-emerald-400">Double-Entry Balance Verified</span>
                                </div>
                                <table className="w-full text-xs">
                                  <thead className="text-slate-500 border-b border-slate-800 text-[11px]">
                                    <tr>
                                      <th className="p-2.5 text-left">Akun</th>
                                      <th className="p-2.5 text-left">Keterangan</th>
                                      <th className="p-2.5 text-right">Debit</th>
                                      <th className="p-2.5 text-right">Credit</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    {j.lines?.map((line) => (
                                      <tr key={line.id}>
                                        <td className="p-2.5 font-mono text-slate-300">
                                          {line.account?.code} - {line.account?.name}
                                        </td>
                                        <td className="p-2.5 text-slate-400">
                                          {line.description || '-'}
                                        </td>
                                        <td className="p-2.5 text-right font-semibold text-white">
                                          {line.debit > 0 ? formatIDR(line.debit) : '-'}
                                        </td>
                                        <td className="p-2.5 text-right font-semibold text-white">
                                          {line.credit > 0 ? formatIDR(line.credit) : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Belum ada catatan jurnal umum.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CHART OF ACCOUNTS */}
      {activeTab === 'COA' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Bagan Akun Standar SPPG</h3>
            <span className="text-xs text-slate-400">{accounts?.length || 0} akun</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5 font-semibold">Kode Akun</th>
                  <th className="p-3.5 font-semibold">Nama Akun</th>
                  <th className="p-3.5 font-semibold">Klasifikasi</th>
                  <th className="p-3.5 font-semibold">Posisi Normal</th>
                  <th className="p-3.5 font-semibold">Deskripsi</th>
                  <th className="p-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {isAccountsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Memuat akun...
                    </td>
                  </tr>
                ) : accounts && accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5 font-mono text-blue-400 font-bold">{acc.code}</td>
                      <td className="p-3.5 font-medium text-white">{acc.name}</td>
                      <td className="p-3.5">
                        <StatusBadge status={acc.type} />
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">{acc.normal_balance}</td>
                      <td className="p-3.5 text-slate-400">{acc.description || '-'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          AKTIF
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Belum ada bagan akun terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH AKUN COA */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Tambah Akun Baru (Chart of Accounts)"
        description="Daftarkan kode dan klasifikasi akun untuk pembukuan SPPG."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createAccountMutation.mutate(newAccount);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Akun</label>
            <input
              type="text"
              required
              placeholder="Contoh: 1-1302"
              value={newAccount.code}
              onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Akun</label>
            <input
              type="text"
              required
              placeholder="Contoh: Persediaan Bahan Makanan Kering"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Klasifikasi</label>
              <select
                value={newAccount.type}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, type: e.target.value as AccountType })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ASSET">ASSET (Aset)</option>
                <option value="LIABILITY">LIABILITY (Kewajiban)</option>
                <option value="EQUITY">EQUITY (Modal)</option>
                <option value="REVENUE">REVENUE (Pendapatan)</option>
                <option value="COGS">COGS (Beban Pokok Produksi)</option>
                <option value="EXPENSE">EXPENSE (Beban Operasional)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Saldo Normal
              </label>
              <select
                value={newAccount.normal_balance}
                onChange={(e) =>
                  setNewAccount({
                    ...newAccount,
                    normal_balance: e.target.value as 'DEBIT' | 'CREDIT',
                  })
                }
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="DEBIT">DEBIT</option>
                <option value="CREDIT">CREDIT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi</label>
            <input
              type="text"
              value={newAccount.description}
              onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAccountModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createAccountMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              {createAccountMutation.isPending ? 'Menyimpan...' : 'Simpan Akun CoA'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: BUAT JURNAL MANUAL */}
      <Modal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        title="Buat Entri Jurnal Double-Entry Baru"
        description="Pastikan total nilai debit sama persis dengan total nilai kredit (balance)."
        maxWidth="2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isJournalBalanced) return;
            createJournalMutation.mutate(newJournal);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tanggal Jurnal
              </label>
              <input
                type="date"
                required
                value={newJournal.entry_date}
                onChange={(e) => setNewJournal({ ...newJournal, entry_date: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipe Referensi
              </label>
              <input
                type="text"
                required
                value={newJournal.reference_type}
                onChange={(e) => setNewJournal({ ...newJournal, reference_type: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Deskripsi Transaksi
            </label>
            <input
              type="text"
              required
              value={newJournal.description}
              onChange={(e) => setNewJournal({ ...newJournal, description: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Dynamic Lines */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Baris Jurnal (Minimal 2 Akun Berpasangan)
              </label>
              <button
                type="button"
                onClick={addJournalLine}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Baris</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {newJournal.lines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800"
                >
                  <div className="flex-1">
                    <select
                      value={line.account_id}
                      onChange={(e) => updateJournalLine(idx, 'account_id', e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      required
                    >
                      <option value="">Pilih Akun...</option>
                      {accounts?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Debit"
                      value={line.debit}
                      onChange={(e) =>
                        updateJournalLine(idx, 'debit', parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div className="w-28">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Credit"
                      value={line.credit}
                      onChange={(e) =>
                        updateJournalLine(idx, 'credit', parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  {newJournal.lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeJournalLine(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Balance Summary Display */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                isJournalBalanced
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4" />
                <span>
                  Total Debit: <strong>{formatIDR(totalDebitSum)}</strong> | Total Credit:{' '}
                  <strong>{formatIDR(totalCreditSum)}</strong>
                </span>
              </div>
              <span className="font-bold">
                {isJournalBalanced ? '✓ BALANCE' : '✗ TIDAK SEIMBANG'}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsJournalModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isJournalBalanced || createJournalMutation.isPending}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all ${
                isJournalBalanced
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                  : 'bg-slate-800 opacity-50 cursor-not-allowed'
              }`}
            >
              {createJournalMutation.isPending ? 'Menyimpan...' : 'Posting Jurnal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: HASIL REKONSILIASI */}
      <Modal
        isOpen={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        title="Laporan Eksekusi Rekonsiliasi Harian"
        description="Hasil posting otomatis buku besar terhadap seluruh aktivitas pengiriman dan stok."
      >
        {reconResult && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal Rekonsiliasi:</span>
                <span className="text-white font-semibold">{reconResult.reconciliation_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Pengiriman Selesai:</span>
                <span className="text-white font-semibold">
                  {reconResult.total_distributions_count} transaksi
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Porsi Terkirim:</span>
                <span className="text-white font-semibold">
                  {reconResult.total_portions_delivered} porsi
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Nilai HPP Diakui:</span>
                <span className="text-emerald-400 font-bold">
                  {formatIDR(reconResult.total_stock_out_cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nomor Jurnal Terbit:</span>
                <span className="text-blue-400 font-mono font-bold">
                  {reconResult.journal_entry_number || '-'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
              {reconResult.message}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsReconModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
