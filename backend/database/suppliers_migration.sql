-- Migration: Add Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL CHECK (name != ''),
    document VARCHAR(18) UNIQUE NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (optional but good for consistency)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
