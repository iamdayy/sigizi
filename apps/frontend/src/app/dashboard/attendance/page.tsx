'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { ApiResponse, Attendance } from '@daydev/shared-types';
import { useAuth } from '@/lib/auth-context';
import {
  UserCheck,
  MapPin,
  Camera,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [shift, setShift] = useState('PAGI');
  const [notes, setNotes] = useState('');
  const [locationStatus, setLocationStatus] = useState('Mendeteksi GPS...');

  // Auto detect GPS coordinates
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationStatus(`GPS Terkunci: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        },
        (error) => {
          // Default to Jakarta SPPG Office coordinates for demo/fallback
          setLatitude(-6.29412);
          setLongitude(106.82345);
          setLocationStatus('GPS Manual SPPG: -6.294120, 106.823450 (Jakarta Selatan)');
        }
      );
    }
  }, []);

  // Today attendance
  const { data: todayAttendance, isLoading: isTodayLoading } = useQuery<Attendance | null>({
    queryKey: ['attendance-today', user?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<Attendance>>('/attendance/today');
        return res.data.data;
      } catch (err) {
        return null;
      }
    },
    enabled: !!user,
  });

  // Attendance History List
  const { data: attendanceList, isLoading: isListLoading } = useQuery<Attendance[]>({
    queryKey: ['attendance-list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Attendance[]>>('/attendance');
      return res.data.data;
    },
  });

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/attendance/check-in', {
        photo_url: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        latitude,
        longitude,
        work_shift: shift,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
      setNotes('');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/attendance/check-out', {
        photo_url: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        latitude,
        longitude,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-list'] });
      setNotes('');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-teal-400" />
            Presensi & Kehadiran Relawan SPPG (GPS + Foto)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan absensi harian relawan dapur, pengawas gizi, dan driver armada dengan verifikasi koordinat GPS & Foto.
          </p>
        </div>
      </div>

      {/* Check-In / Check-Out Action Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white shadow-sm border border-slate-200 rounded-2xl p-5 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              Presensi Hari Ini
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200/60">
              <span className="text-xs text-slate-500 font-medium">Petugas / Relawan:</span>
              <div className="font-bold text-slate-100">{user?.full_name || 'Relawan SPPG'}</div>
              <div className="text-xs text-teal-400 font-semibold mt-0.5">{user?.role}</div>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>Status Lokasi GPS:</span>
              </div>
              <div className="text-xs text-slate-600 font-mono break-all">{locationStatus}</div>
            </div>

            {!todayAttendance ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Shift Kerja</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="PAGI">Shift Pagi (04:00 - 12:00 WIB)</option>
                    <option value="SIANG">Shift Siang (10:00 - 18:00 WIB)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan (Opsional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Misal: Bertugas di bagian pemotongan protein"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-brand-dark font-bold rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {checkInMutation.isPending ? 'Merekam Lokasi...' : 'Lakukan Check-In Masuk'}
                </button>
              </div>
            ) : !todayAttendance.check_out ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                  ✓ Anda telah Check-In pukul{' '}
                  <span className="font-bold font-mono">
                    {new Date(todayAttendance.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Catatan Check-Out</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Misal: Pekerjaan dapur selesai bersih"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <button
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-brand-dark font-bold rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-5 h-5" />
                  {checkOutMutation.isPending ? 'Merekam...' : 'Lakukan Check-Out Pulang'}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-100/80 border border-slate-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-slate-100">Presensi Lengkap Hari Ini</div>
                <p className="text-xs text-slate-500">
                  Masuk: {new Date(todayAttendance.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} |
                  Pulang: {new Date(todayAttendance.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="md:col-span-2 bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-primary" />
              Riwayat Presensi Seluruh Personel & Relawan SPPG
            </h3>
            <span className="text-xs text-slate-500">Terverifikasi GPS Satelit</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Nama Petugas / Relawan</th>
                  <th className="p-3">Peran</th>
                  <th className="p-3">Check-In</th>
                  <th className="p-3">Check-Out</th>
                  <th className="p-3">Koordinat GPS</th>
                  <th className="p-3">Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceList && attendanceList.length > 0 ? (
                  attendanceList.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-100">{att.date}</td>
                      <td className="p-3 font-semibold text-brand-dark">{att.user?.full_name || 'Relawan Dapur'}</td>
                      <td className="p-3 text-xs text-slate-500">{att.user?.role || 'VOLUNTEER'}</td>
                      <td className="p-3 text-emerald-600 font-mono font-bold">
                        {new Date(att.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-amber-600 font-mono font-bold">
                        {att.check_out
                          ? new Date(att.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="p-3 text-xs text-slate-500 font-mono">
                        {att.check_in_latitude ? `${att.check_in_latitude.toFixed(4)}, ${att.check_in_longitude?.toFixed(4)}` : 'Kantor SPPG'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
                          {att.work_shift || 'PAGI'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Belum ada catatan presensi hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
