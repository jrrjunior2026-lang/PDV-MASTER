-- PostgreSQL Setup Script para PDV Master
-- Executar no container Docker PostgreSQL

-- Criar usuário se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pdv_master') THEN
        CREATE USER pdv_master WITH PASSWORD 'pdv_master_secure_2024!@#';
    END IF;
END
$$;

-- Criar banco de dados se não existir
SELECT 'CREATE DATABASE pdv_master OWNER pdv_master'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pdv_master')\gexec

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE pdv_master TO pdv_master;

-- Conectar ao banco e dar permissões
\c pdv_master;

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Dar permissões ao usuário
GRANT ALL PRIVILEGES ON SCHEMA public TO pdv_master;
