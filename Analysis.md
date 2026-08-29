# Komparasi Sistem MBG vs Realita Lapangan & Rencana Perbaikan (Diperbarui berdasarkan Dokumen Resmi BGN)

> [!IMPORTANT]
> Dokumen ini membandingkan implementasi sistem saat ini dengan **realita operasional program Makan Bergizi Gratis (MBG)** berdasarkan referensi resmi:
> 1. Juknis Tata Kelola Penyelenggaraan Program MBG
> 2. Juknis Penggunaan Dana MBG
> 3. Pedoman Tata Kelola MBG Selama Libur Sekolah
> 4. Pedoman Sertifikasi Keamanan Pangan SPPG
> 5. Juknis Penyediaan dan Distribusi Susu MBG

---

## Ringkasan Eksekutif

Sistem saat ini sudah kuat di aspek logistik inventaris (FEFO) dan kalkulasi keuangan dasar. Namun, berdasarkan analisis dokumen Juknis resmi BGN terbaru, sistem memerlukan penyesuaian besar untuk mematuhi regulasi operasional, terutama terkait manajemen menu, quality control/sertifikasi, manajemen dana via Virtual Account (VA), dan distribusi yang kompleks (termasuk saat libur sekolah).

---

## A. Hal yang SUDAH BENAR dan Sesuai Lapangan

| # | Aspek | Status Sistem | Kesesuaian Lapangan (Berdasarkan Juknis) |
|---|---|---|---|
| 1 | **FEFO Stock Depletion** | ✅ Row-lock `FOR UPDATE` | Sesuai — SPPG wajib menggunakan bahan secara efektif dan menghindari expired. |
| 2 | **Kalkulasi COGS** | ✅ Kalkulasi otomatis | Sesuai — SPPG harus mengelola biaya *at cost* dengan pagu maksimal (misal Rp 15.000/porsi). |
| 3 | **Double-Entry Accounting** | ✅ Balance constraint | Sesuai — Pertanggungjawaban keuangan harus teraudit dan seimbang. |

---

## B. GAP ANALYSIS: Sistem vs Regulasi Resmi BGN

### 🔴 GAP 1 — Penerima Manfaat & Skema Distribusi yang Beragam

> [!CAUTION]
> **Juknis MBG & Pedoman Libur Sekolah:** Penerima manfaat mencakup siswa (PAUD-SMA, SLB, Pesantren) dan Kelompok 3B (Ibu Hamil, Ibu Menyusui, Anak Balita). Distribusi ke siswa menggunakan *Food Tray*, sedangkan Kelompok 3B menggunakan *Totebag*. Saat hari libur, sistem distribusi berubah menggunakan *Totebag* dan menu berupa makanan kemasan (Susu UHT, roti, dll).
>
> **Sistem Saat Ini:** Hanya mengenal entitas `School`. Tidak mendukung Posyandu atau skema distribusi libur/kemasan.

**Rencana Perbaikan:**
- Refaktor `School` menjadi `DistributionPoint` dengan tipe (Sekolah, Posyandu, Pesantren).
- Tambahkan dukungan untuk jenis paket distribusi: `Siap Santap` (*Food Tray*) vs `Kemasan` (*Totebag*).
- Tambahkan penjadwalan khusus untuk hari libur.

### 🔴 GAP 2 — Standar Keamanan Pangan (SLHS & HACCP) dan Quality Control

> [!CAUTION]
> **Pedoman Sertifikasi Keamanan Pangan:** SPPG wajib memiliki Sertifikat Laik Higiene Sanitasi (SLHS) dan menerapkan HACCP. Terdapat checklist panjang terkait sanitasi bangunan, air, pest control, dan personal hygiene. Ada 2 kali uji organoleptik wajib (saat serah terima dan sebelum dikonsumsi).
>
> **Sistem Saat Ini:** Tidak ada modul QC, checklist higiene, atau pencatatan uji organoleptik.

