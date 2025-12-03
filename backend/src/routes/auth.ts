import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { authenticate } from '../middleware/index.js';
import { queryOne, transaction } from '../config/database.js';
import { handleValidationErrors } from '../middleware/index.js';

const router = express.Router();

// Login route
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 4 })
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Get user from database
        const user = await queryOne(
            'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
            [email]
        );

        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        // Generate JWT token
        const token = jwt.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET || 'super-secret-key', {
            expiresIn: '24h'
        });

        // Return user data (without sensitive info)
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno ao fazer login' });
    }
});

// Get current user profile
router.get('/profile', authenticate, async (req: Request, res: Response) => {
    try {
        const user = await queryOne(
            'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
            [req.user!.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

// Change password
router.post('/change-password', [
    authenticate,
    body('currentPassword').isLength({ min: 4 }),
    body('newPassword').isLength({ min: 6 }),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Senhas não conferem');
        }
        return true;
    })
], handleValidationErrors, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get current user password
        const user = await queryOne(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user!.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verify current password
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidCurrentPassword) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await queryOne(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, req.user!.id]
        );

        res.json({ message: 'Senha alterada com sucesso' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// Logout (for blacklisting tokens if needed - simple version just returns ok)
router.post('/logout', authenticate, (req: Request, res: Response) => {
    res.json({ message: 'Logout realizado com sucesso' });
});

// Validate token
router.get('/validate', authenticate, (req: Request, res: Response) => {
    res.json({
        valid: true,
        user: req.user
    });
});

export { router as authRoutes };
