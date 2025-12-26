# Script de Sincronizacao Total - PDV Master
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "--- Iniciando Sincronizacao Total ---" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Verificar se esta na raiz
if (-not (Test-Path "frontend")) {
    Write-Host "Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# 2. Solicitar mensagem de commit
$commitMsg = Read-Host "Digite uma mensagem para as alteracoes (ex: 'ajustes no kardex')"
if (-not $commitMsg) { $commitMsg = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }

# 3. Build e Deploy Frontend (GitHub Pages)
Write-Host ""
Write-Host "Passo 1: Gerando Build e fazendo Deploy para GitHub Pages..." -ForegroundColor Yellow
Set-Location frontend

# Garantir que gh-pages esta instalado
if (-not (Test-Path "node_modules/gh-pages")) {
    Write-Host "Instalando dependencia gh-pages..." -ForegroundColor Gray
    npm install --save-dev gh-pages
}

Write-Host "Executando Build..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Enviando para GitHub Pages..." -ForegroundColor Gray
    npm run deploy
    Write-Host "Frontend atualizado com sucesso!" -ForegroundColor Green
}
else {
    Write-Host "Erro no Build do Frontend. Abortando." -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# 4. Push para o Repositorio GitHub
Write-Host ""
Write-Host "Passo 2: Enviando codigo para o repositorio GitHub..." -ForegroundColor Yellow
git add .
git commit -m "$commitMsg"
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Codigo sincronizado no GitHub!" -ForegroundColor Green
}
else {
    Write-Host "Erro ao fazer push. Verifique sua conexao ou permissoes." -ForegroundColor Yellow
}

# 5. Verificacao de SQL (Supabase)
Write-Host ""
Write-Host "Passo 3: Verificando alteracoes no Banco de Dados..." -ForegroundColor Yellow
$sqlFiles = Get-ChildItem -Path "backend/database/*.sql" | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-60) }

if ($sqlFiles) {
    Write-Host "Foram detectadas mudancas recentes nos arquivos SQL:" -ForegroundColor Magenta
    foreach ($file in $sqlFiles) {
        Write-Host "  - $($file.Name)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "LEMBRETE: Nao esqueca de executar estes scripts no SQL Editor do seu Supabase!" -ForegroundColor Yellow
    Write-Host "Link: https://supabase.com/dashboard/project/_/sql" -ForegroundColor Blue
}
else {
    Write-Host "Nenhuma mudanca recente detectada nos scripts SQL." -ForegroundColor Green
}

Write-Host ""
Write-Host "Sincronizacao concluida com sucesso!" -ForegroundColor Cyan
Write-Host "Seu PDV esta online e o codigo esta seguro no GitHub." -ForegroundColor Cyan
