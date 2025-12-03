import express, { Request, Response } from 'express';
import { QueryResult } from 'pg';
import { query, queryOne, transaction } from '../config/database.js';
import { authenticate } from '../middleware/index.js';
import { body, param, query as queryParam } from 'express-validator';
import { handleValidationErrors } from '../middleware/index.js';

const router = express.Router();

// Register new sale
router.post('/', [
    authenticate,
    body('items').isArray({ min: 1 }),
    body('items.*.productId').isUUID(),
    body('items.*.quantity').isFloat({ min: 0.001 }),
    body('items.*.price').isFloat({ min: 0 }),
    body('customerId').optional().isUUID(),
    body('paymentMethod').isIn(['CASH', 'PIX', 'CARD', 'CREDIT']),
    body('notes').optional().isString().isLength({ max: 500 })
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { items, customerId, paymentMethod, notes } = req.body;
        const operatorId = req.user!.id;

        await transaction(async (client) => {
            let subtotal = 0;
            let totalDiscount = 0;

            // Validate all products exist and have stock
            for (const item of items) {
                const product = await client.query(`
                    SELECT id, stock, price FROM products
                    WHERE id = $1 AND is_active = true
                `, [item.productId]) as unknown as QueryResult<any>;

                if (product.rows.length === 0) {
                    throw new Error(`Produto ${item.productId} não encontrado ou inativo`);
                }

                const currentStock = parseFloat(product.rows[0].stock);
                if (currentStock < item.quantity) {
                    throw new Error(`Estoque insuficiente para produto ${product.rows[0].id}`);
                }

                const itemTotal = item.quantity * item.price;
                const itemDiscount = item.discount || 0;

                subtotal += itemTotal;
                totalDiscount += itemDiscount;
            }

            const total = subtotal - totalDiscount;

            // Create sale
            const saleResult = await client.query(`
                INSERT INTO sales (
                    total, subtotal, discount, payment_method,
                    customer_id, operator_id, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [total, subtotal, totalDiscount, paymentMethod, customerId || null, operatorId, notes || null]);

            const saleId = saleResult.rows[0].id;

            // Add sale items and update stock
            for (const item of items) {
                // Insert sale item
                await client.query(`
                    INSERT INTO sale_items (
                        sale_id, product_id, quantity, unit_price, discount, total
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [saleId, item.productId, item.quantity, item.price, item.discount || 0, item.quantity * item.price]);

                // Update product stock
                await client.query(`
                    UPDATE products SET stock = stock - $2 WHERE id = $1
                `, [item.productId, item.quantity]);

                // Add kardex entry
                await client.query(`
                    INSERT INTO kardex (
                        product_id, type, quantity, balance_after,
                        sale_id, description, operator_id
                    ) SELECT
                        $1, 'SALE', $2, stock, $3,
                        CONCAT('Venda: ', s.id::text),
                        $4
                    FROM products p
                    CROSS JOIN (SELECT $3::uuid as id) s
                    WHERE p.id = $1
                `, [item.productId, item.quantity, saleId, operatorId]);
            }

            // Add cash transaction if sale is cash-based
            if (['CASH', 'PIX'].includes(paymentMethod)) {
                await client.query(`
                    INSERT INTO cash_transactions (
                        register_id, type, amount, description, operator_id, reference_id
                    ) VALUES (
                        (SELECT id FROM cash_registers WHERE operator_id = $1 AND status = 'OPEN' LIMIT 1),
                        'SALE', $2, CONCAT('Venda: ', $3::text), $1, $3
                    )
                `, [operatorId, total, saleId]);
            }

            // Get complete sale data
            const saleData = await client.query(`
                SELECT s.*, c.name as customer_name, u.name as operator_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN users u ON s.operator_id = u.id
                WHERE s.id = $1
            `, [saleId]) as unknown as QueryResult<any>;

            const saleItems = await client.query(`
                SELECT si.*, p.name as product_name, p.code as product_code
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = $1
                ORDER BY si.created_at
            `, [saleId]) as unknown as QueryResult<any>;

            res.status(201).json({
                sale: {
                    ...saleData.rows[0],
                    total: parseFloat(saleData.rows[0].total),
                    subtotal: parseFloat(saleData.rows[0].subtotal),
                    discount: parseFloat(saleData.rows[0].discount)
                },
                items: saleItems.rows.map(item => ({
                    ...item,
                    quantity: parseFloat(item.quantity),
                    unit_price: parseFloat(item.unit_price),
                    discount: parseFloat(item.discount),
                    total: parseFloat(item.total)
                })),
                message: 'Venda registrada com sucesso'
            });
        });

    } catch (error) {
        console.error('Sale creation error:', error);
        res.status(500).json({ error: (error as any).message || 'Erro ao registrar venda' });
    }
});

