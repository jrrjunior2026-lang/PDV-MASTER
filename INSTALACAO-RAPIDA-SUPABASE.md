# ⚡ Instalação Rápida do Supabase CLI

## 🎯 Método Mais Simples: Download Manual

### Passo 1: Baixar
Clique aqui para baixar a versão mais recente:
👉 **https://github.com/supabase/cli/releases/download/v2.67.1/supabase_2.67.1_windows_amd64.tar.gz**

### Passo 2: Extrair
1. Extraia o arquivo `.tar.gz` (use 7-Zip ou WinRAR)
2. Dentro você encontrará o arquivo `supabase.exe`

### Passo 3: Mover para um local permanente
Copie `supabase.exe` para: **C:\supabase\**

### Passo 4: Adicionar ao PATH
Execute no PowerShell como **Administrador**:

```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\supabase", [EnvironmentVariableTarget]::Machine)
```

### Passo 5: Reiniciar o Terminal
Feche e abra novamente o PowerShell/Terminal

### Passo 6: Verificar
```powershell
supabase --version
```

Deve mostrar: `v2.67.1` ou similar

---

## 🔄 Comandos Após Instalação

### 1. Login
```powershell
supabase login
```

### 2. Link com o projeto
```powershell
cd c:\Users\Usuario\Documents\PDV-MASTER
supabase link --project-ref pjaiqrlhfocholazjgdc
```

### 3. Deploy da Edge Function
```powershell
supabase functions deploy encrypt-certificate
```

### 4. Configurar variável de ambiente
No Supabase Dashboard:
1. Vá em **Edge Functions** > **encrypt-certificate**
2. Clique em **Settings**
3. Adicione:
   - **Nome**: `CERTIFICATE_ENCRYPTION_KEY`
   - **Valor**: `minha-chave-super-secreta-123` (escolha uma chave forte!)

---

## ⚠️ NÃO CONSEGUIU INSTALAR?

**Não se preocupe!** O sistema já está configurado para funcionar **SEM o CLI**.

### O que fazer:

1. ✅ Execute o script `supabase-rls-policies.sql` no Supabase Dashboard (SQL Editor)
2. ✅ Teste o upload da logo - deve funcionar
3. ✅ Teste o upload do certificado - também funciona

**A instalação do CLI é OPCIONAL** para melhorar a segurança da criptografia do certificado.

---

## 📦 Links de Download Alternativos

Se o link acima não funcionar, acesse:
- **GitHub Releases**: https://github.com/supabase/cli/releases/latest
- Procure por: `supabase_*_windows_amd64.tar.gz`

---

**Versão**: v2.67.1
**Data**: 2025-12-26
