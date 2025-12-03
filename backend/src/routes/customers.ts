import express from 'express';

const router = express.Router();

// Basic customer routes - stub implementation
router.get('/', (req, res) => {
    res.json({ customers: [], message: 'Customers stub - not implemented yet' });
});

export { router as customerRoutes };
