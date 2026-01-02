# 🔍 Verificar Qual Backend Você Está Usando

## 📋 Informações Encontradas

### Firebase Functions
- **Projeto**: `pdv-mastergit-92919464-75f51`
- **Região**: `southamerica-east1`
- **URL da API**: `https://southamerica-east1-pdv-mastergit-92919464-75f51.cloudfunctions.net/api`

### Supabase
- **Project Ref**: `pjaiqrlhfocholazjgdc`
- **URL**: `https://pjaiqrlhfocholazjgdc.supabase.co`
- **Edge Functions URL**: `https://pjaiqrlhfocholazjgdc.supabase.co/functions/v1/api`

## 🎯 Qual Você Está Usando?

### Opção 1: Firebase Functions (Backend Express)

Se seu backend está deployado como Firebase Functions, configure:

```env
VITE_API_URL=https://southamerica-east1-pdv-mastergit-92919464-75f51.cloudfunctions.net/api
```

### Opção 2: Supabase Edge Functions

Se seu backend está deployado como Supabase Edge Functions, **comente ou remova** `VITE_API_URL` e deixe apenas:

```env
VITE_SUPABASE_URL=https://pjaiqrlhfocholazjgdc.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
# VITE_API_URL=  # Comentado para usar detecção automática
```

O sistema construirá automaticamente: `https://pjaiqrlhfocholazjgdc.supabase.co/functions/v1/api`

## 🔍 Como Verificar

1. **Acesse o Firebase Console:**
   - https://console.firebase.google.com
   - Verifique se a função `api` está deployada

2. **Acesse o Supabase Dashboard:**
   - https://app.supabase.com
   - Vá em **Edge Functions**
   - Verifique se há uma função `api` deployada

3. **Teste a URL diretamente:**
   - Firebase: `https://southamerica-east1-pdv-mastergit-92919464-75f51.cloudfunctions.net/api/health`
   - Supabase: `https://pjaiqrlhfocholazjgdc.supabase.co/functions/v1/api/health`

## ✅ Próximos Passos

1. Identifique qual backend está deployado (Firebase ou Supabase)
2. Configure o `.env` do frontend com a URL correta
3. Reinicie o servidor de desenvolvimento
4. Teste a conexão

