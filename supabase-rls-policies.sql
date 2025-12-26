-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS) PARA SUPABASE
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- para permitir uploads de logo e operações na tabela settings
-- =====================================================

-- 1. POLÍTICAS PARA O BUCKET 'assets' (Storage)
-- =====================================================

-- Permitir que usuários autenticados façam upload de arquivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política: Permitir INSERT (upload) para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

-- Política: Permitir SELECT (leitura) para todos
CREATE POLICY "Qualquer um pode visualizar assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Política: Permitir UPDATE para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets');

-- Política: Permitir DELETE para usuários autenticados
CREATE POLICY "Usuários autenticados podem deletar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets');


-- 2. POLÍTICAS PARA A TABELA 'settings'
-- =====================================================

-- Criar a tabela settings se não existir
CREATE TABLE IF NOT EXISTS settings (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Política: Permitir SELECT para usuários autenticados
CREATE POLICY "Usuários autenticados podem ler settings"
ON settings FOR SELECT
TO authenticated
USING (true);

-- Política: Permitir INSERT para usuários autenticados
CREATE POLICY "Usuários autenticados podem inserir settings"
ON settings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política: Permitir UPDATE para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar settings"
ON settings FOR UPDATE
TO authenticated
USING (true);

-- Política: Permitir DELETE para usuários autenticados
CREATE POLICY "Usuários autenticados podem deletar settings"
ON settings FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- FIM DAS POLÍTICAS
-- =====================================================
