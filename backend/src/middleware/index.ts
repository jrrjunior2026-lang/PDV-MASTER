import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

// Extend Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                name: string;
                email: string;
                role: 'ADMIN' | 'CASHIER';
            };
        }
    }
}

// JWT authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Token de autenticação não fornecido'
        });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key') as any;

        req.user = {
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Token inválido ou expirado'
        });
    }
};

// Require admin role middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Autenticação necessária' });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
            error: 'Acesso negado. Função de administrador necessária.'
        });
    }

    next();
};

// Audit logging middleware
export const auditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Log will be created after request completes
    const originalSend = res.json;
    const startTime = Date.now();

    // Override res.json to log after response
    res.json = function (data) {
        // Log the request (this happens after response)
        const duration = Date.now() - startTime;
        const clientIP = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || '';

        // Log action for authenticated users
        if (req.user) {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - User: ${req.user.name} (${req.user.role}) - IP: ${clientIP} - ${res.statusCode} - ${duration}ms`);
        } else {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Anonymous - IP: ${clientIP} - ${res.statusCode} - ${duration}ms`);
        }

        // Call original function
        return originalSend.call(this, data);
    };

    next();
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    next();
};

// Global error handler
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', err);

    // Database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json({
            error: 'Erro de conexão com o banco de dados',
            message: 'Serviço temporariamente indisponível'
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Token inválido'
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: err.errors
        });
    }

    // Default error
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro inesperado'
    });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        message: `A rota ${req.method} ${req.path} não existe`
    });
};

// Request logging middleware (simple version)
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });

    next();
};

// CORS headers middleware (additional cors setup)
export const corsOptions = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};
