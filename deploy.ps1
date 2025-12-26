#  Script de Deploy Rápido - PDV Master

Write-Host " PDV Master - Deploy para Produção" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "frontend")) {
    Write-Host " Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Menu de opções
Write-Host "Escolha a plataforma de deploy:" -ForegroundColor Yellow
Write-Host "1. Vercel (Recomendado)"
Write-Host "2. Netlify"
Write-Host "3. GitHub Pages"
Write-Host "4. Build local apenas"
Write-Host "5. Cancelar"
Write-Host ""

$choice = Read-Host "Digite sua escolha (1-5)"

switch ($choice) {
    "1" {
        Write-Host " Preparando deploy para Vercel..." -ForegroundColor Green
        
        # Verificar se Vercel CLI está instalado
        $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
        if (-not $vercelInstalled) {
            Write-Host "  Vercel CLI não encontrado. Instalando..." -ForegroundColor Yellow
            npm install -g vercel
        }
        
        # Build
        Write-Host " Fazendo build do projeto..." -ForegroundColor Cyan
        Set-Location frontend
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " Build concluído com sucesso!" -ForegroundColor Green
            
            # Deploy
            Write-Host " Fazendo deploy para Vercel..." -ForegroundColor Cyan
            vercel --prod
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host " Deploy concluído com sucesso!" -ForegroundColor Green
                Write-Host " Seu PDV Master está no ar!" -ForegroundColor Cyan
            } else {
                Write-Host " Erro no deploy!" -ForegroundColor Red
            }
        } else {
            Write-Host " Erro no build!" -ForegroundColor Red
        }
        
        Set-Location ..
    }
    
    "2" {
        Write-Host " Preparando deploy para Netlify..." -ForegroundColor Green
        
        # Verificar se Netlify CLI está instalado
        $netlifyInstalled = Get-Command netlify -ErrorAction SilentlyContinue
        if (-not $netlifyInstalled) {
            Write-Host "  Netlify CLI não encontrado. Instalando..." -ForegroundColor Yellow
            npm install -g netlify-cli
        }
        
        # Build
        Write-Host " Fazendo build do projeto..." -ForegroundColor Cyan
        Set-Location frontend
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " Build concluído com sucesso!" -ForegroundColor Green
            
            # Deploy
            Write-Host " Fazendo deploy para Netlify..." -ForegroundColor Cyan
            netlify deploy --prod
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host " Deploy concluído com sucesso!" -ForegroundColor Green
                Write-Host " Seu PDV Master está no ar!" -ForegroundColor Cyan
            } else {
                Write-Host " Erro no deploy!" -ForegroundColor Red
            }
        } else {
            Write-Host " Erro no build!" -ForegroundColor Red
        }
        
        Set-Location ..
    }
    
    "3" {
        Write-Host " Preparando deploy para GitHub Pages..." -ForegroundColor Green
        Set-Location frontend
        
        # Verificar se gh-pages está instalado
        if (-not (Test-Path "node_modules/gh-pages")) {
            Write-Host "  gh-pages não encontrado. Instalando..." -ForegroundColor Yellow
            npm install --save-dev gh-pages
        }
        
        Write-Host " Fazendo build do projeto..." -ForegroundColor Cyan
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " Build concluído com sucesso!" -ForegroundColor Green
            Write-Host " Fazendo deploy para GitHub Pages..." -ForegroundColor Cyan
            npm run deploy
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host " Deploy concluído com sucesso!" -ForegroundColor Green
                Write-Host " Seu PDV Master está no ar no GitHub Pages!" -ForegroundColor Cyan
            } else {
                Write-Host " Erro no deploy!" -ForegroundColor Red
            }
        } else {
            Write-Host " Erro no build!" -ForegroundColor Red
        }
        
        Set-Location ..
    }
    
    "4" {
        Write-Host " Fazendo build local..." -ForegroundColor Green
        Set-Location frontend
        npm run build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " Build concluído com sucesso!" -ForegroundColor Green
            Write-Host " Arquivos gerados em: frontend/dist" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Para testar localmente:" -ForegroundColor Yellow
            Write-Host "  npm run preview" -ForegroundColor White
        } else {
            Write-Host " Erro no build!" -ForegroundColor Red
        }
        
        Set-Location ..
    }
    
    "5" {
        Write-Host " Deploy cancelado." -ForegroundColor Yellow
        exit 0
    }
    
    default {
        Write-Host " Opção inválida!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host " Processo finalizado!" -ForegroundColor Cyan