// Get sales list with filtering and pagination
router.get('/', [
    authenticate,
    queryParam('page').optional().isInt({ min: 1 }).toInt(),
    queryParam('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryParam('startDate').optional().isISO8601(),
    queryParam('endDate').optional().isISO8601(),
    queryParam('customerId').optional().isUUID(),
    queryParam('paymentMethod').optional().isIn(['CASH', 'PIX', 'CARD', 'CREDIT'])
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const { startDate, endDate, customerId, paymentMethod } = req.query;

        let queryText = `
            SELECT s.id, s.total, s.subtotal, s.discount, s.payment_method,
                   s.date, s.is_cancelled, s.cancellation_reason,
                   c.name as customer_name, u.name as operator_name,
                   COUNT(si.id) as item_count
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.operator_id = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        // Date filters
        if (startDate) {
            queryText += ` AND s.date >= $${paramIndex}`;
            params.push(new Date(startDate as string));
            paramIndex++;
        }

        if (endDate) {
            queryText += ` AND s.date <= $${paramIndex}`;
            params.push(new Date(endDate as string));
            paramIndex++;
        }

        // Customer filter
        if (customerId) {
            queryText += ` AND s.customer_id = $${paramIndex}`;
            params.push(customerId);
            paramIndex++;
        }

        // Payment method filter
        if (paymentMethod) {
            queryText += ` AND s.payment_method = $${paramIndex}`;
            params.push(paymentMethod);
            paramIndex++;
        }

        queryText += ` GROUP BY s.id, c.name, u.name ORDER BY s.date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const sales = await query(queryText, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(DISTINCT s.id) as total FROM sales s WHERE 1=1
        `;
        const countParams = [];
        let countParamIndex = 1;

        if (startDate) {
            countQuery += ` AND s.date >= $${countParamIndex}`;
            countParams.push(new Date(startDate as string));
            countParamIndex++;
        }

        if (endDate) {
            countQuery += ` AND s.date <= $${countParamIndex}`;
            countParams.push(new Date(endDate as string));
            countParamIndex++;
        }

        if (customerId) {
            countQuery += ` AND s.customer_id = $${countParamIndex}`;
            countParams.push(customerId);
            countParamIndex++;
        }

        if (paymentMethod) {
            countQuery += ` AND s.payment_method = $${countParamIndex}`;
            countParams.push(paymentMethod);
            countParamIndex++;
        }

        const totalResult = await queryOne(countQuery, countParams);
        const total = parseInt(totalResult.total);
        const totalPages = Math.ceil(total / limit);

        res.json({
            sales: sales.map(sale => ({
                ...sale,
                total: parseFloat(sale.total),
                subtotal: parseFloat(sale.subtotal),
                discount: parseFloat(sale.discount),
                item_count: parseInt(sale.item_count)
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: { startDate, endDate, customerId, paymentMethod }
        });

    } catch (error) {
        console.error('Sales list error:', error);
        res.status(500).json({ error: 'Erro ao buscar vendas' });
    }
});

// Get single sale
router.get('/:id', [
    authenticate,
    param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get sale header
        const sale = await queryOne(`
            SELECT s.*, c.name as customer_name, c.email as customer_email,
                   u.name as operator_name, cr.id as register_id
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN users u ON s.operator_id = u.id
            LEFT JOIN cash_registers cr ON s.register_id = cr.id
            WHERE s.id = $1
        `, [id]);

        if (!sale) {
            return res.status(404).json({ error: 'Venda não encontrada' });
        }

        // Get sale items
        const items = await query(`
            SELECT si.*, p.name as product_name, p.code as product_code, p.unit
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = $1
            ORDER BY si.created_at
        `, [id]);

        // Get related cash transactions
        const transactions = await query(`
            SELECT ct.type, ct.amount, ct.description, ct.date
            FROM cash_transactions ct
            WHERE ct.reference_id = $1
        `, [id]);

        res.json({
            sale: {
                ...sale,
                total: parseFloat(sale.total),
                subtotal: parseFloat(sale.subtotal),
                discount: parseFloat(sale.discount)
            },
            items: items.map(item => ({
                ...item,
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
                discount: parseFloat(item.discount),
                total: parseFloat(item.total)
            })),
            transactions: transactions.map(t => ({
                ...t,
                amount: parseFloat(t.amount)
            }))
        });

    } catch (error) {
        console.error('Sale get error:', error);
        res.status(500).json({ error: 'Erro ao buscar venda' });
    }
});

// Cancel sale
router.post('/:id/cancel', [
    authenticate,
    param('id').isUUID(),
    body('reason').isString().isLength({ min: 5, max: 200 }).trim()
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const operatorId = req.user!.id;

        await transaction(async (client) => {
            // Check if sale exists and is not already cancelled
            const sale = await client.query(`
                SELECT id, is_cancelled FROM sales WHERE id = $1
            `, [id]);

            if (sale.rows.length === 0) {
                throw new Error('Venda não encontrada');
            }

            if (sale.rows[0].is_cancelled) {
                throw new Error('Venda já está cancelada');
            }

            // Cancel the sale
            await client.query(`
                UPDATE sales SET is_cancelled = true, cancellation_reason = $2
                WHERE id = $1
            `, [id, reason]);

            // Reverse stock movements
            const items = await client.query(`
                SELECT product_id, quantity FROM sale_items WHERE sale_id = $1
            `, [id]);

            for (const item of items.rows) {
                // Restore stock
                await client.query(`
                    UPDATE products SET stock = stock + $2 WHERE id = $1
                `, [item.product_id, parseFloat(item.quantity)]);

                // Add kardex entry for restoration
                await client.query(`
                    INSERT INTO kardex (
                        product_id, type, quantity, balance_after,
                        description, operator_id
                    ) SELECT
                        $1, 'ADJUSTMENT', $2, stock, $3, $4
                    FROM products WHERE id = $1
                `, [item.product_id, parseFloat(item.quantity), `Cancelamento venda: ${id}`, operatorId]);
            }

            // Reverse cash transactions
            await client.query(`
                DELETE FROM cash_transactions WHERE reference_id = $1
            `, [id]);

            res.json({ message: 'Venda cancelada com sucesso' });
        });

    } catch (error) {
        console.error('Sale cancel error:', error);
        res.status(500).json({ error: (error as any).message || 'Erro ao cancelar venda' });
    }
});

// Get sales analytics/summary
router.get('/analytics/summary', authenticate, async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        // Build date filter
        let dateFilter = '';
        const dateParams = [];
        let paramIndex = 1;

        if (startDate) {
            dateFilter += ` AND date >= $${paramIndex}`;
            dateParams.push(new Date(startDate as string));
            paramIndex++;
        }

        if (endDate) {
            dateFilter += ` AND date <= $${paramIndex}`;
            dateParams.push(new Date(endDate as string));
            paramIndex++;
        }

        // Get summary statistics
        const summaryQuery = `
            SELECT
                COUNT(*) as total_sales,
                SUM(total) as total_revenue,
                AVG(total) as average_sale,
                MIN(total) as min_sale,
                MAX(total) as max_sale,
                COUNT(CASE WHEN payment_method = 'CASH' THEN 1 END) as cash_sales,
                COUNT(CASE WHEN payment_method = 'PIX' THEN 1 END) as pix_sales,
                COUNT(CASE WHEN payment_method = 'CARD' THEN 1 END) as card_sales
            FROM sales
            WHERE is_cancelled = false ${dateFilter}
        `;

        const summary = await queryOne(summaryQuery, dateParams);

        // Get top selling products
        const topProducts = await query(`
            SELECT p.name, p.code, SUM(si.quantity) as total_quantity,
                   SUM(si.total) as total_revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE s.is_cancelled = false ${dateFilter}
            GROUP BY p.id, p.name, p.code
            ORDER BY total_quantity DESC
            LIMIT 10
        `, dateParams);

        res.json({
            summary: {
                totalSales: parseInt(summary.total_sales) || 0,
                totalRevenue: parseFloat(summary.total_revenue) || 0,
                averageSale: parseFloat(summary.average_sale) || 0,
                minSale: parseFloat(summary.min_sale) || 0,
                maxSale: parseFloat(summary.max_sale) || 0,
                paymentMethods: {
                    cash: parseInt(summary.cash_sales) || 0,
                    pix: parseInt(summary.pix_sales) || 0,
                    card: parseInt(summary.card_sales) || 0
                }
            },
            topProducts: topProducts.map(p => ({
                ...p,
                total_quantity: parseFloat(p.total_quantity),
                total_revenue: parseFloat(p.total_revenue)
            })),
            filters: { startDate, endDate }
        });

    } catch (error) {
        console.error('Sales analytics error:', error);
        res.status(500).json({ error: 'Erro ao buscar análises de vendas' });
    }
});

// Get today's sales summary
router.get('/daily/summary', authenticate, async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const summary = await queryOne(`
            SELECT
                COUNT(*) as total_sales,
                SUM(total) as total_revenue,
                SUM(CASE WHEN payment_method = 'CASH' THEN total ELSE 0 END) as cash_revenue,
                SUM(CASE WHEN payment_method = 'PIX' THEN total ELSE 0 END) as pix_revenue,
                SUM(CASE WHEN payment_method = 'CARD' THEN total ELSE 0 END) as card_revenue
            FROM sales
            WHERE is_cancelled = false
            AND date >= $1 AND date < $2
        `, [today, tomorrow]);

        const recentSales = await query(`
            SELECT id, total, payment_method, date,
                   (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
            FROM sales s
            WHERE is_cancelled = false
            AND date >= $1 AND date < $2
            ORDER BY date DESC
            LIMIT 20
        `, [today, tomorrow]);

        res.json({
            summary: {
                totalSales: parseInt(summary.total_sales) || 0,
                totalRevenue: parseFloat(summary.total_revenue) || 0,
                cashRevenue: parseFloat(summary.cash_revenue) || 0,
                pixRevenue: parseFloat(summary.pix_revenue) || 0,
                cardRevenue: parseFloat(summary.card_revenue) || 0
            },
            recentSales: recentSales.map(sale => ({
                ...sale,
                total: parseFloat(sale.total),
                item_count: parseInt(sale.item_count)
            })),
            date: today.toISOString().split('T')[0]
        });

    } catch (error) {
        console.error('Daily summary error:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo do dia' });
    }
});

export { router as saleRoutes };
