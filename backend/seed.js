// Database seeding script
import { query } from './src/config/database.ts';

async function runSeed() {
    try {
        console.log('🌱 Starting database seeding...');

        // Create default admin user
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
        console.log('✅ Admin user created');

        // The schema.sql already includes sample data, so we just need to add a few custom items
        console.log('✅ Sample data already created by schema.sql');

        console.log('🎉 Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSeed().then(() => process.exit(0));
}

export { runSeed };
