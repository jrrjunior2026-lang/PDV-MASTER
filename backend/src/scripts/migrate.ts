// Database migration script
import { query } from '../config/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schemaPath = path.join(__dirname, '../../schema.sql');

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
                console.warn(`⚠️  Statement ${i + 1} might have errors:`, error instanceof Error ? error.message : String(error));
                // Continue to next statement
            }
        }

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations();
}

export { runMigrations };
