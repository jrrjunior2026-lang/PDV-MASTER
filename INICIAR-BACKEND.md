# 🚀 Guia Rápido - Iniciar Backend

## ✅ Status Atual

- ✅ Diretório backend encontrado
- ✅ Dependências instaladas
- ✅ Arquivo .env configurado
- ✅ Porta 3001 livre
- ⚠️ **Servidor não está rodando**

## 🎯 Como Iniciar o Servidor Backend

### Opção 1: Desenvolvimento Local (Recomendado)

```powershell
cd backend
npm run dev
```

O servidor iniciará em `http://localhost:3001`

### Opção 2: Usando Docker (Mais Fácil)

```powershell
.\scripts\start-dev.ps1
```

Isso iniciará todos os serviços (PostgreSQL, Backend, Frontend) automaticamente.

### Opção 3: Docker Compose Manual

```powershell
docker-compose up -d backend
```

## 🔍 Verificar se Está Funcionando

Após iniciar o servidor, acesse:

- **Health Check**: http://localhost:3001/health
- Deve retornar: `{"status":"healthy",...}`

## 🛠️ Script de Verificação

Execute o script de verificação a qualquer momento:

```powershell
.\scripts\check-backend.ps1
```

Este script verifica:
- ✅ Configuração do ambiente
- ✅ Dependências instaladas
- ✅ Porta disponível
- ✅ Status do servidor

## ⚠️ Solução de Problemas

### Erro: "Porta 3001 já está em uso"

```powershell
# Verificar qual processo está usando a porta
netstat -ano | findstr :3001

# Parar o processo (substitua PID pelo número do processo)
taskkill /PID <PID> /F
```

### Erro: "Database connection failed"

Certifique-se de que:
1. PostgreSQL está rodando
2. As credenciais no `.env` estão corretas
3. O banco de dados `pdv_master` existe

### Erro: "JWT_SECRET must be at least 64 characters"

Edite o arquivo `backend/.env` e defina um `JWT_SECRET` com pelo menos 64 caracteres.

## 📝 Variáveis de Ambiente Importantes

Certifique-se de que o arquivo `backend/.env` contém:

```env
DATABASE_HOST=localhost
DATABASE_NAME=pdv_master
DATABASE_USER=pdv_master_user
DATABASE_PASSWORD=sua_senha
JWT_SECRET=sua_chave_secreta_com_pelo_menos_64_caracteres
```

## 🎉 Próximos Passos

1. Inicie o servidor backend
2. Verifique o health check
3. Teste a conexão fiscal na página de Configurações

