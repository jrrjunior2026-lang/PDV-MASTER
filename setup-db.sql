-- PostgreSQL Setup Script para PDV Master
-- Executar no container Docker PostgreSQL

-- Criar usuário
CREATE USER pdv_master WITH PASSWORD 'pdv_master_secure_2024!@#';

-- Criar banco de dados
CREATE DATABASE pdv_master OWNER pdv_master;

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE pdv_master TO pdv_master;

-- Conectar ao banco e dar permissões
\c pdv_master;

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Dar permissões ao usuário
GRANT ALL PRIVILEGES ON SCHEMA public TO pdv_master;
