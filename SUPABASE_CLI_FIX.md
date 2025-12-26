# 🔧 Solução: Instalação Supabase CLI no Windows

## ❌ **Problema Identificado**

A instalação global via npm está falhando devido a problemas de permissões ou cache do npm no Windows.

## ✅ **Soluções Alternativas**

### **Solução 1: Usar npx (Recomendado - Sem Instalação)** ⭐

Você não precisa instalar! Use `npx` para executar comandos Supabase:

```powershell
# Em vez de: supabase login
npx supabase login

# Em vez de: supabase link
npx supabase link --project-ref SEU_PROJECT_REF

# Em vez de: supabase hosting deploy
npx supabase hosting deploy dist
```

**Vantagens:**
- ✅ Não precisa instalar globalmente
- ✅ Sempre usa a versão mais recente
- ✅ Sem problemas de permissão

---

### **Solução 2: Instalar via Scoop (Windows Package Manager)**

```powershell
# 1. Instalar Scoop (se não tiver)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 2. Adicionar bucket do Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# 3. Instalar Supabase CLI
scoop install supabase

# 4. Verificar
supabase --version
```

---

### **Solução 3: Download Direto do Executável**

1. Acesse: https://github.com/supabase/cli/releases
2. Baixe: `supabase_windows_amd64.zip`
3. Extraia para uma pasta (ex: `C:\supabase`)
4. Adicione ao PATH ou execute direto:

```powershell
# Executar direto
C:\supabase\supabase.exe --version
```

---

### **Solução 4: Limpar Cache do NPM e Tentar Novamente**

```powershell
# 1. Limpar cache do npm
npm cache clean --force

# 2. Limpar pasta temp
Remove-Item -Path "$env:TEMP\npm-*" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Tentar instalar novamente como administrador
# Abra PowerShell como Administrador e execute:
npm install -g supabase --force
```

---

## 🚀 **Deploy Usando npx (Mais Fácil)**

Como você já tem o Supabase instalado localmente (`npm i supabase --save-dev`), pode usar:

```powershell
# 1. Login
npx supabase login

# 2. Linkar projeto
npx supabase link --project-ref SEU_PROJECT_REF

# 3. Build
cd frontend
npm run build

# 4. Deploy
npx supabase hosting deploy dist
```

---

## 📝 **Script Atualizado para npx**

Vou criar um novo script que usa npx em vez de instalação global.

---

## 🎯 **Recomendação**

**Use a Solução 1 (npx)** - É a mais simples e não requer instalação!

Todos os comandos funcionam igual, apenas adicione `npx` antes:
- `npx supabase login`
- `npx supabase link`
- `npx supabase hosting deploy`

---

## ✅ **Próximos Passos**

1. Use `npx supabase login`
2. Execute o script atualizado que vou criar
3. Ou siga o guia manual com npx
