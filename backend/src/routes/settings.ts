import express, { Request, Response } from 'express';
import { query, queryOne } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/index.js';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/index.js';

const router = express.Router();

// Get all settings
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const settings = await query('SELECT key, value, description FROM settings WHERE is_system = false');
        const systemSettings = await query('SELECT key, value, description FROM settings WHERE is_system = true');

        res.json({
            settings: settings,
            system: systemSettings
        });
    } catch (error) {
        console.error('Settings get error:', error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// Update setting
router.put('/:key', [
    authenticate,
    requireAdmin,
    param('key').isString(),
    body('value').exists()
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const userId = req.user!.id;

        await query(`
            INSERT INTO settings (key, value, updated_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = NOW(),
                updated_by = EXCLUDED.updated_by
        `, [key, value, userId]);

        res.json({ message: 'Configuração atualizada com sucesso' });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'Erro ao atualizar configuração' });
    }
});

export { router as settingRoutes };
