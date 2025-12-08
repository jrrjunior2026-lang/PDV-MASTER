-- PDV Master - Banco Simples (Semlinks Complexos)
-- PostgreSQL 15+ compatible

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES SIMPLIFICADAS
-- ============================================================================

-- Usuários (simplificada)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'CASHIER',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos (simplificada)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    stock DECIMAL(10,3) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes (simplificada)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendas (simplificada)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    customer_id UUID,
    operator_id UUID NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_cancelled BOOLEAN DEFAULT false,

    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- ============================================================================
-- INDEXES BÁSICOS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_operator ON sales(operator_id);

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Admin user (password: '@admin123')
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES ('Administrador', 'admin@pdvmaster.br',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/leaseUEjgaXK3Ji',
        'ADMIN', true)
ON CONFLICT (email) DO NOTHING;

-- Sample products
INSERT INTO products (code, name, price, stock)
VALUES ('001', 'Arroz 1kg', 7.50, 50),
       ('002', 'Feijão 1kg', 9.90, 30)
ON CONFLICT (code) DO NOTHING;

-- Sample customer
INSERT INTO customers (name)
VALUES ('Cliente Consumidor')
ON CONFLICT DO NOTHING;
