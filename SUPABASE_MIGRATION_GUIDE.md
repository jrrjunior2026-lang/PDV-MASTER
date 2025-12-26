# 🚀 PDV MASTER - Migração Completa para Supabase

## 📋 Resumo da Migração

Este documento descreve a migração completa do PDV Master de uma arquitetura tradicional (Frontend + Backend Node.js + PostgreSQL) para uma arquitetura **serverless** usando apenas **Supabase**.

---

## ✅ O que foi Migrado

### 1. **Banco de Dados**
- ✅ PostgreSQL local → Supabase PostgreSQL
- ✅ Todas as tabelas migradas (users, products, sales, customers, etc.)
- ✅ Stored Procedures (decrement_stock, get_register_summary, update_register_balance)
- ✅ Triggers para updated_at automático

### 2. **Autenticação**
- ✅ Login com bcrypt local → **Supabase Auth**
- ✅ Gerenciamento de sessão via Supabase
- ✅ Row Level Security (RLS) para proteger dados por usuário

### 3. **Storage**
- ✅ Upload de logos → **Supabase Storage** (Bucket `assets`)
- ✅ URLs públicas para imagens
- ✅ Upload de certificados → **Supabase Edge Function** (criptografia server-side)

### 4. **Backend**
- ✅ Todas as rotas migradas para chamadas diretas ao Supabase
- ✅ Lógica de negócio movida para Stored Procedures
- ✅ Criptografia de certificados via Edge Function

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos:
1. **`backend/database/supabase_migration.sql`** - Script completo de migração do banco
2. **`backend/database/supabase_rls_policies.sql`** - Políticas de segurança (RLS)
3. **`supabase/functions/encrypt-certificate/index.ts`** - Edge Function para criptografia

### Arquivos Modificados:
1. **`frontend/services/supabaseClient.ts`** - Cliente do Supabase
2. **`frontend/services/storageService.ts`** - Migrado para Supabase Auth + Database
3. **`frontend/services/apiService.ts`** - Upload de logo/certificado via Supabase
4. **`frontend/components/Layout.tsx`** - Carregamento assíncrono de settings
5. **`frontend/.env`** - Variáveis de ambiente do Supabase

---

## 🔧 Configuração no Supabase

### Passo 1: Executar Scripts SQL
No **SQL Editor** do Supabase, execute na ordem:

1. **`supabase_migration.sql`** - Cria todas as tabelas e funções
2. **`supabase_rls_policies.sql`** - Ativa Row Level Security

### Passo 2: Criar Bucket de Storage
1. Vá em **Storage** no painel do Supabase
2. Crie um bucket chamado `assets`
3. Marque como **Public**

### Passo 3: Configurar Autenticação
1. Vá em **Authentication > Providers**
2. Ative **Email**
3. Desative confirmação de email (ou configure SMTP)

### Passo 4: Criar Usuários
Como agora usamos Supabase Auth, você precisa criar usuários via:

```sql
-- No SQL Editor do Supabase
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@pdvmaster.br',
  crypt('admin', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Depois, vincule ao seu sistema:
INSERT INTO public.users (id, name, email, role)
SELECT id, 'Administrador', 'admin@pdvmaster.br', 'ADMIN'
FROM auth.users
WHERE email = 'admin@pdvmaster.br';
```

### Passo 5: Deploy da Edge Function (Opcional)
Se quiser usar upload de certificados:

```bash
# Instale a CLI do Supabase
npm install -g supabase

# Faça login
supabase login

# Link com seu projeto
supabase link --project-ref pjaiqrlhfocholazjgdc

# Deploy da função
supabase functions deploy encrypt-certificate
```

---

## 🌐 Variáveis de Ambiente

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://pjaiqrlhfocholazjgdc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3001/api  # Pode remover se não usar backend
```

---

## 🚫 O que NÃO é mais necessário

- ❌ Backend Node.js (pode ser desligado)
- ❌ Docker Compose para PostgreSQL local
- ❌ Redis (se não estiver usando para outra coisa)
- ❌ Servidor de produção para o backend

---

## ✨ Benefícios da Migração

1. **Custo Zero de Infraestrutura** - Supabase Free Tier é generoso
2. **Escalabilidade Automática** - Supabase gerencia tudo
3. **Backup Automático** - Point-in-time recovery incluído
4. **Segurança Reforçada** - RLS protege dados no nível do banco
5. **Desenvolvimento Mais Rápido** - Sem necessidade de manter backend
6. **Real-time (Futuro)** - Supabase Realtime pode ser ativado facilmente

---

## 🧪 Testando a Migração

1. Execute o script SQL no Supabase
2. Crie o bucket `assets`
3. Configure o `.env` do frontend
4. Reinicie o frontend: `npm run dev --prefix frontend`
5. Tente fazer login com `admin@pdvmaster.br` / `admin`
6. Cadastre um produto
7. Faça uma venda
8. Verifique no painel do Supabase se os dados foram salvos

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do SQL Editor no Supabase
3. Confirme que as políticas RLS estão ativas
4. Verifique se o usuário foi criado corretamente no `auth.users`

---

## 🎉 Próximos Passos

1. **Deploy do Frontend**: Use Vercel ou Netlify
2. **Configurar Domínio**: Aponte para o frontend deployado
3. **Ativar Realtime**: Para sincronização em tempo real entre terminais
4. **Implementar Webhooks**: Para integrações externas
5. **Configurar Backups**: Ativar Point-in-time Recovery no Supabase

---

**Migração Completa! 🎊**
Seu PDV agora roda 100% na nuvem, sem necessidade de servidor backend!
