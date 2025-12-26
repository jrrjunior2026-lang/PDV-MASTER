# 🚀 Deploy Automatizado - Supabase Hosting

Write-Host "🚀 PDV Master - Deploy no Supabase Hosting" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "frontend")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Verificar se Supabase CLI está instalado
Write-Host "🔍 Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "⚠️  Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instalando Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar Supabase CLI!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Instale manualmente:" -ForegroundColor Yellow
        Write-Host "  npm install -g supabase" -ForegroundColor White
        exit 1
    }
}

Write-Host "✅ Supabase CLI encontrado!" -ForegroundColor Green
Write-Host ""

# Verificar autenticação
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não autenticado. Iniciando login..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Uma janela do navegador será aberta para autenticação." -ForegroundColor Cyan
    Write-Host "Após autenticar, volte para este terminal." -ForegroundColor Cyan
    Write-Host ""
    
    supabase login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no login!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Autenticado com sucesso!" -ForegroundColor Green
Write-Host ""

# Verificar se projeto está linkado
Write-Host "🔗 Verificando link do projeto..." -ForegroundColor Yellow
$linkCheck = Test-Path ".supabase"
if (-not $linkCheck) {
    Write-Host "⚠️  Projeto não linkado!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para linkar, você precisa do Project Reference ID." -ForegroundColor Cyan
    Write-Host "Encontre em: https://app.supabase.com > Seu Projeto > Settings > General > Reference ID" -ForegroundColor Cyan
    Write-Host ""
    
    $projectRef = Read-Host "Digite o Project Reference ID"
    
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        Write-Host "❌ Project Reference ID não pode ser vazio!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Linkando ao projeto..." -ForegroundColor Cyan
    supabase link --project-ref $projectRef
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao linkar projeto!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Projeto linkado!" -ForegroundColor Green
Write-Host ""

# Build do frontend
Write-Host "🔨 Fazendo build do frontend..." -ForegroundColor Cyan
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

Set-Location frontend

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

# Build
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os erros acima e tente novamente." -ForegroundColor Yellow
    Set-Location ..
    exit 1
}

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Fazendo deploy no Supabase Hosting..." -ForegroundColor Cyan
Write-Host "Enviando arquivos..." -ForegroundColor Yellow
Write-Host ""

supabase hosting deploy dist

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Seu PDV Master está no ar!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📍 Acesse sua aplicação em:" -ForegroundColor Yellow
    Write-Host "   https://SEU_PROJECT.supabase.co" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Dicas:" -ForegroundColor Cyan
    Write-Host "   • Configure um domínio personalizado no painel do Supabase" -ForegroundColor White
    Write-Host "   • Ative RLS para segurança em produção" -ForegroundColor White
    Write-Host "   • Configure backups automáticos" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Documentação completa em:" -ForegroundColor Cyan
    Write-Host "   DEPLOY_SUPABASE_HOSTING.md" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  • Hosting não habilitado no projeto" -ForegroundColor White
    Write-Host "  • Quota excedida" -ForegroundColor White
    Write-Host "  • Problemas de rede" -ForegroundColor White
    Write-Host ""
    Write-Host "Tente:" -ForegroundColor Yellow
    Write-Host "  1. Verificar o painel do Supabase" -ForegroundColor White
    Write-Host "  2. Executar: supabase hosting status" -ForegroundColor White
    Write-Host "  3. Consultar: https://supabase.com/docs/guides/hosting" -ForegroundColor White
    Write-Host ""
}

Set-Location ..

Write-Host ""
Write-Host "✨ Processo finalizado!" -ForegroundColor Cyan
Write-Host ""

# Perguntar se quer abrir o browser
$openBrowser = Read-Host "Deseja abrir o navegador para ver o projeto? (S/N)"
if ($openBrowser -eq "S" -or $openBrowser -eq "s") {
    Start-Process "https://app.supabase.com"
}
