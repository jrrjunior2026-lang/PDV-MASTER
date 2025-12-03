import express from 'express';

const router = express.Router();

// Product routes - simplified for stability
router.get('/', (req, res) => {
    res.json({ products: [], message: 'Products API working' });
});

router.post('/', (req, res) => {
    res.json({ message: 'Create product stub' });
});

router.put('/:id', (req, res) => {
    res.json({ message: 'Update product stub' });
});

router.delete('/:id', (req, res) => {
    res.json({ message: 'Delete product stub' });
});

export { router as productRoutes };
