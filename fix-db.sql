-- Fix PostgreSQL Setup for PDV Master
-- Run in Docker PostgreSQL container

-- First, check current state
\l
\du

-- Create user with proper syntax
CREATE USER IF NOT EXISTS pdv_master WITH PASSWORD 'pdv_master_secure_2024!@#';

-- Create database
CREATE DATABASE IF NOT EXISTS pdv_master OWNER pdv_master;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE pdv_master TO pdv_master;

-- Connect and setup
\c pdv_master;

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO pdv_master;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pdv_master;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pdv_master;
