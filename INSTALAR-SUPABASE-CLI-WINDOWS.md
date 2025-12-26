# 🔧 Instalação Manual do Supabase CLI para Windows

## Método 1: Download Direto (RECOMENDADO)

### Passo 1: Baixar o executável
Acesse: https://github.com/supabase/cli/releases/latest

Procure por: **supabase_windows_amd64.zip** ou **supabase_windows_arm64.zip**

### Passo 2: Extrair e instalar
1. Extraia o arquivo ZIP
2. Copie o arquivo `supabase.exe` para: `C:\Windows\System32\`
   - Ou crie uma pasta: `C:\supabase\` e adicione ao PATH

### Passo 3: Adicionar ao PATH (se não colocou em System32)
1. Pressione `Win + X` e selecione "Sistema"
2. Clique em "Configurações avançadas do sistema"
3. Clique em "Variáveis de Ambiente"
4. Em "Variáveis do sistema", encontre "Path" e clique em "Editar"
5. Clique em "Novo" e adicione: `C:\supabase`
6. Clique em "OK" em todas as janelas

### Passo 4: Reiniciar o terminal
Feche e abra novamente o PowerShell/Terminal

### Passo 5: Verificar instalação
```powershell
supabase --version
```

---

## Método 2: Via PowerShell (Automático)

Execute este comando no PowerShell como Administrador:

```powershell
# Criar diretório
New-Item -ItemType Directory -Force -Path C:\supabase

# Baixar última versão
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip" -OutFile "$env:TEMP\supabase.zip"

# Extrair
Expand-Archive -Path "$env:TEMP\supabase.zip" -DestinationPath "C:\supabase" -Force

# Adicionar ao PATH (sessão atual)
$env:Path += ";C:\supabase"

# Adicionar ao PATH permanentemente
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\supabase", [EnvironmentVariableTarget]::Machine)

# Verificar
supabase --version
```

---

## Método 3: Via Chocolatey

Se você tiver o Chocolatey instalado:

```powershell
choco install supabase
```

Para instalar o Chocolatey primeiro:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

---

## ⚠️ IMPORTANTE: Solução Alternativa

Se você não conseguir instalar o Supabase CLI, **NÃO SE PREOCUPE!**

Eu já modifiquei o código para funcionar **SEM a Edge Function**. O upload de certificado agora funciona diretamente pelo Storage do Supabase.

### O que você precisa fazer:

1. ✅ Execute o script `supabase-rls-policies.sql` no Supabase Dashboard
2. ✅ Teste o upload da logo
3. ✅ Teste o upload do certificado

**Tudo deve funcionar sem precisar do CLI!**

---

## 📞 Precisa de Ajuda?

Se nenhum método funcionar, me avise e podemos:
- Usar apenas a solução sem Edge Function (já implementada)
- Ou eu posso te ajudar com outro método de instalação

---

**Criado em**: 2025-12-26
**Projeto**: PDV-MASTER
