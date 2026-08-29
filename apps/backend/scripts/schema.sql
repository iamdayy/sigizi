-- =============================================================================
-- Makan Bergizi Gratis (MBG) - SPPG Logistics & Financial System
-- Production PostgreSQL Database DDL Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'FINANCE', 'WAREHOUSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_category AS ENUM ('PROTEIN', 'CARBOHYDRATE', 'VEGETABLE', 'FRUIT', 'DAIRY', 'SPICE', 'PACKAGING', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'WASTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reference_type AS ENUM ('PURCHASE_RECEIPT', 'MEAL_PRODUCTION', 'DISTRIBUTION', 'STOCK_OPNAME', 'EXPIRED_DISPOSAL', 'DAILY_RECONCILIATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE normal_balance_type AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE distribution_status AS ENUM ('SCHEDULED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bast_status AS ENUM ('GENERATED', 'SIGNED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 1. IAM MODULE TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'WAREHOUSE',
    phone_number VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =============================================================================
-- 2. INVENTORY MODULE TABLES (FEFO OPTIMIZED)
-- =============================================================================
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category item_category NOT NULL,
    unit VARCHAR(32) NOT NULL,
    min_stock_threshold NUMERIC(15, 4) NOT NULL DEFAULT 0,
    is_perishable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category) WHERE deleted_at IS NULL;

-- Batch-level table for FEFO (First Expired First Out)
CREATE TABLE IF NOT EXISTS item_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    batch_code VARCHAR(64) NOT NULL UNIQUE,
    expiry_date DATE NOT NULL,
    unit_cost NUMERIC(15, 4) NOT NULL CHECK (unit_cost >= 0),
    initial_qty NUMERIC(15, 4) NOT NULL CHECK (initial_qty > 0),
    current_qty NUMERIC(15, 4) NOT NULL CHECK (current_qty >= 0),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- Crucial composite index for FEFO queries: item_id + current_qty > 0 ordered by expiry_date ASC
CREATE INDEX IF NOT EXISTS idx_item_batches_fefo ON item_batches (item_id, expiry_date ASC) WHERE current_qty > 0 AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_batches_expiry ON item_batches (expiry_date);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_batch_id UUID NOT NULL REFERENCES item_batches(id) ON DELETE RESTRICT,
    movement_type movement_type NOT NULL,
    quantity NUMERIC(15, 4) NOT NULL CHECK (quantity > 0),
    reference_type reference_type NOT NULL,
    reference_id VARCHAR(128) NOT NULL,
    notes TEXT,
    unit_cost_snapshot NUMERIC(15, 4) NOT NULL,
    total_cost_snapshot NUMERIC(15, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements(item_batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);

-- =============================================================================
-- 3. FINANCE & ACCOUNTING TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type account_type NOT NULL,
    normal_balance normal_balance_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(64) NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(64) NOT NULL,
    reference_id VARCHAR(128),
    is_auto_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    total_debit NUMERIC(18, 4) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    CONSTRAINT chk_balanced_journal CHECK (total_debit = total_credit)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_number ON journal_entries(entry_number);

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID,
    CONSTRAINT chk_line_nonzero CHECK (debit > 0 OR credit > 0)
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- Meal Production Batches & Dynamic COGS Tracking
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_code VARCHAR(64) NOT NULL UNIQUE,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_name VARCHAR(255) NOT NULL,
    total_portions INTEGER NOT NULL CHECK (total_portions > 0),
    selling_price_per_portion NUMERIC(15, 4) NOT NULL DEFAULT 15000.00,
    total_cogs NUMERIC(18, 4) NOT NULL CHECK (total_cogs >= 0),
    cogs_per_portion NUMERIC(15, 4) NOT NULL CHECK (cogs_per_portion >= 0),
    gross_profit_per_portion NUMERIC(15, 4) NOT NULL,
    total_gross_profit NUMERIC(18, 4) NOT NULL,
    margin_percentage NUMERIC(8, 4) NOT NULL,
    is_margin_critical BOOLEAN NOT NULL DEFAULT FALSE, -- Set TRUE when margin_percentage < 10%
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_production_batches_date ON production_batches(production_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_critical ON production_batches(is_margin_critical);

CREATE TABLE IF NOT EXISTS production_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    item_batch_id UUID NOT NULL REFERENCES item_batches(id) ON DELETE RESTRICT,
    qty_used NUMERIC(15, 4) NOT NULL CHECK (qty_used > 0),
    unit_cost_snapshot NUMERIC(15, 4) NOT NULL,
    total_cost_snapshot NUMERIC(15, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_prod_ing_batch ON production_ingredients(production_batch_id);

-- =============================================================================
-- 4. DISTRIBUTION & BAST MODULE TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npsn VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    contact_person VARCHAR(150) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    total_students INTEGER NOT NULL CHECK (total_students > 0),
    dietary_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_schools_npsn ON schools(npsn) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schools_city ON schools(city) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_number VARCHAR(64) NOT NULL UNIQUE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status distribution_status NOT NULL DEFAULT 'SCHEDULED',
    driver_name VARCHAR(150) NOT NULL,
    vehicle_plate VARCHAR(32) NOT NULL,
    total_portions INTEGER NOT NULL CHECK (total_portions > 0),
    total_value NUMERIC(18, 4) NOT NULL DEFAULT 0,
    recipient_name VARCHAR(150),
    recipient_title VARCHAR(100),
    received_at TIMESTAMPTZ,
    proof_of_delivery_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_distributions_school_date ON distributions(school_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_distributions_status ON distributions(status);

CREATE TABLE IF NOT EXISTS distribution_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_id UUID NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
    meal_name VARCHAR(255) NOT NULL,
    portions_sent INTEGER NOT NULL CHECK (portions_sent > 0),
    portions_received INTEGER NOT NULL DEFAULT 0 CHECK (portions_received >= 0),
    unit_price NUMERIC(15, 4) NOT NULL DEFAULT 15000.00,
    subtotal NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_dist_items_distribution ON distribution_items(distribution_id);

CREATE TABLE IF NOT EXISTS bast_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number VARCHAR(64) NOT NULL UNIQUE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_portions INTEGER NOT NULL CHECK (total_portions > 0),
    total_amount NUMERIC(18, 4) NOT NULL CHECK (total_amount >= 0),
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sppg_head_name VARCHAR(150) NOT NULL,
    school_principal_name VARCHAR(150) NOT NULL,
    status bast_status NOT NULL DEFAULT 'GENERATED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_bast_school_period ON bast_documents(school_id, period_start, period_end);

-- =============================================================================
-- 5. INITIAL SEED DATA (STANDARD INDONESIAN SPPG CoA & ADMIN)
-- =============================================================================
-- Admin user password: 'Password123!' (bcrypt hash)
INSERT INTO users (id, email, password_hash, full_name, role, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'admin@sppg.kemang.id', '$2a$12$K1qP8MvZKxvyZJv.Tj8xqucqv9r3cW4U4E8m880Z6eF1PZ1o5O0fG', 'Dr. Siti Nurhaliza (Kepala SPPG)', 'ADMIN', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'finance@sppg.kemang.id', '$2a$12$K1qP8MvZKxvyZJv.Tj8xqucqv9r3cW4U4E8m880Z6eF1PZ1o5O0fG', 'Budi Santoso, SE (Finance Officer)', 'FINANCE', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'gudang@sppg.kemang.id', '$2a$12$K1qP8MvZKxvyZJv.Tj8xqucqv9r3cW4U4E8m880Z6eF1PZ1o5O0fG', 'Ahmad Dani (Kepala Logistik & Gudang)', 'WAREHOUSE', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Standard Chart of Accounts for Free Nutritious Meal Program
INSERT INTO accounts (id, code, name, type, normal_balance, description)
VALUES
    ('10000000-0000-0000-0000-000000000001', '1-1001', 'Kas & Bank Operasional SPPG', 'ASSET', 'DEBIT', 'Rekening Giro Operasional MBG'),
    ('10000000-0000-0000-0000-000000000002', '1-1002', 'Kas Kecil (Petty Cash)', 'ASSET', 'DEBIT', 'Dana Kas Kecil Dapur & Logistik'),
    ('10000000-0000-0000-0000-000000000003', '1-1301', 'Persediaan Bahan Makanan Basah (Protein & Sayur)', 'ASSET', 'DEBIT', 'Stok Daging, Telur, Ikan, Sayuran'),
    ('10000000-0000-0000-0000-000000000004', '1-1302', 'Persediaan Bahan Kering & Karbohidrat', 'ASSET', 'DEBIT', 'Stok Beras, Minyak, Bumbu Kering'),
    ('10000000-0000-0000-0000-000000000005', '1-1303', 'Persediaan Kemasan & Wadah Higienis', 'ASSET', 'DEBIT', 'Wadah Stainless / Paper Food Tray'),
    ('20000000-0000-0000-0000-000000000001', '2-1001', 'Utang Usaha Supplier Bahan Baku', 'LIABILITY', 'CREDIT', 'Kewajiban kepada Vendor Bahan Baku'),
    ('30000000-0000-0000-0000-000000000001', '3-1001', 'Modal Awal / Alokasi APBN MBG', 'EQUITY', 'CREDIT', 'Alokasi Dana Anggaran Program MBG'),
    ('40000000-0000-0000-0000-000000000001', '4-1001', 'Pendapatan Alokasi Program MBG', 'REVENUE', 'CREDIT', 'Pendapatan Klaim Porsi Tersalurkan'),
    ('50000000-0000-0000-0000-000000000001', '5-1001', 'Beban Pokok Produksi (HPP / COGS Bahan Baku)', 'COGS', 'DEBIT', 'Beban Bahan Makanan Langsung (Per Batch FEFO)'),
    ('50000000-0000-0000-0000-000000000002', '5-1002', 'Beban Kemasan & Distribusi Langsung', 'COGS', 'DEBIT', 'Biaya wadah dan logistik distribusi per porsi'),
    ('60000000-0000-0000-0000-000000000001', '6-1001', 'Beban Operasional Dapur & Utilitas', 'EXPENSE', 'DEBIT', 'Gas LPG, Listrik, Air Bersih, Sanitasi'),
    ('60000000-0000-0000-0000-000000000002', '6-1002', 'Beban Tenaga Kerja Dapur (Cook & Helper)', 'EXPENSE', 'DEBIT', 'Gaji dan insentif juru masak')
ON CONFLICT (code) DO NOTHING;

-- Seed Schools
INSERT INTO schools (id, npsn, name, address, district, city, contact_person, phone_number, total_students)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '20104101', 'SD Negeri 01 Pagi Pasar Minggu', 'Jl. Raya Ragunan No. 12', 'Pasar Minggu', 'Jakarta Selatan', 'Drs. H. Mulyono', '081288991122', 420),
    ('a0000000-0000-0000-0000-000000000002', '20104102', 'SD Negeri 03 Cilandak Timur', 'Jl. Ampera Raya No. 45', 'Cilandak', 'Jakarta Selatan', 'Hj. Endang Suryani, M.Pd', '081399887766', 380),
    ('a0000000-0000-0000-0000-000000000003', '20104103', 'SMP Negeri 41 Jakarta', 'Jl. Harsono RM No. 8', 'Pasar Minggu', 'Jakarta Selatan', 'Bambang Irawan, S.Pd', '081511223344', 650)
ON CONFLICT (npsn) DO NOTHING;

-- Seed Master Items
INSERT INTO items (id, sku, name, category, unit, min_stock_threshold, is_perishable)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'ING-BEEF-01', 'Daging Sapi Segar (Giling/Potong)', 'PROTEIN', 'kg', 20.0000, TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'ING-CHICK-01', 'Daging Ayam Fillet Segar', 'PROTEIN', 'kg', 50.0000, TRUE),
    ('b0000000-0000-0000-0000-000000000003', 'ING-EGG-01', 'Telur Ayam Ras Segar', 'PROTEIN', 'kg', 40.0000, TRUE),
    ('b0000000-0000-0000-0000-000000000004', 'ING-RICE-01', 'Beras Organik Ramos Pulen', 'CARBOHYDRATE', 'kg', 200.0000, FALSE),
    ('b0000000-0000-0000-0000-000000000005', 'ING-VEG-SPINACH', 'Bayam Hijau Segar Hidroponik', 'VEGETABLE', 'kg', 15.0000, TRUE),
    ('b0000000-0000-0000-0000-000000000006', 'ING-VEG-CARROT', 'Wortel Berastagi Segar', 'VEGETABLE', 'kg', 25.0000, TRUE),
    ('b0000000-0000-0000-0000-000000000007', 'ING-FRUIT-BANANA', 'Pisang Cavendish Masak Pohon', 'FRUIT', 'kg', 30.0000, TRUE),
    ('b0000000-0000-0000-0000-000000000008', 'ING-DAIRY-MILK', 'Susu UHT Segar 200ml', 'DAIRY', 'pcs', 500.0000, TRUE)
ON CONFLICT (sku) DO NOTHING;
