import { Pool } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
}

// Database configuration
// import * as functions from 'firebase-functions'; 

const getDBConfig = (): DatabaseConfig => {
  // Check if running in Firebase Functions environment (Cloud SQL)
  // We use INSTANCE_CONNECTION_NAME to detect this
  if (process.env.INSTANCE_CONNECTION_NAME) {
    return {
      host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`, // Unix socket path
      port: 5432,
      database: process.env.DB_NAME || 'pdv_master',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      ssl: false,
      maxConnections: 10,
    };
  }

  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'pdv_master',
    user: process.env.DATABASE_USER || 'pdv_master_user',
    password: process.env.DATABASE_PASSWORD || 'pdv_master_pass',
    ssl: process.env.DATABASE_SSL === 'true',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
  };
};

// Global database pool
let pool: Pool;

// Initialize database connection
export const connectDB = (): Pool => {
  if (!pool) {
    const config = getDBConfig();

    const poolConfig: any = {
      user: config.user,
      password: config.password,
      database: config.database,
      max: config.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout for cloud connections
    };

    // If INSTANCE_CONNECTION_NAME is present, use Unix socket (Cloud SQL)
    // Otherwise use TCP (Localhost)
    if (process.env.INSTANCE_CONNECTION_NAME && process.env.NODE_ENV === 'production') {
      poolConfig.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
      // No port needed for socket connection
    } else {
      poolConfig.host = config.host;
      poolConfig.port = config.port;
      poolConfig.ssl = config.ssl ? { rejectUnauthorized: false } : false;
    }

    const poolConfigToLog = { ...poolConfig };
    delete poolConfigToLog.password;
    console.log('🔌 Database pool created. Config:', JSON.stringify(poolConfigToLog, null, 2));

    pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  return pool;
};

// Initialize database and run migrations
export const initDB = async (): Promise<void> => {
  const pool = connectDB();

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Create required extensions and types if they don't exist
    await createExtensions(client);

    // Create tables if they don't exist
    await createTablesIfNotExist(client);

    // Verify schema integrity
    await verifySchema(client);

    client.release();

    console.log('🎯 Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Create required PostgreSQL extensions
const createExtensions = async (client: any): Promise<void> => {
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gin";
  `);
};

// Create tables if they don't exist
const createTablesIfNotExist = async (client: any): Promise<void> => {
  // Check if tables exist
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    );
  `);

  const tablesExist = result.rows[0].exists;

  if (!tablesExist) {
    console.log('📝 Creating database tables...');
    // Create tables (simplified - in production use proper migrations)
    await createEssentialTables(client);
  } else {
    console.log('✅ Database tables already exist');
  }
};

// Create essential tables (simplified version)
const createEssentialTables = async (client: any): Promise<void> => {
  // Create types
  await client.query(`
    DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('SALE', 'ADJUSTMENT', 'SUPPLY', 'BLEED', 'OPENING', 'CLOSING');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('CASH', 'PIX', 'CARD', 'CREDIT');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
        CREATE TYPE register_status AS ENUM ('OPEN', 'CLOSED', 'COUNTING');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
        CREATE TYPE financial_type AS ENUM ('INCOME', 'EXPENSE');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
        CREATE TYPE tax_group AS ENUM ('A', 'B', 'C');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
        CREATE TYPE unit_type AS ENUM ('UN', 'KG', 'L', 'M');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    DO $$ BEGIN
        CREATE TYPE origin_code AS ENUM ('0', '1', '2');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role user_role NOT NULL DEFAULT 'CASHIER',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create products table
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      cost DECIMAL(10,2) NOT NULL DEFAULT 0,
      stock DECIMAL(10,3) NOT NULL DEFAULT 0,
      min_stock DECIMAL(10,3) DEFAULT 0,
      ncm VARCHAR(11),
      cest VARCHAR(8),
      origin origin_code DEFAULT '0',
      tax_group tax_group,
      unit unit_type DEFAULT 'UN',
      barcode VARCHAR(50),
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create settings table
  await client.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(100) UNIQUE NOT NULL,
      value JSONB NOT NULL,
      description TEXT,
      is_system BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create customers table
  await client.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      document VARCHAR(18),
      email VARCHAR(150),
      phone VARCHAR(20),
      address TEXT,
      credit_limit DECIMAL(10,2) DEFAULT 0,
      current_debt DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create sales table
  await client.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      payment_method payment_method NOT NULL DEFAULT 'CASH',
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_cancelled BOOLEAN NOT NULL DEFAULT false,
      notes TEXT
    );
  `);

  // Create sale_items table
  await client.query(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity DECIMAL(8,3) NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(sale_id, product_id)
    );
  `);

  // Create indexes for better performance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(document);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date DESC);
  `);

  console.log('✅ Essential tables created');
};

// Verify schema integrity
const verifySchema = async (client: any): Promise<void> => {
  // Check if required tables exist
  const tables = ['users', 'products', 'settings', 'customers', 'sales', 'sale_items'];
  for (const table of tables) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    `, [table]);

    if (!result.rows[0].exists) {
      throw new Error(`Required table '${table}' does not exist`);
    }
  }
};

// Query helper functions
export const query = async (text: string, params?: any[]): Promise<any[]> => {
  const pool = connectDB();
  const client = await pool.connect();

  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
};

export const queryOne = async (text: string, params?: any[]): Promise<any> => {
  const rows = await query(text, params);
  return rows[0] || null;
};

export const transaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const pool = connectDB();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Close database connections
export const closeDB = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null as any;
    console.log('✅ Database connections closed');
  }
};

// Health check
export const pingDB = async (): Promise<boolean> => {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database ping failed:', error);
    return false;
  }
};
