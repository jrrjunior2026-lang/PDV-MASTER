# 🐳 Docker Setup - PDV Master

Este guia mostra como executar o PDV Master usando Docker para desenvolvimento e produção.

## 📋 Pré-requisitos

- **Docker** 24+
- **Docker Compose** 2.0+
- **Git**
- Pelo menos **4GB RAM** disponível

---

## 🚀 Desenvolvimento Rápido

### 1. Ambiente Completo (Recomendado)

```bash
# Inicia todos os serviços (PostgreSQL, pgAdmin, Redis, Frontend, Backend)
npm run docker:dev
```

**Serviços disponíveis:**
- 🎨 **Frontend**: http://localhost:3000
- 🚀 **Backend API**: http://localhost:3001
- 🗄️ **PostgreSQL**: localhost:5432
- 📊 **pgAdmin**: http://localhost:5050 (admin@pdvmaster.local / admin123)

### 2. Apenas Banco + Admin (Leve)

```bash
# Inicia apenas PostgreSQL + pgAdmin
npm run docker:dev:db
```

### 3. Desenvolvimento Individual

```bash
# Backend apenas
cd backend && npm run dev

# Frontend apenas (com API externa)
npm run dev
```

---

## 🏭 Produção

### 1. Configuração Ambiente

```bash
# Criar arquivo de produção
cp .env.example .env.production

# Editar com valores reais de produção
vim .env.production
```

**Variáveis críticas:**
```env
DATABASE_NAME=pdv_master_prod
DATABASE_USER=pdv_master_prod
DATABASE_PASSWORD=SUA_SENHA_FORTE_AQUI
JWT_SECRET=CHAVE_JWT_PRODUCAO_64_CHARS_MIN
JWT_REFRESH_SECRET=CHAVE_REFRESH_PRODUCAO_64_CHARS
```

### 2. Deploy Produção

```bash
# Build e deploy em produção
npm run docker:prod

# Com SSL/Cluster
npm run docker:prod cluster
```

### 3. Configuração SSL (OPCIONAL)

```bash
# Criar diretório SSL
mkdir -p nginx/ssl

# Gerar certificado auto-assinado (teste)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/pdv-master.key \
  -out nginx/ssl/pdv-master.crt

# Para produção, use Let's Encrypt ou provedor certificado
```

---

## 🛠️ Comandos Docker Úteis

### Desenvolvimento
```bash
# Ver logs em tempo real
npm run docker:logs

# Executar comandos no container
docker-compose exec backend sh
docker-compose exec postgres psql -U pdv_master_user -d pdv_master

# Resetar banco para testes
npm run docker:db:reset

# Executar testes no container
docker-compose exec backend npm run test

# Parar todos os serviços
npm run docker:stop

# Limpar tudo (CUIDADO!)
npm run docker:clean
```

### Produção
```bash
# Atualizar imagens
docker-compose pull

# Ver health checks
curl http://localhost/health
curl http://localhost:3001/health

# Escalar serviços
docker-compose up -d --scale backend=3

# Backup do banco
docker-compose exec postgres pg_dump -U pdv_master_user pdv_master > backup.sql
```

---

## 🔧 Troubleshooting

### 🚨 **PROBLEMA COMUM NO WINDOWS: Docker Desktop não responde**

#### **Sintomas:**
```
unable to get image: error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.51/images/...": open //./pipe/dockerDesktopLinuxEngine: O sistema não pode encontrar o arquivo especificado.
```

#### **Soluções:**

**1. Verificar se Docker Desktop está rodando:**
- Abra Docker Desktop
- Aguarde carregar completamente
- Deve aparecer ícone na system tray

**2. Reiniciar Docker Desktop:**
```powershell
# Fechar Docker Desktop completamente
# Settings > Quit Docker Desktop

# Abrir novamente
# Aguardar inicialização completa
```

**3. Resetar Docker (se necessário):**
```powershell
# No Docker Desktop: Settings > Reset > Restart (volta ao padrão)
```

**4. Alternativa: Docker via WSL2**
```bash
# Se usar WSL2, executar comandos dentro do WSL:
wsl -d Ubuntu  # Ou seu distro WSL
cd /mnt/c/Users/Usuario/Documents/PDV-MASTER
docker-compose up --build
```

