-- =====================================================
-- FIX: Corrigir políticas RLS para Settings
-- Execute este script para corrigir o erro 500
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can read settings" ON settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;

-- Criar políticas mais permissivas (temporário para testes)
CREATE POLICY "Authenticated users can read settings" 
ON settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update settings" 
ON settings FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert settings" 
ON settings FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Pronto! Agora as configurações devem funcionar
