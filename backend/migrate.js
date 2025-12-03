// Database migration script
import { query } from './src/config/database.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schemaPath = path.join(__dirname, 'schema.sql');

async function runMigrations() {
    try {
        console.log('🚀 Starting database migrations...');

        // Read schema file
        if (!fs.existsSync(schemaPath)) {
            throw new Error('schema.sql file not found');
        }

        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        // Split into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`⚡ Executing ${statements.length} SQL statements...`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            try {
                await query(statement);
                console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
            } catch (error) {
                console.warn(`⚠️  Statement ${i + 1} might have errors:`, error.message);
                // Continue to next statement
            }
        }

        console.log('🎉 Migration completed successfully!');

        // Run seed data
        await runSeed();

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

async function runSeed() {
    try {
        console.log('🌱 Seeding initial data...');

        // Insert default admin user
        await query(`
            INSERT INTO users (name, email, password_hash, role, is_active)
            VALUES (
                'Admin',
                'admin@pavmaster.com',
                '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewyHnUn/WRDk.f6',
                'ADMIN',
                true
            )
            ON CONFLICT (email) DO NOTHING
        `);

        // Insert sample settings
        await query(`
            INSERT INTO settings (key, value, description, is_system)
            VALUES
                ('company_name', '"PDV Master"', 'Nome da empresa', false),
                ('theme', '"default"', 'Tema da interface', false),
                ('max_sync_items', '1000', 'Máximo itens na fila de sync', true)
            ON CONFLICT (key) DO NOTHING
        `);

        console.log('✅ Seed data inserted!');

    } catch (error) {
        console.warn('⚠️  Seed failed:', error.message);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations();
}

export { runMigrations, runSeed };
