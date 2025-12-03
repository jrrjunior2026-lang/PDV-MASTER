import express, { Request, Response } from 'express';

const router = express.Router();

// Stub reports route
router.get('/', (req: Request, res: Response) => {
    res.json({
        reports: [],
        message: 'Reports stub - not implemented yet',
        available: [
            'sales-report',
            'inventory-report',
            'finance-report',
            'customer-report'
        ]
    });
});

router.get('/sales', (req: Request, res: Response) => {
    res.json({ report: 'sales', data: [], message: 'Sales report stub' });
});

export const reportRoutes = router;
