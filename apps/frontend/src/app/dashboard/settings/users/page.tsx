'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { User, CreateUserRequest, UserRole, ApiResponse } from '@daydev/shared-types';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ExportButton from '@/components/ui/ExportButton';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  Key,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    email: '',
    password: 'Password123!',
    full_name: '',
    role: 'WAREHOUSE',
    phone_number: '081299887766',
  });

  // Fetch Users (Requires ADMIN role)
  const {
    data: users,
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User[]>>('/users');
      return res.data.data;
    },
    enabled: currentUser?.role === 'ADMIN',
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: CreateUserRequest) => {
      const res = await apiClient.post<ApiResponse<User>>('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setIsCreateModalOpen(false);
      setNewUser({
        email: '',
        password: 'Password123!',
        full_name: '',
        role: 'WAREHOUSE',
        phone_number: '081299887766',
      });
    },
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            <span>KEPALA SPPG (ADMIN)</span>
          </span>
        );
      case 'FINANCE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>FINANCE & COGS</span>
          </span>
        );
      case 'WAREHOUSE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>GUDANG & FEFO</span>
          </span>
        );
      default:
        return <StatusBadge status={role} />;
    }
  };

  // Guard for Non-Admin view
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-xl mx-auto my-12 animate-in fade-in">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Akses Dibatasi</h2>
        <p className="text-xs text-slate-400">
          Halaman Manajemen Pengguna hanya dapat diakses oleh peran <strong>ADMIN (Kepala SPPG)</strong>.
          Role Anda saat ini adalah <strong>{currentUser?.role}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Otoritas & Akses Sistem SPPG</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola staf operasional SPPG dengan pembagian peran berbasis Role-Based Access Control (RBAC).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportButton filename="daftar-pengguna-sppg.xlsx" label="Export User" />
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-all duration-150 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Role Definitions Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
          <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>ADMIN (Kepala SPPG)</span>
          </div>
          <p className="text-xs text-slate-300">
            Akses penuh ke seluruh modul, audit laporan BAST resmi, dan konfigurasi pengguna.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-2">
            <Shield className="w-4 h-4" />
            <span>FINANCE (Keuangan & HPP)</span>
          </div>
          <p className="text-xs text-slate-300">
            Analisis dynamic COGS dapur, kalkulasi margin, posting jurnal umum, dan BAST generator.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs mb-2">
            <Shield className="w-4 h-4" />
            <span>WAREHOUSE (Gudang & Logistik)</span>
          </div>
          <p className="text-xs text-slate-300">
            Penerimaan batch bahan, pemantauan tanggal kadaluarsa FEFO, dan update pengiriman sekolah.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Daftar Pengguna Terdaftar</h3>
          <span className="text-xs text-slate-400">{users?.length || 0} akun aktif</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5 font-semibold">Nama Lengkap</th>
                <th className="p-3.5 font-semibold">Email</th>
                <th className="p-3.5 font-semibold">Peran (Role)</th>
                <th className="p-3.5 font-semibold">Nomor Telepon</th>
                <th className="p-3.5 font-semibold">Status Akun</th>
                <th className="p-3.5 font-semibold">Tanggal Dibuat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : users && users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{u.full_name}</p>
                          <p className="text-[10px] font-mono text-slate-500">ID: {u.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{u.email}</td>
                    <td className="p-3.5">{getRoleBadge(u.role)}</td>
                    <td className="p-3.5 font-mono text-slate-400">{u.phone_number || '-'}</td>
                    <td className="p-3.5">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          AKTIF
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          NONAKTIF
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-400">{formatDate(u.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Tidak ada akun ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: TAMBAH PENGGUNA BARU */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Daftarkan Pengguna Baru SPPG"
        description="Buat akun baru dengan hak akses yang terisolasi sesuai tanggung jawab operasional."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate(newUser);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              placeholder="Contoh: Ahmad Fauzi, S.Kom"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Resmi</label>
            <input
              type="email"
              required
              placeholder="nama@sppg.kemang.id"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Peran (Role)</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ADMIN">ADMIN (Kepala SPPG)</option>
                <option value="FINANCE">FINANCE (Keuangan & HPP)</option>
                <option value="WAREHOUSE">WAREHOUSE (Gudang & FEFO)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password Awal
              </label>
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nomor WhatsApp / Kontak
            </label>
            <input
              type="text"
              placeholder="0812xxxxxxxx"
              value={newUser.phone_number}
              onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
            >
              {createUserMutation.isPending ? 'Menyimpan...' : 'Daftarkan Pengguna'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
