import express, { Request, Response } from 'express';
import { acbrService } from '../services/acbrService.js';
import { queryOne, query } from '../config/database.js';
import { authenticate } from '../middleware/index.js';
import { generateINI } from '../utils/acbrUtils.js';

const router = express.Router();

// Check ACBr Monitor status
router.get('/status', authenticate, async (req: Request, res: Response) => {
    try {
        const status = await acbrService.checkStatus();
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Emit NFC-e for a sale
router.post('/emitir-nfce/:saleId', authenticate, async (req: Request, res: Response) => {
    const { saleId } = req.params;
    try {
        // 1. Get sale data
        const sale = await queryOne('SELECT * FROM sales WHERE id = $1', [saleId]);
        if (!sale) {
            return res.status(404).json({ success: false, message: 'Venda não encontrada' });
        }

        const items = await query(`
            SELECT si.*, p.code, p.name, p.ncm, p.barcode, p.unit, p.origin
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = $1
        `, [saleId]);

        const companySetting = await queryOne("SELECT value FROM settings WHERE key = 'company'");
        const fiscalSetting = await queryOne("SELECT value FROM settings WHERE key = 'fiscal'");

        let customer = null;
        if (sale.customer_id) {
            customer = await queryOne('SELECT * FROM customers WHERE id = $1', [sale.customer_id]);
        }

        if (!companySetting || !fiscalSetting) {
            return res.status(400).json({ success: false, message: 'Configurações de empresa ou fiscal não encontradas' });
        }

        // 2. Generate INI
        const iniContent = generateINI(
            sale,
            items,
            JSON.parse(companySetting.value),
            JSON.parse(fiscalSetting.value),
            customer
        );

        // 3. Send to ACBr
        const response = await acbrService.createNFCe(iniContent);

        // 4. Update sale with fiscal info if success
        if (response.success) {
            // Extract XML path or key from response if possible
            // ACBr response usually contains the XML path
            await query('UPDATE sales SET notes = CONCAT(notes, $2) WHERE id = $1',
                [saleId, `\nNFC-e emitida: ${response.message}`]);
        }

        res.json(response);
    } catch (error: any) {
        console.error('Erro ao emitir NFC-e:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Print DANFE
router.post('/imprimir/:saleId', authenticate, async (req: Request, res: Response) => {
    const { saleId } = req.params;
    try {
        // This would require the XML path stored in the sale
        // For now, let's assume we can get it from the notes or a new column
        const sale = await queryOne('SELECT notes FROM sales WHERE id = $1', [saleId]);

        // Simple regex to find XML path in notes (this is a bit hacky, should have a proper column)
        const match = sale.notes?.match(/OK: (.*\.xml)/);
        if (match && match[1]) {
            const response = await acbrService.imprimirDANFE(match[1]);
            res.json(response);
        } else {
            res.status(400).json({ success: false, message: 'XML da nota não encontrado para impressão' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export { router as fiscalRoutes };
