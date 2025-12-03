-- PDV Master Database Schema
-- PostgreSQL 15+ compatible

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- TYPES & ENUMS
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');

-- Transaction types
CREATE TYPE transaction_type AS ENUM ('SALE', 'ADJUSTMENT', 'SUPPLY', 'BLEED', 'OPENING', 'CLOSING');

-- Payment methods
CREATE TYPE payment_method AS ENUM ('CASH', 'PIX', 'CARD', 'CREDIT');

-- Register status
CREATE TYPE register_status AS ENUM ('OPEN', 'CLOSED', 'COUNTING');

-- Financial record types
CREATE TYPE financial_type AS ENUM ('INCOME', 'EXPENSE');

-- Tax groups
CREATE TYPE tax_group AS ENUM ('A', 'B', 'C');

-- Unit types
CREATE TYPE unit_type AS ENUM ('UN', 'KG', 'L', 'M');

-- Origin codes
CREATE TYPE origin_code AS ENUM ('0', '1', '2');

-- Settings environment
CREATE TYPE environment_type AS ENUM ('1', '2'); -- 1=Production, 2=Homologation

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL CHECK (name != ''),
    email VARCHAR(150) UNIQUE NOT NULL CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CASHIER',
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Constraints
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Settings table (company-wide settings)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL CHECK (name != ''),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    stock DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock DECIMAL(10,3) DEFAULT 0 CHECK (min_stock >= 0),
    ncm VARCHAR(11) CHECK (ncm ~ '^\d{4}\.\d{2}\.\d{2}$'),
    cest VARCHAR(8) CHECK (cest ~ '^\d{2}\.\d{3}\.\d{2}$'),
    origin origin_code DEFAULT '0',
    tax_group tax_group,
    unit unit_type DEFAULT 'UN',
    barcode VARCHAR(50),
    description TEXT,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL CHECK (name != ''),
    document VARCHAR(18) CHECK (
        document IS NULL OR
        (length(replace(document, '.', '')) = 11 AND replace(document, '.', '') ~ '^\d{3}\d{3}\d{3}\d{2}$') OR
        (length(replace(document, '.', '')) = 14 AND replace(document, '.', '') ~ '^\d{2}\d{3}\d{3}\d{4}\d{2}$')
    ),
    email VARCHAR(150) CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
    phone VARCHAR(20),
    address TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0 CHECK (credit_limit >= 0),
    current_debt DECIMAL(10,2) DEFAULT 0 CHECK (current_debt >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Sales table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    customer_id UUID,
    operator_id UUID NOT NULL,
    register_id UUID,

    -- Timestamps
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Status and notes
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    cancellation_reason TEXT,
    notes TEXT,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE SET NULL
);

-- Sale items (products in sale)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity DECIMAL(8,3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,

    UNIQUE(sale_id, product_id)
);

-- Cash Registers
CREATE TABLE cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status register_status NOT NULL DEFAULT 'CLOSED',
    opened_at TIMESTAMPTZ,
    operator_id UUID NOT NULL,
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    system_calculated DECIMAL(10,2),
    user_counted DECIMAL(10,2),
    difference DECIMAL(10,2),

    closed_at TIMESTAMPTZ,
    final_count DECIMAL(10,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cash transactions
CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    register_id UUID NOT NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID, -- Sale ID or adjustment ref
    operator_id UUID NOT NULL,

    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Kardex (stock movement ledger)
CREATE TABLE kardex (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    type transaction_type NOT NULL,
    quantity DECIMAL(8,3) NOT NULL,
    balance_after DECIMAL(8,3) NOT NULL,
    sale_id UUID,
    register_id UUID,
    reference_doc VARCHAR(50),
    description TEXT NOT NULL,

    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    FOREIGN KEY (register_id) REFERENCES cash_registers(id) ON DELETE SET NULL
);

-- Financial records (income, expenses)
CREATE TABLE financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type financial_type NOT NULL,
    description TEXT NOT NULL CHECK (description != ''),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PAID', 'PENDING', 'OVERDUE')),
    due_date TIMESTAMPTZ,
    reference_id UUID, -- Sale ID or external reference
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Sync queue (for offline-online synchronization)
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('CREATE', 'UPDATE', 'DELETE')),
    collection VARCHAR(30) NOT NULL,
    data JSONB NOT NULL,
    timestamp BIGINT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCING', 'SUCCESS', 'FAILED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ,

    INDEX (device_id, status, timestamp DESC),
    UNIQUE(device_id, type, collection, (data->>'id'))
);

-- Audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_role user_role,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,

    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Product indexes
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_search ON products USING gin (to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));

-- Customer indexes
CREATE INDEX idx_customers_document ON customers(document);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_active ON customers(is_active);

-- Sale indexes
CREATE INDEX idx_sales_date ON sales(date DESC);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_operator ON sales(operator_id);
CREATE INDEX idx_sales_register ON sales(register_id);

-- Kardex indexes
CREATE INDEX idx_kardex_product ON kardex(product_id);
CREATE INDEX idx_kardex_date ON kardex(date DESC);
CREATE INDEX idx_kardex_type ON kardex(type);

-- Financial records indexes
CREATE INDEX idx_financial_date ON financial_records(date DESC);
CREATE INDEX idx_financial_type_category ON financial_records(type, category);
CREATE INDEX idx_financial_status ON financial_records(status);

-- Audit log indexes
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Sync indexes
CREATE INDEX idx_sync_device_status ON sync_queue(device_id, status);
CREATE INDEX idx_sync_timestamp ON sync_queue(timestamp DESC);
CREATE INDEX idx_sync_retry ON sync_queue(status, retry_count);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_updated_at BEFORE UPDATE ON financial_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stock update trigger
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product stock based on kardex movements
    IF NEW.type = 'SALE' THEN
        UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
    ELSIF NEW.type = 'ADJUSTMENT' THEN
        UPDATE products SET stock = NEW.balance_after WHERE id = NEW.product_id;
    ELSIF NEW.type = 'SUPPLY' THEN
        UPDATE products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER kardex_stock_update
    AFTER INSERT ON kardex
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Initial admin user (password will be hashed by application)
INSERT INTO users (id, name, email, password_hash, role, is_active)
VALUES (uuid_generate_v4(), 'Administrador', 'admin@pdvmaster.br', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/leaseUEjgaXK3Ji', 'ADMIN', true);

-- Default settings
INSERT INTO settings (key, value, description, is_system) VALUES
    ('company', '{
        "corporateName": "Minha Loja LTDA",
        "fantasyName": "PDV Master Supermercados",
        "cnpj": "00.000.000/0001-00",
        "ie": "",
        "taxRegime": "1",
        "address": "Rua Exemplo, 1000 - Centro, São Paulo - SP",
        "phone": "(11) 90000-0000"
    }'::jsonb, 'Dados da empresa', false),

    ('fiscal', '{
        "environment": "2",
        "nfeSeries": 1,
        "nfceSeries": 1,
        "cscId": "000001",
        "cscToken": "TOKEN-DE-HOMOLOGACAO-SEFAZ"
    }'::jsonb, 'Configurações fiscais NFC-e', false),

    ('payment', '{
        "pixKey": "00.000.000/0001-00",
        "pixKeyType": "CNPJ"
    }'::jsonb, 'Configurações de pagamento', false),

    ('system', '{
        "version": "1.0.0",
        "lastMigrate": "2024-01-01T00:00:00Z",
        "syncEnabled": true,
        "cacheEnabled": true
    }'::jsonb, 'Configurações do sistema', true);

-- Sample products
INSERT INTO products (id, code, name, price, cost, stock, ncm, cest, origin, tax_group, unit, min_stock) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '7891000100103', 'Arroz Branco 5kg', 29.90, 22.50, 150, '1006.30.21', '17.001.00', '0', 'A', 'UN', 20),
    ('550e8400-e29b-41d4-a716-446655440001', '7891000200201', 'Feijão Carioca 1kg', 8.50, 5.20, 300, '0713.33.99', '17.002.00', '0', 'A', 'UN', 50),
    ('550e8400-e29b-41d4-a716-446655440002', '7894900011517', 'Refrigerante Cola 2L', 10.99, 7.50, 45, '2202.10.00', '03.007.00', '0', 'B', 'UN', 24);

-- Default customer
INSERT INTO customers (name, document) VALUES
    ('Cliente Consumidor', '000.000.000-00');

-- Sample financial records
INSERT INTO financial_records (type, description, amount, category, status) VALUES
    ('EXPENSE', 'Conta de Energia', 1250.00, 'Utilidades', 'PENDING'),
    ('INCOME', 'Vendas do Dia Anterior', 4500.00, 'Vendas', 'PAID');

COMMIT;
