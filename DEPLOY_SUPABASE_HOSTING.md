# 🚀 Deploy no Supabase Hosting - Guia Completo

## 📋 **Visão Geral**

O Supabase oferece hosting gratuito para aplicações frontend, integrado diretamente com seu projeto. É a opção mais simples quando você já usa Supabase como backend!

---

## ✅ **Pré-requisitos**

- [ ] Projeto Supabase criado
- [ ] Supabase CLI instalado
- [ ] Node.js 18+ instalado
- [ ] Git instalado

---

## 🛠️ **Passo 1: Instalar Supabase CLI**

### **Windows (PowerShell)**
```powershell
# Usando npm
npm install -g supabase

# Ou usando Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### **Verificar Instalação**
```bash
supabase --version
```

---

## 🔐 **Passo 2: Login no Supabase**

```bash
# Fazer login
supabase login

# Isso abrirá o navegador para autenticação
# Após autenticar, você receberá um token
```

---

## 🔗 **Passo 3: Linkar ao Projeto**

```bash
# Na raiz do projeto PDV-MASTER
supabase link --project-ref SEU_PROJECT_REF

# Para encontrar seu PROJECT_REF:
# 1. Vá em https://app.supabase.com
# 2. Selecione seu projeto
# 3. Settings > General > Reference ID
```

**Exemplo:**
```bash
supabase link --project-ref pjaiqrlhfocholazjgdc
```

---

## 📦 **Passo 4: Build do Frontend**

```bash
# Navegar para a pasta frontend
cd frontend

# Instalar dependências
npm install

# Build para produção
npm run build

# Isso cria a pasta 'dist' com os arquivos otimizados
```

---

## 🚀 **Passo 5: Deploy**

### **Deploy Simples**
```bash
# Ainda na pasta frontend
supabase hosting deploy dist

# Ou da raiz do projeto:
supabase hosting deploy frontend/dist
```

### **Deploy com Nome Personalizado**
```bash
supabase hosting deploy dist --name pdv-master
```

---

## 🌐 **Passo 6: Acessar Aplicação**

Após o deploy, você receberá uma URL como:
```
https://SEU_PROJECT_REF.supabase.co
```

Ou com nome personalizado:
```
https://pdv-master-SEU_PROJECT_REF.supabase.co
```

---

## ⚙️ **Configuração Avançada**

### **1. Criar arquivo de configuração**

Crie `frontend/supabase-hosting.json`:

```json
{
  "routes": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### **2. Deploy com configuração**
```bash
supabase hosting deploy dist --config supabase-hosting.json
```

---

## 🔄 **Atualizar Deploy**

Para atualizar a aplicação:

```bash
# 1. Fazer novo build
cd frontend
npm run build

# 2. Deploy novamente
supabase hosting deploy dist
```

---

## 🗑️ **Remover Deploy**

```bash
supabase hosting delete
```

---

## 📊 **Verificar Status**

```bash
# Ver informações do hosting
supabase hosting status

# Listar todos os deploys
supabase hosting list
```

---

## 🔧 **Troubleshooting**

### **Erro: "Not logged in"**
```bash
supabase login
```

### **Erro: "Project not linked"**
```bash
supabase link --project-ref SEU_PROJECT_REF
```

### **Erro: "Build failed"**
```bash
# Limpar cache e rebuildar
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

### **Erro: "Hosting not enabled"**
O Supabase Hosting pode estar em beta. Verifique:
1. Painel do Supabase > Settings > Hosting
2. Habilite se necessário

---

## 🎯 **Script de Deploy Automatizado**

Crie `deploy-supabase.ps1`:

```powershell
Write-Host "🚀 Deploy PDV Master no Supabase Hosting" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está logado
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Não autenticado. Fazendo login..." -ForegroundColor Red
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no login!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Autenticado!" -ForegroundColor Green
Write-Host ""

# Build
Write-Host "🔨 Fazendo build do frontend..." -ForegroundColor Cyan
Set-Location frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build concluído!" -ForegroundColor Green
Write-Host ""

# Deploy
Write-Host "🚀 Fazendo deploy no Supabase..." -ForegroundColor Cyan
supabase hosting deploy dist

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "🎉 Seu PDV Master está no ar!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📍 Acesse em:" -ForegroundColor Yellow
    Write-Host "   https://SEU_PROJECT.supabase.co" -ForegroundColor White
} else {
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
}

Set-Location ..
```

**Executar:**
```powershell
.\deploy-supabase.ps1
```

---

## 🌟 **Vantagens do Supabase Hosting**

✅ **Integração Total** - Tudo no mesmo lugar
✅ **Grátis** - Incluído no plano Free
✅ **SSL Automático** - HTTPS configurado
✅ **CDN Global** - Performance otimizada
✅ **Deploy Rápido** - Um comando apenas
✅ **Rollback Fácil** - Histórico de deploys

---

## 📊 **Comparação com Outras Plataformas**

| Recurso | Supabase | Vercel | Netlify |
|---------|----------|--------|---------|
| Custo Free Tier | ✅ Grátis | ✅ Grátis | ✅ Grátis |
| Integração Backend | ✅ Nativa | ⚠️ Manual | ⚠️ Manual |
| SSL/HTTPS | ✅ Auto | ✅ Auto | ✅ Auto |
| CDN | ✅ Sim | ✅ Sim | ✅ Sim |
| Custom Domain | ✅ Sim | ✅ Sim | ✅ Sim |
| Deploy CLI | ✅ Sim | ✅ Sim | ✅ Sim |
| Analytics | ⚠️ Básico | ✅ Avançado | ✅ Avançado |

---

## 🎯 **Recomendação**

**Use Supabase Hosting se:**
- ✅ Você já usa Supabase como backend
- ✅ Quer tudo em um só lugar
- ✅ Simplicidade é prioridade

**Use Vercel/Netlify se:**
- ✅ Precisa de analytics avançado
- ✅ Quer CI/CD mais robusto
- ✅ Precisa de Edge Functions customizadas

---

## 📝 **Checklist de Deploy**

- [ ] Supabase CLI instalado
- [ ] Login realizado (`supabase login`)
- [ ] Projeto linkado (`supabase link`)
- [ ] Build testado localmente (`npm run build`)
- [ ] Deploy executado (`supabase hosting deploy dist`)
- [ ] URL acessível e funcionando
- [ ] Testes em produção realizados

---

## 🆘 **Suporte**

- **Documentação:** https://supabase.com/docs/guides/hosting
- **Discord:** https://discord.supabase.com
- **GitHub:** https://github.com/supabase/supabase

---

## 🎉 **Pronto!**

Seu PDV Master agora está rodando no Supabase Hosting!

**Custo: $0/mês** 💰

**Performance: Global CDN** 🌍

**Manutenção: Zero** 🎯

---

**Aproveite seu PDV na nuvem!** ☁️
