<div align="center">
  <h1>🛒 PDV Master - Sistema de Ponto de Venda</h1>
  <p><em>Sistema completo de gestão para estabelecimentos comerciais</em></p>
  <p>
    <img alt="React" src="https://img.shields.io/badge/React-18.2.0-blue?style=flat-square&logo=react" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.0.0-blue?style=flat-square&logo=typescript" />
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js" />
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql" />
    <img alt="Docker" src="https://img.shields.io/badge/Docker-Ready-blue?style=flat-square&logo=docker" />
  </p>
  <p>
    <strong>🏪 PDV Completo • 📱 PWA • 🔄 Sincronização Offline • 📊 Relatórios</strong>
  </p>
</div>

---

## 📋 **Sobre o Projeto**

PDV Master é um sistema completo de ponto de venda (PDV) desenvolvido para estabelecimentos comerciais. Oferece gestão de produtos, clientes, vendas, inventário e relatórios financeiros, com suporte a NFC-e e funcionamento offline.

### ✨ **Principais Funcionalidades**

- 🛍️ **PDV Completo** - Interface intuitiva para vendas rápidas
- 📦 **Gestão de Inventário** - Controle de estoque com alertas
- 👥 **Cadastro de Clientes** - Base de dados com histórico
- 💰 **NFC-e e Recibos** - Emissão fiscal (NFC-e) e simplificada
- 🔄 **Sincronização** - Modo offline com sync automática
- 📊 **Relatórios** - Análise de vendas e lucros
- 📱 **PWA** - Funciona como app mobile
- 🐳 **Docker** - Ambiente containerizado

---

## 🏗️ **Arquitetura**

```
PDV-MASTER/
├── frontend/           # Aplicação React (Vite)
│   ├── src/            # Código fonte
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/          # Páginas da aplicação
│   └── services/       # Integração com API
├── backend/            # API Node.js (Express)
│   ├── src/            # Código fonte
│   ├── database/       # Scripts SQL e Seeds
│   └── firebase/       # Configurações Firebase
├── scripts/            # Scripts de utilidade
├── docker-compose.yml  # Orquestração para desenvolvimento
└── package.json        # Gerenciamento de workspace
```

---

## 🚀 **Execução Rápida**

### **1. Instalação**
```bash
# Instala tudo (root, backend e frontend)
npm run install:all
```

### **2. Desenvolvimento**
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### **3. Produção com Docker**
```bash
# Sobe todo o ambiente (DB, Redis, Backend, Frontend)
docker-compose -f docker-compose.prod.yml up --build -d
```

### **Tecnologias Utilizadas**

#### **Frontend**
- ⚛️ **React 18** - Framework UI moderno
- 🎯 **TypeScript** - Tipagem forte
- ⚡ **Vite** - Build tool ultra-rápido
- 🎨 **Tailwind CSS** - Estilização utilitária
- 📱 **Lucide Icons** - Ícones consistentes

#### **Backend**
- 🟢 **Node.js + Express** - API REST
- 🗄️ **PostgreSQL** - Banco relacional
- 🔐 **JWT + bcrypt** - Autenticação segura
- ✅ **Zod** - Validação de dados

#### **Infraestrutura**
- 🐳 **Docker** - Containerização
- 🔄 **PM2** - Gerenciamento de processos
- 📊 **pgAdmin** - Administração do banco

---

## 🎯 **Como Usar**

### **1. Primeira Venda**
1. Abra o PDV (http://localhost:3000)
2. Se for a primeira vez, faça abertura do caixa
3. Digite código do produto ou use a busca
4. Adicione produtos ao carrinho
5. Selecione método de pagamento
6. Imprima o recibo/NFC-e

### **2. Gestão de Produtos**
- Acesse "Inventário" para adicionar/cadastrar produtos
- Configure alertas de estoque mínimo
- Imprima etiquetas de preço

### **3. Clientes**
- Pesquise ou cadastre novos clientes
- Visualize histórico de compras
- Configure limites de crédito

### **4. Relatórios**
- Análise de vendas por período
- Lucro/prejuízo financeiro
- Produtos mais vendidos
- Movimentação de caixa

---

## 🔧 **Configurações Avançadas**

### **Variáveis de Ambiente**

#### **Backend (.env)**
```env
# Servidor
PORT=3001
NODE_ENV=development

# Banco de Dados
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pdv_master
DATABASE_USER=pdv_master_user
DATABASE_PASSWORD=pdv_master_pass

# Segurança
JWT_SECRET=super-secret-jwt-key-change-in-production
BCRYPT_ROUNDS=12

# NFC-e (Produção)
CSC_ID=000001
CSC_TOKEN=token-aqui
```

#### **NFC-e Produção**
1. Cadastre-se no SEFAZ do seu estado
2. Obtenha o CSC (Código de Segurança do Contribuinte)
3. Configure em Settings > Fiscal
4. Teste com ambiente de homologação primeiro

### **Impressoras**
- **Não Fiscal:** Qualquer impressora térmica (80mm)
- **Fiscal:** ECF ou NFC-e conforme legislação
- **Etiquetas:** Impressora térmica para etiquetas

---

## 🧪 **Testes**

```bash
# Backend
cd backend
npm test

# Frontend (se configurado)
npm test
```

---

## 📦 **Deploy em Produção**

### **Docker (Recomendado)**
```bash
# Build e execução
docker-compose up -d

# Com nginx reverso proxy
docker-compose -f docker-compose.prod.yml up -d
```

### **Configuração SSL**
```bash
# Gerar certificado Let's Encrypt
certbot certonly --webroot -w /var/www/html -d yourdomain.com
```

---

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Faça commit (`git commit -am 'Adiciona nova feature'`)
4. Push (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### **Padrões de Código**
- ESLint + Prettier configurados
- Commits convencionais
- Testes obrigatórios para novas features

---

## 📝 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

---

## 💡 **Suporte**

- 📧 **Email:** suporte@pdvmaster.com.br
- 📖 **Documentação:** [Wiki do Projeto](wiki)
- 🐛 **Issues:** [GitHub Issues](issues)
- 💬 **Discord:** [Comunidade PDV Master](discord)

---

<div align="center">
  <strong>Feito com ❤️ para estabelecimentos comerciais brasileiros</strong>
</div>
