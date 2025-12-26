# 🔧 Guia de Solução: Erro de RLS no Upload de Logo

## 📌 Problema
```
Error uploading logo to Supabase: StorageApiError: new row violates row-level security policy
```

Este erro ocorre porque o Supabase bloqueia operações por padrão quando o Row-Level Security (RLS) está ativado.

---

## ✅ Solução 1: Configurar Políticas RLS (RECOMENDADO)

### Passo 1: Acessar o Supabase Dashboard
1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Clique em **SQL Editor** no menu lateral

### Passo 2: Executar o Script SQL
1. Abra o arquivo `supabase-rls-policies.sql` na raiz do projeto
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 3: Verificar se Funcionou
1. Volte para a aplicação
2. Tente fazer upload da logo novamente
3. Deve funcionar! ✨

---

## ✅ Solução 2: Permitir Acesso Público (APENAS DESENVOLVIMENTO)

Se você quiser testar rapidamente SEM precisar estar autenticado:

### Execute este SQL alternativo no Supabase:

```sql
-- Criar bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permitir qualquer pessoa fazer upload (APENAS PARA TESTES!)
CREATE POLICY "Permitir upload público"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'assets');

-- Permitir qualquer pessoa ler
CREATE POLICY "Permitir leitura pública"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Criar tabela settings
CREATE TABLE IF NOT EXISTS settings (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Permitir acesso público à tabela settings (APENAS PARA TESTES!)
CREATE POLICY "Permitir acesso público a settings"
ON settings FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

⚠️ **ATENÇÃO**: Esta solução permite que QUALQUER PESSOA faça upload. Use apenas para desenvolvimento!

---

## 🔍 Verificar se Você Está Autenticado

Antes de fazer upload, verifique se você está logado:

1. Abra o Console do navegador (F12)
2. Vá para a aba **Application** > **Local Storage**
3. Procure por chaves do Supabase (ex: `sb-[seu-projeto]-auth-token`)
4. Se não existir, você precisa fazer login primeiro

---

## 🐛 Ainda com Problemas?

### Verifique o Console do Navegador
1. Pressione F12
2. Vá para a aba **Console**
3. Procure por erros detalhados
4. Me envie a mensagem completa do erro

### Verifique as Políticas Criadas
No Supabase Dashboard:
1. Vá em **Authentication** > **Policies**
2. Verifique se as políticas foram criadas para:
   - `storage.objects`
   - `settings`

---

## 📚 Próximos Passos

Depois de resolver o erro:
1. Teste o upload da logo
2. Verifique se a imagem aparece corretamente
3. Teste também o upload do certificado digital

---

**Criado em**: 2025-12-26
**Projeto**: PDV-MASTER