**Rencana Perbaikan:**
- Buat modul `Quality Control` yang mengakomodasi formulir SLHS dan HACCP.
- Wajibkan pencatatan suhu (`Cold Chain`) terutama untuk penyimpanan bahan baku dan susu pasteurisasi (wajib ≤ 4°C).
- Pencatatan form Uji Organoleptik dan *Food Sample* (disimpan 3 hari).

### 🔴 GAP 3 — Mekanisme Pencairan & Penggunaan Dana (Virtual Account & Laporan Berkala)

> [!CAUTION]
> **Juknis Penggunaan Dana MBG:** Pencairan dana menggunakan mekanisme *auto top-up* ke rekening Virtual Account (VA) SPPG berdasarkan Laporan Penggunaan Dana Harian melalui sistem SIPGN. SPPG juga wajib membuat Laporan 2 Mingguan (LPA) dan Laporan Bulanan.
>
> **Sistem Saat Ini:** Tidak ada pencatatan rekening VA, sinkronisasi *auto top-up*, dan generator laporan periodik spesifik BGN.

**Rencana Perbaikan:**
- Tambahkan manajemen `Virtual Account` (Maker & Approver) pada modul Finance.
- Buat modul `Reporting` untuk generate: (1) Buku Kas Umum, (2) Laporan Penggunaan Dana Harian, (3) Laporan 2 Mingguan, (4) Buku Bantu (Petty Cash, Bahan Pangan).

### 🟡 GAP 4 — Siklus Menu & Standar Gizi (AKG)

> [!WARNING]
> **Juknis MBG & Juknis Susu:** Menu harus disusun dalam "Siklus 20 Hari" dan wajib memenuhi 20-35% Angka Kecukupan Gizi (AKG) harian (kalori, protein, lemak, karbohidrat). Susu merupakan komponen wajib (UHT atau Pasteurisasi).
>
> **Sistem Saat Ini:** `meal_name` hanya *free text*. Tidak ada validasi gizi atau manajemen siklus menu.

**Rencana Perbaikan:**
- Buat modul `Menu Planning` (Siklus Menu 20 hari).
- Integrasikan master data bahan baku dengan nilai gizi per gram.
- Hitung total Kalori, Protein, Lemak secara otomatis berdasarkan resep untuk memastikan pemenuhan AKG.

### 🟡 GAP 5 — Manajemen Relawan dan SDM

> [!WARNING]
> **Juknis MBG:** SPPG (kapasitas 3000 porsi) wajib memiliki struktur organisasi baku (Kepala SPPG, Pengawas Gizi, Pengawas Keuangan, Pengawas Sanitasi, Juru Masak, dll) dengan total hingga ~50 relawan.
>
> **Sistem Saat Ini:** Role IAM sangat terbatas (ADMIN, FINANCE, WAREHOUSE).

**Rencana Perbaikan:**
- Perluas struktur `Role` di IAM untuk mencakup Kepala SPPG, Ahli Gizi, QC, dan Relawan.
- Tambahkan fitur pencatatan absensi/kehadiran relawan untuk perhitungan insentif.

---

## C. Kesimpulan & Rekomendasi Prioritas

Analisis terhadap dokumen Juknis resmi BGN mengkonfirmasi bahwa sistem perlu segera direfaktor untuk beralih dari sekadar sistem inventaris/akuntansi menjadi **Sistem Manajemen Operasional SPPG yang Terstandarisasi BGN**.

**Prioritas Utama (Wajib BGN):**
1. **Model Data Penerima Manfaat:** Perluas dukungan untuk Posyandu dan Ibu Hamil/Balita (Kelompok 3B).
2. **Keuangan & Reporting:** Implementasikan alur pelaporan dana harian/2-mingguan untuk mendukung sistem *auto top-up* VA BGN.
3. **Keamanan Pangan:** Implementasikan form Uji Organoleptik dan pencatatan *Cold Chain* (khususnya untuk Susu).
4. **Perencanaan Menu:** Buat fitur Siklus Menu 20 hari terintegrasi dengan validasi AKG.
