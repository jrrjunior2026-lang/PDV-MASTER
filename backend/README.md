# PDV Master Backend

## Arquitetura PostgreSQL Completa

Um backend robusto para o sistema PDV Master implementado com PostgreSQL, Express.js e TypeScript.

## 🚀 Funcionalidades Implementadas

### ✅ **Banco de Dados PostgreSQL Completo**

**📊 Schema Empresarial Completo:**
- **15 Tabelas** com relacionamentos complexos
- **Enums avançados** para tipos de dados específicos
- **Triggers automáticos** para manutenção de estoque
- **Índices otimizados** para consultas rápidas
- **Constraints rigorosas** de integridade

**🔗 Sistema de Relacionamentos:**
```
Users ⟷ Cash Registers ⟷ Transactions
Products ⟷ Sale Items ⟷ Sales
Sales ⟷ Customers (opcional)
Products ⟷ Kardex (movimentos de estoque)
Users ⟷ Audit Logs
```

### ✅ **API REST Profissional**

**🛡️ Segurança Corporativa:**
- **JWT Authentication** com refresh tokens
- **BCrypt hashing** para senhas
- **Rate limiting** (100 requests/15min)
- **CORS configurado** para frontend
- **Helmet security headers**
- **Middleware de auditoria** automático

**📡 Endpoints Estruturados:**
```
POST   /api/auth/login           - Login
GET    /api/auth/profile         - Perfil do usuário
POST   /api/auth/change-password - Mudar senha
POST   /api/sync                - Sincronização offline
GET    /api/products            - Listar produtos
POST   /api/products            - Criar produto
GET    /api/sales              - Histórico de vendas
```

### ✅ **Sistema de Sincronização Offline/Online**

**🔄 Sync Inteligente:**
- **Fila persistente** no PostgreSQL
- **Retry automático** com backoff
- **Conflito resolution**
- **Batch processing**
- **Status em tempo real**

**📱 Estados de Sync:**
```
PENDING   → SYNCING → SUCCESS
   ↓           ↓         ↓
FAILED ←───────←───────←
```

## 🏛️ **Arquitetura do Database**

### **Tabelas Principais:**

#### `users` - Usuários do Sistema
```sql
- UUID primary key
- Nome, email, senha hash
- Role: ADMIN/CASHIER
- Created/updated timestamps
- Soft delete (is_active)
```

#### `products` - Catalogo de Produtos
```sql
- UUID primary key
- Código único, nome, preços
- Estoque atual e mínimo
- NCM/CEST, origem, grupo tributário
- Imagem, descrição, unidade
- Full-text search com pg_trgm
```

#### `sales` & `sale_items` - Vendas
```sql
sales:
- UUID, total, subtotal, desconto
- Pagamento method, cliente opcional
- Operador responsável
- Timestamp e flags de cancelamento

sale_items:
- Quantidade, preço unitário
- Desconto por item
- FK com products (restrição)
```

#### `cash_registers` - Controle de Caixa
```sql
- Status: OPEN/CLOSED/COUNTING
- Saldos: abertura, corrente, calculado
- Operador responsável
- Contagem manual vs sistema
- Diferença automática
```

#### `sync_queue` - Fila de Sincronização
```sql
- Device ID para multi-dispositivo
- Tipo: CREATE/UPDATE/DELETE
- Dados JSONB completos
- Retry count e último erro
- Timestamps de processameto
```

## 📈 **Recursos Avançados**

### **🔍 Pesquisa Otimizada**
- **Full-text search** em produtos com GIN indexes
- **Trigram similarity** para correção de digitação
- **Indexação avançada** em campos críticos

### **🔐 Segurança Corporativa**
- **Auditoria completa** de todas as ações
- **Logs estruturados** com IP e user-agent
- **Password complexity** enforcement
- **Session management** com JWT expiration

### **⚡ Performance Empresarial**
- **Connection pooling** com pg.Pool
- **Queries parametrizadas** contra SQL injection
- **Transaction support** para consistência
- **Lazy loading** de recursos relacionados

## 🛠️ **Setup & Development**

### **Pré-requisitos:**
1. **PostgreSQL 15+** instalado
2. **Node.js 18+** instalado
3. **NPM ou Yarn** para dependencies

### **1. Configuração do Database:**

```bash
# Criar database
createdb pdv_master

# Executar schema completo
psql -d pdv_master -f schema.sql

# Usuário padrão:
# admin@pdvmaster.br / PDV@2024!
```

### **2. Instalação Backend:**

```bash
cd backend
npm install
# ou
yarn install
```

### **3. Configurar Environment:**
```bash
cp .env.example .env

# Editar .env com suas configurações:
DATABASE_HOST=localhost
DATABASE_PASSWORD=pdv_master_pass
JWT_SECRET=your-super-secret-key
```

### **4. Desenvolvimento:**
```bash
# Desenvolvimento com hot-reload
npm run dev

# Build para produção
npm run build

# Executar build
npm start
```

## 🔌 **Integração com Frontend**

### **API Endpoints:**

**Authentication:**
```javascript
POST /api/auth/login
Headers: Content-Type: application/json
Body: { "email": "admin@pdvmaster.br", "password": "PDV@2024!" }

Response: {
  "user": { "id": "uuid", "name": "Admin", "role": "ADMIN" },
  "token": "jwt-token-here"
}
```

**Proxy Configuration (vite.config.ts):**
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

## 📊 **Arquiteturas Suportadas**

### **Monolithic Architecture (Atual)**
```
[Frontend React] ←API→ [Express.js] ←DB→ [PostgreSQL]
                      ↓
              [File System: uploads/]
```

### **Roadmap: Microservices Ready**
```
[API Gateway] → Bus Empresarial → [Auth Service]
                   ↓                        ↓
           [Product Service] ←DB→   [PostgreSQL]
                   ↓                        ↓
           [Sale Service]     ←Sync→  [Redis Cache]
```

## 🎯 **Próximos Passos**

### ****Para Completação Completa:**
1. ✅ Schema PostgreSQL (Implementado)
2. ✅ API Base (Implementado)
3. ✅ Sistema de Autenticação (Implementado)
4. 🔄 **Business Logic Completa** (Próxima Fase)
5. 🔄 **File Upload Service**
6. 🔄 **Email Notifications**
7. 🔄 **Relatórios PDF/Excel**

### **Infraestrutura:**
- **Docker Compose** para desenvolvimento
- **Migration Scripts** para produção
- **Backup/Restore** automatizado
- **Monitoring & Alerting**

## 🚀 **Testes Rápidos**

### **Health Check:**
```bash
curl http://localhost:3001/health
# Expected: {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

### **Login Test:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pdvmaster.br","password":"PDV@2024!"}'
```

### **Database Health:**
```bash
# Verificar tabelas
psql -d pdv_master -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

## 🔧 **Troubleshooting**

### **Common Issues:**

**PostgreSQL Connection Failed:**
```bash
# Verificar se PostgreSQL está rodando
pg_isready -h localhost -p 5432

# Logs detalhados
tail -f ~/.pglog/postgresql.log
```

**Build Errors:**
```bash
# Limpar cache
npm run clean
npm install
npm run build
```

**TypeScript Errors:**
```bash
npx tsc --noEmit src/**/*.ts
```

---

**🎊 Posteriormente pode ser implementado a lógica completa das APIs seguindo o mesmo padrão implementado!**

Cada rota pode ser desenvolvida com:
- ✅ Validação robusta
- ✅ Logging automático
- ✅ Transaction safety
- ✅ Error handling completo
- ✅ Performance otimizada
