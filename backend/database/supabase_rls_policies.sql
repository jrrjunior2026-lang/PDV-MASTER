-- =====================================================
-- PDV MASTER - SUPABASE COMPLETE MIGRATION
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================
-- Allow users to read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid()::text = id::text);

-- Allow admins to read all users
CREATE POLICY "Admins can read all users"
ON users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- =====================================================
-- SETTINGS TABLE POLICIES
-- =====================================================
-- Everyone can read settings (needed for logo, company info)
CREATE POLICY "Anyone can read settings"
ON settings FOR SELECT
TO authenticated
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- =====================================================
-- PRODUCTS TABLE POLICIES
-- =====================================================
-- Everyone can read active products
CREATE POLICY "Anyone can read products"
ON products FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can manage products
CREATE POLICY "Admins can manage products"
ON products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- =====================================================
-- CUSTOMERS TABLE POLICIES
-- =====================================================
-- Everyone can read active customers
CREATE POLICY "Anyone can read customers"
ON customers FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can manage customers
CREATE POLICY "Admins can manage customers"
ON customers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- =====================================================
-- SALES TABLE POLICIES
-- =====================================================
-- Users can read their own sales
CREATE POLICY "Users can read own sales"
ON sales FOR SELECT
TO authenticated
USING (operator_id::text = auth.uid()::text);

-- Admins can read all sales
CREATE POLICY "Admins can read all sales"
ON sales FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- Users can create sales
CREATE POLICY "Users can create sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (operator_id::text = auth.uid()::text);

-- =====================================================
-- SALE ITEMS TABLE POLICIES
-- =====================================================
-- Users can read sale items from their sales
CREATE POLICY "Users can read own sale items"
ON sale_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sale_items.sale_id
    AND sales.operator_id::text = auth.uid()::text
  )
);

-- Admins can read all sale items
CREATE POLICY "Admins can read all sale items"
ON sale_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- Users can create sale items for their sales
CREATE POLICY "Users can create sale items"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sale_items.sale_id
    AND sales.operator_id::text = auth.uid()::text
  )
);

-- =====================================================
-- CASH REGISTERS TABLE POLICIES
-- =====================================================
-- Users can read their own registers
CREATE POLICY "Users can read own registers"
ON cash_registers FOR SELECT
TO authenticated
USING (operator_id::text = auth.uid()::text);

-- Admins can read all registers
CREATE POLICY "Admins can read all registers"
ON cash_registers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- Users can create and update their own registers
CREATE POLICY "Users can manage own registers"
ON cash_registers FOR ALL
TO authenticated
USING (operator_id::text = auth.uid()::text)
WITH CHECK (operator_id::text = auth.uid()::text);

-- =====================================================
-- CASH TRANSACTIONS TABLE POLICIES
-- =====================================================
-- Users can read transactions from their registers
CREATE POLICY "Users can read own transactions"
ON cash_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cash_registers
    WHERE cash_registers.id = cash_transactions.register_id
    AND cash_registers.operator_id::text = auth.uid()::text
  )
);

-- Admins can read all transactions
CREATE POLICY "Admins can read all transactions"
ON cash_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = 'ADMIN'
  )
);

-- Users can create transactions for their registers
CREATE POLICY "Users can create transactions"
ON cash_transactions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cash_registers
    WHERE cash_registers.id = cash_transactions.register_id
    AND cash_registers.operator_id::text = auth.uid()::text
  )
);
