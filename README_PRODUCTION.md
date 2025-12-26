# 🚀 PDV Master - Sistema de Ponto de Venda Serverless

[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

Sistema completo de PDV (Ponto de Venda) com arquitetura 100% serverless, ideal para pequenos e médios comércios.

---

## ✨ **Funcionalidades**

### 🛒 **Ponto de Venda (PDV)**
- Interface moderna e responsiva
- Suporte a múltiplos métodos de pagamento (Dinheiro, Cartão, PIX)
- Identificação de clientes
- Cálculo automático de troco
- Impressão de cupom fiscal (NFC-e) e recibo simples
- Atalhos de teclado para agilidade

### 📦 **Gestão de Estoque**
- Cadastro completo de produtos
- Controle de estoque em tempo real
- Kardex (histórico de movimentações)
- Alertas de estoque mínimo
- Importação/Exportação via CSV
- Gerador de etiquetas com código de barras

### 👥 **CRM (Gestão de Clientes)**
- Cadastro de clientes
- Histórico de compras
- Limite de crédito
- Marketing com IA (Gemini)

### 💰 **Financeiro**
- Contas a pagar e receber
- Fluxo de caixa
- Controle de sangria e suprimento
- Relatórios financeiros

### 📊 **Relatórios**
- Vendas por período
- Posição de estoque
- Fechamentos de caixa
- Extrato financeiro
- Exportação para Excel/CSV

### ⚙️ **Configurações**
- Dados da empresa
- Configurações fiscais (NFC-e)
- Personalização visual
- Gestão de usuários
- Auditoria de ações

---

## 🏗️ **Arquitetura**

### **Stack Tecnológico**

#### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **React Router** - Routing
- **Recharts** - Gráficos

#### Backend (Serverless)
- **Supabase** - Backend as a Service
  - PostgreSQL Database
  - Authentication
  - Storage
  - Row Level Security (RLS)
  - Edge Functions

#### Integrações
- **Google Gemini AI** - Análises inteligentes
- **PIX** - Pagamentos instantâneos
- **NFC-e** - Nota Fiscal Eletrônica (em desenvolvimento)

---

## 🚀 **Deploy Rápido**

### **Opção 1: Vercel (Recomendado)**

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/pdv-master.git
cd pdv-master

# 2. Configure as variáveis de ambiente
cp frontend/.env.production.example frontend/.env.production
# Edite .env.production com suas credenciais do Supabase

# 3. Deploy
cd frontend
npm install
vercel --prod
```

### **Opção 2: Netlify**

```bash
# 1. Clone e configure
git clone https://github.com/seu-usuario/pdv-master.git
cd pdv-master/frontend

# 2. Configure variáveis de ambiente
cp .env.production.example .env.production
# Edite com suas credenciais

# 3. Deploy
npm install
netlify deploy --prod
```

### **Opção 3: Script Automatizado (Windows)**

```powershell
.\deploy.ps1
```

---

## 🛠️ **Desenvolvimento Local**

### **Pré-requisitos**
- Node.js 18+
- npm ou yarn
- Conta no Supabase

### **Configuração**

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/pdv-master.git
cd pdv-master
```

2. **Configure o Supabase**
```bash
# Execute os scripts SQL no Supabase SQL Editor (nesta ordem):
# 1. backend/database/supabase_cleanup.sql (se necessário)
# 2. backend/database/supabase_complete_migration.sql
# 3. backend/database/supabase_create_admin.sql
# 4. backend/database/supabase_rls_policies.sql
```

3. **Configure variáveis de ambiente**
```bash
cd frontend
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

4. **Instale dependências e execute**
```bash
npm install
npm run dev
```

5. **Acesse**
```
http://localhost:3000
```

**Credenciais padrão:**
- Email: `admin@pdvmaster.br`
- Senha: `admin`

---

## 📚 **Documentação**

- [Guia de Deploy para Produção](./PRODUCTION_DEPLOY_GUIDE.md)
- [Checklist de Produção](./PRODUCTION_CHECKLIST.md)
- [Guia de Migração Supabase](./SUPABASE_MIGRATION_GUIDE.md)
- [Resumo Final](./FINAL_SUMMARY.md)

---

## 🔒 **Segurança**

- ✅ Autenticação via Supabase Auth
- ✅ Row Level Security (RLS) no banco
- ✅ HTTPS obrigatório em produção
- ✅ Variáveis de ambiente seguras
- ✅ Headers de segurança configurados
- ✅ Auditoria de ações

---

## 💰 **Custos**

### **Desenvolvimento/Testes**
- **Supabase Free Tier:** $0/mês
- **Vercel Free Tier:** $0/mês
- **Total:** **$0/mês**

### **Produção (estimado)**
- **Supabase Pro:** $25/mês (opcional)
- **Vercel Pro:** $20/mês (opcional)
- **Domínio:** ~$12/ano

**Pode rodar 100% grátis no Free Tier!**

---

## 🤝 **Contribuindo**

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📝 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🙏 **Agradecimentos**

- [Supabase](https://supabase.com) - Backend as a Service
- [Vercel](https://vercel.com) - Hosting
- [Google Gemini](https://ai.google.dev) - IA
- Comunidade Open Source

---

## 📞 **Suporte**

- **Issues:** [GitHub Issues](https://github.com/seu-usuario/pdv-master/issues)
- **Documentação:** [Wiki](https://github.com/seu-usuario/pdv-master/wiki)
- **Email:** suporte@pdvmaster.com

---

## 🎯 **Roadmap**

- [x] Sistema de PDV completo
- [x] Gestão de estoque
- [x] CRM básico
- [x] Relatórios
- [x] Migração Supabase
- [ ] Emissão de NFC-e
- [ ] App Mobile (React Native)
- [ ] Multi-loja
- [ ] Integração com marketplaces
- [ ] Dashboard analytics avançado

---

## ⭐ **Star History**

Se este projeto te ajudou, considere dar uma ⭐!

---

**Desenvolvido com ❤️ para a comunidade**

🚀 **PDV Master - Seu PDV na nuvem!**
