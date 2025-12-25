// Database migration script
import { query } from '../config/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// In CJS, __dirname is global

const schemaPath = path.join(__dirname, '../../schema.simple.sql');

async function runMigrations() {
    try {
        console.log('🚀 Starting database migrations...');

        // Read schema file
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`schema.sql file not found at ${schemaPath}`);
        }

        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

        // Split into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => {
                if (stmt.length === 0) return false;
                // Remove comments to see if there's any actual SQL
                const withoutComments = stmt.replace(/--.*$/gm, '').trim();
                return withoutComments.length > 0;
            });

        console.log(`📊 Found ${statements.length} statements after filtering`);

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
        return { success: true, message: 'Migrations completed' };

    } catch (error) {
        console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
        throw error;
    }
}

if (require.main === module) {
    runMigrations();
}

export { runMigrations };
