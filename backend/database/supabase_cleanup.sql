-- =====================================================
-- PDV MASTER - LIMPEZA COMPLETA DO BANCO
-- Execute ESTE script PRIMEIRO para limpar tudo
-- ATENÇÃO: Isso apaga TODOS os dados!
-- =====================================================

-- 1. Remover triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS update_financial_records_updated_at ON financial_records;

-- 2. Remover tabelas (ordem reversa devido às foreign keys)
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS cash_registers CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Remover funções
DROP FUNCTION IF EXISTS decrement_stock(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS update_register_balance(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS get_register_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 4. Remover tipos (ENUMs)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS register_status CASCADE;
DROP TYPE IF EXISTS financial_type CASCADE;
DROP TYPE IF EXISTS tax_group CASCADE;
DROP TYPE IF EXISTS unit_type CASCADE;
DROP TYPE IF EXISTS origin_code CASCADE;

-- Pronto! Agora execute o script supabase_complete_migration.sql
