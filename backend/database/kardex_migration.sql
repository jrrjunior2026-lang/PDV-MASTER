-- =====================================================
-- PDV MASTER - KARDEX (ESTOQUE) MIGRATION
-- =====================================================

-- 1. Atualizar o tipo transaction_type para incluir ENTRY
-- Nota: No PostgreSQL, não é possível remover valores de um ENUM facilmente, 
-- mas podemos adicionar novos.
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'ENTRY';

-- 2. Criar a tabela kardex se não existir
CREATE TABLE IF NOT EXISTS kardex (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    balance_after DECIMAL(10,3) NOT NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL,
    document_ref VARCHAR(50),
    description TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_kardex_product_id ON kardex(product_id);
CREATE INDEX IF NOT EXISTS idx_kardex_date ON kardex(date DESC);

-- 4. Função para atualizar o estoque automaticamente ao inserir no Kardex
CREATE OR REPLACE FUNCTION update_product_stock_from_kardex()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for uma VENDA, subtrai do estoque
    IF NEW.type = 'SALE' THEN
        UPDATE products 
        SET stock = stock - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        
    -- Se for uma ENTRADA ou SUPRIMENTO (de produto), soma ao estoque
    ELSIF NEW.type = 'ENTRY' OR NEW.type = 'SUPPLY' THEN
        UPDATE products 
        SET stock = stock + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        
    -- Se for um AJUSTE, define o valor exato (o balance_after)
    ELSIF NEW.type = 'ADJUSTMENT' THEN
        UPDATE products 
        SET stock = NEW.balance_after,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para chamar a função
DROP TRIGGER IF EXISTS trg_kardex_stock_update ON kardex;
CREATE TRIGGER trg_kardex_stock_update
    AFTER INSERT ON kardex
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock_from_kardex();

-- 6. RLS Policies para Kardex
ALTER TABLE kardex ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura total do kardex para usuários autenticados" ON kardex;
CREATE POLICY "Permitir leitura total do kardex para usuários autenticados" 
ON kardex FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção no kardex para usuários autenticados" ON kardex;
CREATE POLICY "Permitir inserção no kardex para usuários autenticados" 
ON kardex FOR INSERT 
TO authenticated 
WITH CHECK (true);
