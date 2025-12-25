import { query } from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
    console.log('🌱 Starting database seed...');

    try {
        // Create default admin user
        const passwordHash = await bcrypt.hash('admin123', 10);

        await query(`
            INSERT INTO users (name, email, password_hash, role, is_active)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active
        `, ['Admin', 'admin@pdvmaster.com', passwordHash, 'ADMIN', true]);

        console.log('✅ Default admin user created/updated');

        // Create some sample products
        const products = [
            { code: '001', name: 'Coca Cola 2L', price: 10.00, stock: 100 },
            { code: '002', name: 'Arroz 5kg', price: 25.00, stock: 50 },
            { code: '003', name: 'Feijão 1kg', price: 8.00, stock: 80 },
        ];

        for (const p of products) {
            await query(`
                INSERT INTO products (code, name, price, stock, is_active)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (code) DO NOTHING
            `, [p.code, p.name, p.price, p.stock, true]);
        }

        console.log('✅ Sample products created');

        console.log('🎉 Seed completed successfully!');
        return { success: true, message: 'Seed completed' };
    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
}

if (require.main === module) {
    seed();
}

export { seed };