### Problema: Portas ocupadas
```bash
# Windows - encontrar processos
netstat -ano | findstr :3000
netstat -ano | findstr :3001
# taskkill /PID <numero> /F

# Ou usar portas alternativas
docker-compose up -f docker-compose.yml -f docker-compose.override.yml
```

### Problema: Banco não responde
```bash
# Verificar status PostgreSQL
docker-compose ps postgres

# Ver logs do banco
docker-compose logs postgres

# Reinicializar banco
docker-compose restart postgres

# Resetar dados (CUIDADO)
docker-compose exec postgres psql -U pdv_master_user -d pdv_master -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-seed
docker-compose restart postgres
```

### Problema: Memória insuficiente (Windows)
```bash
# Verificar uso de recursos
docker stats

# No Docker Desktop:
# Settings > Resources > Aumente memória para 6GB+
# Settings > Resources > CPUs: pelo menos 4

# Limpar imagens não utilizadas
docker system prune -a
docker volume prune
```

---

## 📊 Arquitetura Docker

### Desenvolvimento
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │────│   Backend   │────│ PostgreSQL  │
│    React    │    │   Express   │    │    +       │
│   localhost │    │   localhost │    │   pgAdmin  │
│     :3000   │    │     :3001   │    │    :5050    │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    Redis    │
                   │  (opcional) │
                   │    :6379    │
                   └─────────────┘
```

### Produção
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │────│  Backend    │────│ PostgreSQL  │
│   Reverse   │    │   Cluster   │    │    SSL      │
│   Proxy     │    │   (PM2)     │    │   Backup    │
│  :443/:80   │    │   Auto-SCL  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    Redis    │
                   │   Sessions  │
                   │    Cache    │
                   └─────────────┘
```

---

## 🔒 Segurança em Produção

### Variáveis Secretas
```bash
# Criar secrets external no Docker Swarm
echo "my-jwt-secret" | docker secret create jwt_secret -
echo "my-db-pass" | docker secret create db_password -

# Usar no docker-compose.prod.yml
secrets:
  jwt_secret:
    external: true
```

### Network Isolation
```yaml
networks:
  public:
    # Internet-facing
  private:
    # Database, cache
  admin:
    # Management tools
```

### Health Checks
- ✅ PostgreSQL health check
- ✅ Backend API health check
- ✅ Frontend health check
- ✅ Redis connectivity
- ✅ SSL certificate monitoring

---

## 📈 Monitoramento

### Métricas Inclusas
- 🏥 **Health Checks**: `/health` endpoints
- 📊 **Application Metrics**: Response times
- 🔍 **Database Metrics**: Connection pools
- 💾 **Storage Metrics**: Upload sizes
- 🔐 **Security Logs**: Failed authentications

### Ferramentas Recomendadas
```bash
# Monitoring Stack
docker-compose -f docker-compose.monitoring.yml up -d

# Inclui:
# - Prometheus (metrics)
# - Grafana (dashboards)
# - AlertManager (alerts)
# - cAdvisor (container metrics)
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Ready
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run type-check
      - run: npm run test:run
      - run: npm run lint

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/owner/pdv-master:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to production server"
```

---

## 🎯 Próximos Passos

1. **Configurar domínio** + SSL wildcard
2. **Backup automático** PostgreSQL
3. **Log aggregation** (ELK stack)
4. **Container registry** (GitHub Packages)
5. **Monitoring** + alerting
6. **Load balancing** multi-host
7. **Database sharding** (se necessário)

---

## 💡 Dicas Pro

- **Development**: Use `docker-compose.override.yml` para configs específicas
- **Backup**: Volume mounts externos para dados persistentes
- **Security**: Regular image scans `docker scan`
- **Performance**: Resource limits baseados no monitoramento
- **Updates**: Blue-green deployment para zero-downtime

---

**🎉 Pronto para deploy profissional!**

O sistema Docker está configurado para **desenvolvimento ágil** e **produção enterprise** com alta disponibilidade, segurança e performance.
