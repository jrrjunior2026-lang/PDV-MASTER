# 🔧 Configuração do Backend no Supabase

## ✅ Solução Implementada

O sistema agora detecta automaticamente se você está usando Supabase e configura a URL da API corretamente.

## 📋 Como Configurar

### 1. Criar arquivo `.env` no diretório `frontend`

Copie o arquivo `.env.example` para `.env`:

```powershell
cd frontend
copy .env.example .env
```

### 2. Configurar variáveis do Supabase

Edite o arquivo `frontend/.env` e adicione:

```env
# URL do seu projeto Supabase
VITE_SUPABASE_URL=https://seu-projeto-ref.supabase.co

# Chave anônima do Supabase
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
```

**Onde encontrar essas informações:**
1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 3. Configurar URL da API (Opcional)

O sistema constrói automaticamente a URL das Edge Functions do Supabase:
```
{VITE_SUPABASE_URL}/functions/v1/api
```

**Se você quiser usar uma URL específica**, configure:
```env
VITE_API_URL=https://sua-url-personalizada.com/api
```

## 🎯 Como Funciona

O sistema usa a seguinte prioridade para determinar a URL da API:

1. **VITE_API_URL** (se configurado) - Usa esta URL diretamente
2. **VITE_SUPABASE_URL** (se configurado) - Constrói: `{VITE_SUPABASE_URL}/functions/v1/api`
3. **Fallback** - `http://localhost:3001/api` (desenvolvimento local)

## 🚀 Deploy do Backend no Supabase

### Opção 1: Supabase Edge Functions

Se você está usando Supabase Edge Functions para o backend:

1. **Instalar Supabase CLI:**
```bash
npm install -g supabase
```

2. **Login:**
```bash
supabase login
```

3. **Link com seu projeto:**
```bash
supabase link --project-ref seu-projeto-ref
```

4. **Deploy da função:**
```bash
supabase functions deploy api
```

### Opção 2: Firebase Functions

Se você está usando Firebase Functions (como visto no código):

1. **Instalar Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login:**
```bash
firebase login
```

3. **Deploy:**
```bash
cd backend/firebase
firebase deploy --only functions:api
```

4. **Configurar no frontend:**
```env
VITE_API_URL=https://southamerica-east1-seu-projeto.cloudfunctions.net/api
```

## 🔍 Verificar Configuração

Após configurar, verifique no console do navegador:

1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Procure por mensagens sobre a URL da API

O sistema também mostra mensagens de erro mais claras quando há problemas de conexão com o Supabase.

## ⚠️ Solução de Problemas

### Erro: "Não foi possível conectar ao backend no Supabase"

**Possíveis causas:**
1. ✅ Verifique se `VITE_SUPABASE_URL` está configurado corretamente
2. ✅ Verifique se a Edge Function está deployada
3. ✅ Verifique se a Edge Function está ativa no dashboard do Supabase
4. ✅ Verifique os logs da Edge Function no Supabase Dashboard

### Erro: "ERR_CONNECTION_REFUSED"

**Solução:**
- Se você está usando Supabase, configure `VITE_SUPABASE_URL` no `.env`
- Se você está usando Firebase, configure `VITE_API_URL` no `.env`
- Se você está desenvolvendo localmente, inicie o servidor backend na porta 3001

## 📝 Exemplo Completo de `.env`

```env
# Supabase
VITE_SUPABASE_URL=https://pjaiqrlhfocholazjgdc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API (opcional - será construída automaticamente se VITE_SUPABASE_URL estiver configurado)
# VITE_API_URL=https://pjaiqrlhfocholazjgdc.supabase.co/functions/v1/api

# App
VITE_APP_NAME=PDV Master
VITE_APP_VERSION=1.0.0
```

## ✅ Próximos Passos

1. ✅ Configure o arquivo `.env` no diretório `frontend`
2. ✅ Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. ✅ Reinicie o servidor de desenvolvimento do frontend
4. ✅ Teste a conexão na página de Configurações

---

**Nota:** Após alterar o arquivo `.env`, você precisa **reiniciar o servidor de desenvolvimento** do frontend para que as mudanças tenham efeito.

