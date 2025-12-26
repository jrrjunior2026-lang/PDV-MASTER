# 🚀 GUIA DE DEPLOY PARA PRODUÇÃO - PDV Master

## 📋 **Checklist Pré-Deploy**

### 1. **Configurações do Supabase**

#### ✅ **Ativar Row Level Security (RLS)**
Execute no SQL Editor do Supabase:

```sql
-- Ativar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Aplicar políticas (já criadas em supabase_rls_policies.sql)
-- Execute o arquivo: backend/database/supabase_rls_policies.sql
```

#### ✅ **Configurar Storage Bucket**
1. Vá em **Storage** no painel do Supabase
2. Bucket `assets` deve estar **público**
3. Configure políticas de upload (apenas autenticados)

#### ✅ **Verificar Variáveis de Ambiente**
No painel do Supabase:
- **Settings > API**
- Copie: `URL` e `anon key`

---

### 2. **Configurar Variáveis de Ambiente**

#### **Frontend (.env.production)**
Crie o arquivo `frontend/.env.production`:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

⚠️ **IMPORTANTE:** Substitua pelos valores reais do seu projeto Supabase!

---

### 3. **Build do Frontend**

```bash
# Instalar dependências
cd frontend
npm install

# Build para produção
npm run build

# Isso cria a pasta 'dist' com os arquivos otimizados
```

---

## 🌐 **Opções de Deploy**

### **Opção 1: Vercel (Recomendado - Grátis)**

#### **Passo 1: Instalar Vercel CLI**
```bash
npm install -g vercel
```

#### **Passo 2: Fazer Deploy**
```bash
cd frontend
vercel --prod
```

#### **Passo 3: Configurar Variáveis de Ambiente**
No painel da Vercel:
1. Vá em **Settings > Environment Variables**
2. Adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Redeploy

#### **Configuração Automática (vercel.json)**
Crie `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

### **Opção 2: Netlify (Grátis)**

#### **Passo 1: Instalar Netlify CLI**
```bash
npm install -g netlify-cli
```

#### **Passo 2: Fazer Deploy**
```bash
cd frontend
netlify deploy --prod
```

#### **Configuração (netlify.toml)**
Crie `frontend/netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### **Opção 3: Supabase Hosting (Beta)**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy
cd frontend
npm run build
supabase hosting deploy dist
```

---

### **Opção 4: Docker + Cloud Run / Railway**

#### **Criar Dockerfile**
Crie `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **Criar nginx.conf**
Crie `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### **Deploy no Railway**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd frontend
railway up
```

---

## 🔒 **Segurança para Produção**

### **1. Configurar CORS no Supabase**
No painel do Supabase:
- **Settings > API > CORS**
- Adicione seu domínio de produção

### **2. Configurar Rate Limiting**
No Supabase:
- **Settings > API > Rate Limiting**
- Configure limites apropriados

### **3. Habilitar SSL/HTTPS**
- Vercel/Netlify: Automático ✅
- Docker: Use Cloudflare ou Let's Encrypt

### **4. Configurar Backup**
No Supabase:
- **Settings > Backups**
- Habilitar backups automáticos

---

## 📊 **Otimizações de Performance**

### **1. Code Splitting**
Já configurado no Vite ✅

### **2. Lazy Loading**
Adicione em `frontend/src/App.tsx`:

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
// ... outros imports

// No Router:
<Suspense fallback={<div>Carregando...</div>}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    {/* ... */}
  </Routes>
</Suspense>
```

### **3. PWA (Progressive Web App)**
Instale o plugin:

```bash
cd frontend
npm install -D vite-plugin-pwa
```

Configure em `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PDV Master',
        short_name: 'PDV',
        description: 'Sistema PDV Completo',
        theme_color: '#0ea5e9',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

---

## 🧪 **Testes Antes do Deploy**

### **1. Build Local**
```bash
cd frontend
npm run build
npm run preview
```

### **2. Testar Produção Localmente**
```bash
# Servir a pasta dist
npx serve dist
```

### **3. Checklist de Testes**
- [ ] Login funciona
- [ ] Dashboard carrega dados
- [ ] Cadastro de produtos
- [ ] Cadastro de clientes
- [ ] Abertura de caixa
- [ ] Venda completa
- [ ] Fechamento de caixa
- [ ] Relatórios
- [ ] Upload de logo

---

## 📱 **Domínio Personalizado**

### **Vercel**
1. Vá em **Settings > Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruções

### **Netlify**
1. Vá em **Domain Settings**
2. Adicione custom domain
3. Configure DNS

---

## 🔄 **CI/CD (Opcional)**

### **GitHub Actions**
Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: |
          cd frontend
          npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./frontend
```

---

## 📈 **Monitoramento**

### **1. Supabase Analytics**
- Painel do Supabase > **Reports**
- Monitore queries, storage, auth

### **2. Vercel Analytics**
```bash
npm install @vercel/analytics
```

Em `main.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

### **3. Sentry (Erro Tracking)**
```bash
npm install @sentry/react
```

---

## 🎯 **Comandos Rápidos**

```bash
# Build
npm run build --prefix frontend

# Preview
npm run preview --prefix frontend

# Deploy Vercel
cd frontend && vercel --prod

# Deploy Netlify
cd frontend && netlify deploy --prod

# Deploy Railway
cd frontend && railway up
```

---

## ✅ **Checklist Final**

- [ ] RLS ativado no Supabase
- [ ] Variáveis de ambiente configuradas
- [ ] Build testado localmente
- [ ] Deploy realizado
- [ ] Domínio configurado (opcional)
- [ ] SSL/HTTPS ativo
- [ ] Testes em produção
- [ ] Backup configurado
- [ ] Monitoramento ativo

---

## 🎊 **Parabéns!**

Seu PDV Master está pronto para produção!

**Custo Total: $0/mês** (Free Tier Supabase + Vercel)

---

**Precisa de ajuda? Consulte os logs ou me chame!** 🚀
