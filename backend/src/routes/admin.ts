import { Router } from 'express';
import { runMigrations } from '../scripts/migrate';
import { seed } from '../scripts/seed';
import { authenticate, requireAdmin } from '../middleware';

const router = Router();

// Endpoint to manually trigger migrations
router.post('/migrate', async (req, res) => {
    try {
        console.log('Admin requested migration');
        const result = await runMigrations();
        res.json(result);
    } catch (error: any) {
        console.error('Migration failed via API:', error);
        res.status(500).json({
            error: 'Migration failed',
            details: error.message,
            stack: error.stack
        });
    }
});

// Endpoint to manually trigger seed
router.post('/seed', async (req, res) => {
    try {
        console.log('Admin requested seed');
        const result = await seed();
        res.json(result);
    } catch (error: any) {
        console.error('Seed failed via API:', error);
        res.status(500).json({
            error: 'Seed failed',
            details: error.message,
            stack: error.stack
        });
    }
});

// Endpoint to create database
router.post('/create-db', async (req, res) => {
    try {
        const { query } = require('../config/database');
        await query('CREATE DATABASE pdv_master');
        res.json({ success: true, message: 'Database pdv_master created' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
