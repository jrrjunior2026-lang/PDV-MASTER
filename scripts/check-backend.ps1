# Script de Verificacao do Backend - PDV Master
# Verifica se o backend esta configurado e rodando corretamente

$ErrorActionPreference = "Continue"

Write-Host "Verificando Configuracao do Backend..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "..\backend"
$envPath = Join-Path $backendPath ".env"

# 1. Verificar se o diretorio backend existe
if (-not (Test-Path $backendPath)) {
    Write-Host "ERRO: Diretorio backend nao encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Diretorio backend encontrado" -ForegroundColor Green

# 2. Verificar se node_modules existe
$nodeModulesPath = Join-Path $backendPath "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "AVISO: node_modules nao encontrado. Execute: npm install" -ForegroundColor Yellow
} else {
    Write-Host "OK: Dependencias instaladas" -ForegroundColor Green
}

# 3. Verificar arquivo .env
if (-not (Test-Path $envPath)) {
    Write-Host "AVISO: Arquivo .env nao encontrado!" -ForegroundColor Yellow
    Write-Host "   Criando .env a partir do .env.example..." -ForegroundColor Yellow
    
    $envExamplePath = Join-Path $backendPath ".env.example"
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "OK: Arquivo .env criado. Por favor, edite com suas configuracoes." -ForegroundColor Green
    } else {
        Write-Host "ERRO: Arquivo .env.example nao encontrado!" -ForegroundColor Red
        Write-Host "   Crie um arquivo .env manualmente com as variaveis necessarias." -ForegroundColor Yellow
    }
} else {
    Write-Host "OK: Arquivo .env encontrado" -ForegroundColor Green
    
    # Verificar variaveis criticas
    $envContent = Get-Content $envPath -Raw
    $requiredVars = @(
        "DATABASE_HOST",
        "DATABASE_NAME",
        "DATABASE_USER",
        "DATABASE_PASSWORD",
        "JWT_SECRET"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch "$var=") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host "AVISO: Variaveis faltando no .env:" -ForegroundColor Yellow
        foreach ($var in $missingVars) {
            Write-Host "   - $var" -ForegroundColor Yellow
        }
    } else {
        Write-Host "OK: Variaveis essenciais configuradas" -ForegroundColor Green
    }
}

# 4. Verificar porta 3001
Write-Host ""
Write-Host "Verificando porta 3001..." -ForegroundColor Cyan
$portCheck = netstat -ano | Select-String ":3001"
if ($portCheck) {
    Write-Host "AVISO: Porta 3001 esta em uso!" -ForegroundColor Yellow
    Write-Host "   Processos usando a porta:" -ForegroundColor Yellow
    $portCheck | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
} else {
    Write-Host "OK: Porta 3001 esta livre" -ForegroundColor Green
}

# 5. Testar conexao com o servidor (se estiver rodando)
Write-Host ""
Write-Host "Testando conexao com o servidor..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "OK: Servidor esta rodando e respondendo!" -ForegroundColor Green
        $healthData = $response.Content | ConvertFrom-Json
        Write-Host "   Status: $($healthData.status)" -ForegroundColor Green
        Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Green
    }
} catch {
    Write-Host "AVISO: Servidor nao esta rodando na porta 3001" -ForegroundColor Yellow
    Write-Host "   Para iniciar o servidor, execute:" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
}

# 6. Resumo e proximos passos
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Proximos Passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure o arquivo .env no diretorio backend" -ForegroundColor White
Write-Host "2. Certifique-se de que o PostgreSQL esta rodando" -ForegroundColor White
Write-Host "3. Execute: cd backend; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Dica: Use Docker para facilitar:" -ForegroundColor Yellow
Write-Host "   .\scripts\start-dev.ps1" -ForegroundColor White
Write-Host ""
