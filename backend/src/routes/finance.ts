import express, { Request, Response } from 'express';
import { QueryResult } from 'pg';
import { query, queryOne, transaction } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/index.js';
import { body, param, query as queryParam } from 'express-validator';
import { handleValidationErrors } from '../middleware/index.js';

const router = express.Router();

// Get financial records with filtering
router.get('/', [
    authenticate,
    queryParam('page').optional().isInt({ min: 1 }).toInt(),
    queryParam('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    queryParam('type').optional().isIn(['INCOME', 'EXPENSE']),
    queryParam('startDate').optional().isISO8601(),
    queryParam('endDate').optional().isISO8601(),
    queryParam('category').optional().isString()
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const { type, startDate, endDate, category } = req.query;

        let queryText = `
            SELECT id, type, description, amount, category, date, status,
                   due_date, notes, created_at, updated_at
            FROM financial_records
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (type) {
            queryText += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (startDate) {
            queryText += ` AND date >= $${paramIndex}`;
            params.push(new Date(startDate as string));
            paramIndex++;
        }

        if (endDate) {
            queryText += ` AND date <= $${paramIndex}`;
            params.push(new Date(endDate as string));
            paramIndex++;
        }

        if (category) {
            queryText += ` AND category ILIKE $${paramIndex}`;
            params.push(`%${category}%`);
            paramIndex++;
        }

        queryText += ` ORDER BY date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const records = await query(queryText, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM financial_records WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;

        if (type) {
            countQuery += ` AND type = $${countParamIndex}`;
            countParams.push(type);
            countParamIndex++;
        }

        if (startDate) {
            countQuery += ` AND date >= $${countParamIndex}`;
            countParams.push(new Date(startDate as string));
            countParamIndex++;
        }

        if (endDate) {
            countQuery += ` AND date <= $${countParamIndex}`;
            countParams.push(new Date(endDate as string));
            countParamIndex++;
        }

        if (category) {
            countQuery += ` AND category ILIKE $${countParamIndex}`;
            countParams.push(`%${category}%`);
            countParamIndex++;
        }

        const totalResult = await queryOne(countQuery, countParams);
        const total = parseInt(totalResult.total);
        const totalPages = Math.ceil(total / limit);

        res.json({
            records: records.map(r => ({
                ...r,
                amount: parseFloat(r.amount)
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: { type, startDate, endDate, category }
        });

    } catch (error) {
        console.error('Finance list error:', error);
        res.status(500).json({ error: 'Erro ao buscar registros financeiros' });
    }
});

// Create financial record
router.post('/', [
    authenticate,
    requireAdmin,
    body('type').isIn(['INCOME', 'EXPENSE']),
    body('description').isLength({ min: 1, max: 200 }).trim(),
    body('amount').isFloat({ min: 0 }),
    body('category').isLength({ min: 1, max: 50 }).trim(),
    body('date').optional().isISO8601(),
    body('dueDate').optional().isISO8601(),
    body('status').optional().isIn(['PAID', 'PENDING', 'OVERDUE']),
    body('notes').optional().isString().isLength({ max: 500 })
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const {
            type, description, amount, category,
            date = new Date(), dueDate, status = 'PENDING', notes
        } = req.body;

        const userId = req.user!.id;

        const result = (await query(`
            INSERT INTO financial_records (
                type, description, amount, category, date, due_date, status, notes, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
            RETURNING *
        `, [type, description, amount, category, new Date(date), dueDate ? new Date(dueDate) : null, status, notes || null, userId])) as unknown as QueryResult<any>;

        res.status(201).json({
            record: {
                ...result.rows[0],
                amount: parseFloat(result.rows[0].amount)
            },
            message: 'Registro financeiro criado com sucesso'
        });

    } catch (error) {
        console.error('Finance create error:', error);
        res.status(500).json({ error: 'Erro ao criar registro financeiro' });
    }
});

// Update financial record
router.put('/:id', [
    authenticate,
    requireAdmin,
    param('id').isUUID(),
    body('type').optional().isIn(['INCOME', 'EXPENSE']),
    body('description').optional().isLength({ min: 1, max: 200 }).trim(),
    body('amount').optional().isFloat({ min: 0 }),
    body('category').optional().isLength({ min: 1, max: 50 }).trim(),
    body('date').optional().isISO8601(),
    body('dueDate').optional().isISO8601(),
    body('status').optional().isIn(['PAID', 'PENDING', 'OVERDUE']),
    body('notes').optional().isString().isLength({ max: 500 })
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        // Check if record exists
        const existing = await queryOne('SELECT id FROM financial_records WHERE id = $1', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Registro financeiro não encontrado' });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;

        const fields = {
            type: req.body.type,
            description: req.body.description,
            amount: req.body.amount,
            category: req.body.category,
            date: req.body.date ? new Date(req.body.date) : undefined,
            due_date: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
            status: req.body.status,
            notes: req.body.notes
        };

        Object.entries(fields).forEach(([field, value]) => {
            if (value !== undefined) {
                updates.push(`${field} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }

        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${paramIndex}`);
        params.push(userId);
        paramIndex++;

        params.push(id);

        await query(`
            UPDATE financial_records SET ${updates.join(', ')} WHERE id = $${paramIndex}
        `, params);

        // Get updated record
        const updated = await queryOne(`
            SELECT * FROM financial_records WHERE id = $1
        `, [id]);

        res.json({
            record: {
                ...updated,
                amount: parseFloat(updated.amount)
            },
            message: 'Registro financeiro atualizado com sucesso'
        });

    } catch (error) {
        console.error('Finance update error:', error);
        res.status(500).json({ error: 'Erro ao atualizar registro financeiro' });
    }
});

// Delete financial record
router.delete('/:id', [
    authenticate,
    requireAdmin,
    param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = (await query('DELETE FROM financial_records WHERE id = $1', [id])) as unknown as QueryResult<any>;

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registro financeiro não encontrado' });
        }

        res.json({ message: 'Registro financeiro excluído com sucesso' });

    } catch (error) {
        console.error('Finance delete error:', error);
        res.status(500).json({ error: 'Erro ao excluir registro financeiro' });
    }
});

// Get financial summary/analytics
router.get('/summary/dashboard', authenticate, async (req: Request, res: Response) => {
    try {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        // Get monthly financial summary
        const monthlySummary = await queryOne(`
            SELECT
                COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as total_expense,
                COUNT(CASE WHEN type = 'INCOME' THEN 1 END) as income_count,
                COUNT(CASE WHEN type = 'EXPENSE' THEN 1 END) as expense_count
            FROM financial_records
            WHERE date >= $1 AND date < $2
        `, [currentMonth, nextMonth]);

        // Get pending payments
        const pendingPayments = await query(`
            SELECT id, description, amount, due_date, (due_date - CURRENT_DATE)::integer as days_remaining
            FROM financial_records
            WHERE status = 'PENDING' AND due_date IS NOT NULL
            AND due_date >= CURRENT_DATE
            ORDER BY due_date ASC
            LIMIT 5
        `);

        // Get overdue payments
        const overduePayments = await query(`
            SELECT id, description, amount, due_date, (CURRENT_DATE - due_date)::integer as days_overdue
            FROM financial_records
            WHERE status = 'PENDING' AND due_date IS NOT NULL
            AND due_date < CURRENT_DATE
            ORDER BY due_date ASC
        `);

        res.json({
            monthlySummary: {
                totalIncome: parseFloat(monthlySummary.total_income),
                totalExpense: parseFloat(monthlySummary.total_expense),
                netProfit: parseFloat(monthlySummary.total_income) - parseFloat(monthlySummary.total_expense),
                incomeCount: parseInt(monthlySummary.income_count),
                expenseCount: parseInt(monthlySummary.expense_count)
            },
            pendingPayments: pendingPayments.map(p => ({
                ...p,
                amount: parseFloat(p.amount)
            })),
            overduePayments: overduePayments.map(p => ({
                ...p,
                amount: parseFloat(p.amount)
            })),
            period: {
                startDate: currentMonth.toISOString().split('T')[0],
                endDate: nextMonth.toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Finance dashboard error:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo financeiro' });
    }
});

export { router as financeRoutes };
