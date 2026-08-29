# MBG SPPG — Enterprise Logistics & Financial Management System
### Platform Manajemen Program Makan Bergizi Gratis (Satuan Pelayanan Program Gizi - SPPG)

Enterprise-grade logistics and financial ERP designed for **Satuan Pelayanan Program Gizi (SPPG)** under the **Badan Gizi Nasional (BGN)**. 

---

## 🏗️ Architecture Overview

```
mbg-system/
├── apps/
│   ├── backend/               # High-performance Go (Gin + GORM) API Service
│   │   ├── cmd/api/main.go    # Composition Root & HTTP Server
│   │   ├── internal/
│   │   │   ├── config/        # Environment Configuration
│   │   │   ├── database/      # GORM PostgreSQL Connection & Migrations
│   │   │   ├── middleware/    # JWT Auth, RBAC, CORS, TraceID, Rate Limiting
│   │   │   ├── models/        # AuditModel, PostgreSQL DDL Models
│   │   │   ├── modules/
│   │   │   │   ├── iam/          # JWT (15m/7d rotation), RBAC, Navigation
│   │   │   │   ├── inventory/    # FEFO Batch Management & Stock Movements
│   │   │   │   ├── finance/      # CoA, Double-Entry, Dynamic COGS & Recon Cron
│   │   │   │   └── distribution/ # School Deliveries & Automated BAST PDF
│   │   │   ├── scheduler/     # Robfig Cron (23:59 WIB Daily Reconciliation)
│   │   │   └── storage/       # Cloudflare R2 / S3 / Local Disk Fallback
│   │   └── scripts/
│   │       └── schema.sql     # Complete PostgreSQL DDL & Seeds
│   └── frontend/              # Modern Next.js 16 (App Router + Tailwind v4)
│       └── src/
│           ├── app/
│           │   ├── login/     # Enterprise Login with Demo Role Selector
│           │   ├── dashboard/ # Live Real-Time Dashboard (Recharts Gauges)
│           │   └── dashboard/distribution/bast/ # Automated BAST PDF Generator
│           ├── components/    # ProtectedRoute, Dynamic Sidebar, Charts
│           └── lib/           # Axios Interceptor (Auto Refresh), Auth Context
└── packages/
    └── shared-types/          # Strongly-typed TypeScript DTOs & Domain Models
```

---

## 🚀 Key Production Features

### 1. FEFO (First Expired First Out) Perishable Goods Engine
- Database table `item_batches` tracking lot code, unit cost, initial quantity, current quantity, and strict expiry dates.
- Atomic Stock Out depletion within `gorm.Transaction` using row locking (`FOR UPDATE`) ordered chronologically by `expiry_date ASC`.
- Full audit traceability via `stock_movements` recording exact cost snapshots.

### 2. Dynamic Real-Time COGS & Margin Calculator
- COGS is calculated strictly from the exact unit costs of specific batches consumed during meal preparation (not general moving averages).
- Gross Margin is computed per portion (`(15,000 - COGS) / 15,000 * 100`).
- Automated Critical Threshold Flagging (`is_margin_critical = true` when margin &lt; 10%), triggering visual alert banners.

### 3. Automated Daily Financial Reconciliation (Background Job)
- Go background cron job scheduled in `Asia/Jakarta` (WIB) timezone at `23:59 WIB` daily.
- Aggregates daily deliveries and inventory stock-out cost.
- Automatically inserts balanced double-entry accounting records into `journal_entries` table:
  - **Debit:** Beban Pokok Produksi (HPP / COGS - Account `5-1001`)
  - **Credit:** Persediaan Bahan Makanan Basah (Inventory - Account `1-1301`)

### 4. Automated BAST (Berita Acara Serah Terima) PDF Generator
- School recipient and date-range selector.
- Live preview showing total delivered portions and allocated budget.
- Generates official Indonesian government BAST document in PDF with dual signature blocks (Kepala SPPG & Kepala Sekolah).
- Uploads to Cloudflare R2 or local disk storage and archives in `bast_documents`.

---

## 🛠️ Quick Start & Running Locally

### Prerequisites
- Node.js >= 20, `pnpm` >= 9
- Go >= 1.22
- PostgreSQL 16 (or Docker Compose)

### 1. Start Database
```bash
docker-compose up -d postgres
```

### 2. Run Go Backend
```bash
cd apps/backend
go run cmd/api/main.go
# API Server runs on http://localhost:8080
```

### 3. Run Next.js Frontend
```bash
cd apps/frontend
pnpm dev
# Frontend runs on http://localhost:3000
```

### 4. Seeded Demo Accounts (Pre-configured):
| Role | Email | Password |
|---|---|---|
| **Kepala SPPG (Admin)** | `admin@sppg.kemang.id` | `Password123!` |
| **Finance Officer** | `finance@sppg.kemang.id` | `Password123!` |
| **Gudang & Logistik** | `gudang@sppg.kemang.id` | `Password123!` |
