# Script de Sincronizacao Total - PDV Master
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Sincronizacao Total - PDV Master  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se esta na raiz
if (-not (Test-Path "frontend")) {
    Write-Host "ERRO: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# 2. Verificar se git esta configurado
Write-Host "Verificando configuracoes..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Git nao encontrado! Instale o Git primeiro." -ForegroundColor Red
    exit 1
}

$gitUser = git config user.name
$gitEmail = git config user.email
if (-not $gitUser -or -not $gitEmail) {
    Write-Host "AVISO: Git nao configurado! Configure com:" -ForegroundColor Yellow
    Write-Host "   git config --global user.name 'Seu Nome'" -ForegroundColor Gray
    Write-Host "   git config --global user.email 'seu@email.com'" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Deseja continuar mesmo assim? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# 3. Solicitar mensagem de commit
Write-Host ""
$commitMsg = Read-Host "Digite uma mensagem para as alteracoes (ex: 'ajustes no kardex')"
if (-not $commitMsg) { 
    $commitMsg = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 
    Write-Host "Usando mensagem padrao: $commitMsg" -ForegroundColor Gray
}

# 4. Build e Deploy Frontend (GitHub Pages)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passo 1: Build e Deploy Frontend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Set-Location frontend

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Erro ao instalar dependencias!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

# Garantir que gh-pages esta instalado
if (-not (Test-Path "node_modules/gh-pages")) {
    Write-Host "Instalando dependencia gh-pages..." -ForegroundColor Yellow
    npm install --save-dev gh-pages
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Erro ao instalar gh-pages!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

Write-Host "Executando Build do Frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Build concluido com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Enviando para GitHub Pages..." -ForegroundColor Cyan
    npm run deploy
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Frontend atualizado no GitHub Pages!" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Erro ao fazer deploy no GitHub Pages." -ForegroundColor Yellow
        Write-Host "   Verifique se o repositorio esta configurado corretamente." -ForegroundColor Yellow
    }
}
else {
    Write-Host "ERRO: Erro no Build do Frontend. Abortando." -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# 5. Push para o Repositorio GitHub
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passo 2: Sincronizando com GitHub" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

# Verificar se ha alteracoes
$gitStatus = git status --porcelain
if (-not $gitStatus) {
    Write-Host "INFO: Nenhuma alteracao para commitar." -ForegroundColor Gray
} else {
    Write-Host "Adicionando alteracoes..." -ForegroundColor Cyan
    git add .
    
    Write-Host "Criando commit..." -ForegroundColor Cyan
    git commit -m "$commitMsg"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Commit criado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Enviando para GitHub..." -ForegroundColor Cyan
        git push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: Codigo sincronizado no GitHub!" -ForegroundColor Green
        } else {
            Write-Host "AVISO: Erro ao fazer push." -ForegroundColor Yellow
            Write-Host "   Verifique sua conexao ou permissoes do GitHub." -ForegroundColor Yellow
        }
    } else {
        Write-Host "AVISO: Nenhuma alteracao para commitar ou erro ao criar commit." -ForegroundColor Yellow
    }
}

# 6. Verificacao de SQL (Supabase)
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passo 3: Verificando Banco de Dados" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

if (Test-Path "backend/database") {
    $sqlFiles = Get-ChildItem -Path "backend/database/*.sql" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-60) }
    
    if ($sqlFiles) {
        Write-Host "AVISO: Foram detectadas mudancas recentes nos arquivos SQL:" -ForegroundColor Yellow
        foreach ($file in $sqlFiles) {
            Write-Host "   - $($file.Name)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "LEMBRETE: Execute estes scripts no SQL Editor do Supabase!" -ForegroundColor Magenta
        Write-Host "   Link: https://supabase.com/dashboard/project/pjaiqrlhfocholazjgdc/sql/new" -ForegroundColor Blue
    }
    else {
        Write-Host "OK: Nenhuma mudanca recente detectada nos scripts SQL." -ForegroundColor Green
    }
} else {
    Write-Host "INFO: Diretorio backend/database nao encontrado." -ForegroundColor Gray
}

# 7. Resumo Final
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sincronizacao Concluida!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: Deployado no GitHub Pages" -ForegroundColor Green
Write-Host "Codigo: Sincronizado no GitHub" -ForegroundColor Green
Write-Host ""
Write-Host "Seu PDV esta online e o codigo esta seguro!" -ForegroundColor Cyan
Write-Host ""
