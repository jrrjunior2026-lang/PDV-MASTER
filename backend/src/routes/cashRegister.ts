import express from 'express';

const router = express.Router();

// Stub implementations for now - focus on getting system running first
router.get('/', (req, res) => {
    res.json({ registers: [], message: 'Cash register routes - stubs for now' });
});

router.post('/open', (req, res) => {
    res.json({ message: 'Open register stub' });
});

router.post('/:id/close', (req, res) => {
    res.json({ message: 'Close register stub' });
});

export { router as registerRoutes };
