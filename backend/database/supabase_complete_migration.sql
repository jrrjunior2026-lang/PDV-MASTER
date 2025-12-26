-- =====================================================
-- PDV MASTER - SUPABASE COMPLETE MIGRATION
-- Execute este script COMPLETO no SQL Editor do Supabase
-- =====================================================

-- 1. Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tipos e Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('SALE', 'ADJUSTMENT', 'SUPPLY', 'BLEED', 'OPENING', 'CLOSING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('CASH', 'PIX', 'CARD', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE register_status AS ENUM ('OPEN', 'CLOSED', 'COUNTING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE financial_type AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tax_group AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE unit_type AS ENUM ('UN', 'KG', 'L', 'M');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE origin_code AS ENUM ('0', '1', '2');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Tabelas
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CASHIER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    min_stock DECIMAL(10,3) DEFAULT 0,
    ncm VARCHAR(11),
    cest VARCHAR(8),
    origin origin_code DEFAULT '0',
    tax_group tax_group,
    unit unit_type DEFAULT 'UN',
    barcode VARCHAR(50),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    document VARCHAR(18),
    email VARCHAR(150),
    phone VARCHAR(20),
    address TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_debt DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status register_status NOT NULL DEFAULT 'CLOSED',
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    operator_id UUID NOT NULL REFERENCES users(id),
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    final_count DECIMAL(10,2),
    difference DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    customer_id UUID REFERENCES customers(id),
    operator_id UUID NOT NULL REFERENCES users(id),
    register_id UUID REFERENCES cash_registers(id),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(8,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    UNIQUE(sale_id, product_id)
);

CREATE TABLE IF NOT EXISTS financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type financial_type NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reference_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Funções Auxiliares
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, p_qty DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE products 
    SET stock = stock - p_qty,
        updated_at = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_register_balance(p_register_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE cash_registers 
    SET current_balance = current_balance + p_amount
    WHERE id = p_register_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_register_summary(p_register_id UUID)
RETURNS TABLE (
    opening_balance DECIMAL,
    total_supplies DECIMAL,
    total_bleeds DECIMAL,
    total_sales DECIMAL,
    calculated_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH tx_summary AS (
        SELECT 
            COALESCE(SUM(amount) FILTER (WHERE type = 'SUPPLY'), 0) as supplies,
            COALESCE(SUM(amount) FILTER (WHERE type = 'BLEED'), 0) as bleeds,
            COALESCE(SUM(amount) FILTER (WHERE type = 'SALE'), 0) as sales
        FROM cash_transactions
        WHERE register_id = p_register_id
    )
    SELECT 
        cr.opening_balance,
        ts.supplies,
        ts.bleeds,
        ts.sales,
        (cr.opening_balance + ts.supplies + ts.sales - ts.bleeds) as calculated
    FROM cash_registers cr, tx_summary ts
    WHERE cr.id = p_register_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_records_updated_at ON financial_records;
CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON financial_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Dados Iniciais
-- IMPORTANTE: O usuário admin será criado via script separado (supabase_create_admin.sql)
-- pois agora usamos Supabase Auth

-- Configurações Iniciais
INSERT INTO settings (key, value, description, is_system) VALUES
('company', '{"corporateName": "Minha Loja LTDA", "fantasyName": "PDV Master", "cnpj": "00.000.000/0001-00"}'::jsonb, 'Dados da empresa', false),
('fiscal', '{"environment": "2", "nfceSeries": 1}'::jsonb, 'Configurações fiscais', false),
('payment', '{"pixKey": "00.000.000/0001-00", "pixKeyType": "CNPJ"}'::jsonb, 'Configurações de pagamento', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- PRÓXIMO PASSO: Execute o script supabase_create_admin.sql
-- para criar o usuário administrador
-- =====================================================
