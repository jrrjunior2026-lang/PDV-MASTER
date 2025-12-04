import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

// Load environment variables and validate
import { env } from './config/env.js';
import securityMiddleware from './middleware/security.js';

// Import routes and middleware
import { authRoutes } from './routes/auth.js';
import { productRoutes } from './routes/products.js';
import { customerRoutes } from './routes/customers.js';
import { saleRoutes } from './routes/sales.js';
import { financeRoutes } from './routes/finance.js';
import { settingRoutes } from './routes/settings.js';
import { registerRoutes } from './routes/cashRegister.js';
import { syncRoutes } from './routes/sync.js';
import { reportRoutes } from './routes/reports.js';
import { auditMiddleware, errorHandler, notFoundHandler } from './middleware/index.js';
import { connectDB, initDB } from './config/database.js';

const app = express();
const PORT = env.PORT;

// === SEGURANÇA ENHANCED ===

// Security headers (Helmet)
app.use(securityMiddleware.headers);

// IP Whitelist (production only)
app.use(securityMiddleware.ipWhitelist);

// Security request logging
app.use(securityMiddleware.logging);

// CORS with security
app.use(cors({
    origin: env.CORS_CREDENTIALS ? env.CORS_ORIGIN || 'http://localhost:3000' : false,
    credentials: env.CORS_CREDENTIALS
}));

// Input sanitization - ALWAYS FIRST before any parsing
app.use(securityMiddleware.inputSanitization);

// SQL Injection protection
app.use(securityMiddleware.sqlInjection);

// Rate limiting - apply different limits per route
app.use('/api/auth', securityMiddleware.rateLimiters.auth); // Strict auth limits
app.use('/api', securityMiddleware.rateLimiters.general);   // General API limits

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(':remote-addr :method :url :status :res[content-length] - :response-time ms'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
    });
});

// Security status endpoint - for debugging/security audits
app.get('/security-status', (req: Request, res: Response) => {
    const { getSecurityStatus } = require('./config/env.js');
    const security = getSecurityStatus();

    res.json({
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        security,
        server: {
            cors_enabled: env.CORS_CREDENTIALS,
            rate_limiting: true,
            helmet_headers: true,
            input_sanitization: true,
            sql_injection_protection: true,
            ip_whitelist: !!env.IP_WHITELIST && env.NODE_ENV === 'production'
        }
    });
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
    res.json({
        name: "PDV Master Enterprise API",
        version: "1.0.0",
        description: "Sistema de PDV completo com gestão de vendas, estoque e finanças",
        status: "operational",
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        routes: {
            auth: {
                path: '/api/auth',
                description: 'Autenticação e autorização',
                endpoints: ['POST /login', 'POST /register', 'GET /profile']
            },
            products: {
                path: '/api/products',
                description: 'Gestão de produtos e estoque',
                endpoints: ['GET /', 'POST /', 'PUT /:id', 'DELETE /:id']
            },
            customers: {
                path: '/api/customers',
                description: 'Gestão de clientes',
                endpoints: ['GET /', 'POST /', 'PUT /:id', 'DELETE /:id']
            },
            sales: {
                path: '/api/sales',
                description: 'Gestão de vendas e transações',
                endpoints: ['GET /', 'POST /', 'PUT /:id', 'GET /:id/items']
            },
            finance: {
                path: '/api/finance',
                description: 'Relatórios financeiros e controle financeiro',
                endpoints: ['GET /', 'POST /', 'GET /summary/dashboard']
            },
            register: {
                path: '/api/register',
                description: 'Controle de caixas PDV',
                endpoints: ['POST /open', 'POST /:id/close', 'GET /current']
            },
            sync: {
                path: '/api/sync',
                description: 'Sincronização offline/online',
                endpoints: ['GET /', 'POST /push']
            },
            reports: {
                path: '/api/reports',
                description: 'Relatórios de negócio',
                endpoints: ['GET /', 'GET /sales']
            },
            settings: {
                path: '/api/settings',
                description: 'Configurações do sistema',
                endpoints: ['GET /', 'PUT /:key']
            }
        },
        system: {
            frontend: "http://localhost:3000",
            backend: `http://localhost:${PORT}`,
            health: `http://localhost:${PORT}/health`,
            database: "PostgreSQL (Docker)"
        }
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportRoutes);

// Audit middleware for API routes
app.use('/api', auditMiddleware);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Recebido SIGINT. Encerrando servidor...');

    // Close database connections
    await connectDB().end();

    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recebido SIGTERM. Encerrando servidor...');

    // Close database connections
    await connectDB().end();

    process.exit(0);
});

// Server startup
const startServer = async () => {
    try {
        // Try to initialize database (continue even if fails)
        try {
            await initDB();
            console.log('✅ Database connected successfully');
        } catch (dbError: any) {
            console.warn('⚠️  Database connection failed, running without DB:', dbError.message);
            console.warn('💡 To fix: Setup PostgreSQL or run: cd backend && npm run migrate');
        }

        // Start server regardless of DB status
        app.listen(PORT, () => {
            console.log(`
🚀 PDV Master Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server: http://localhost:${PORT}
📡 API: http://localhost:${PORT}/api
🏥 Health: http://localhost:${PORT}/health
📊 Environment: ${process.env.NODE_ENV || 'development'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready to accept connections!
            `);
        });
    } catch (error) {
        console.error('❌ Falha crítica ao iniciar servidor:', (error as any).message || error);
        process.exit(1);
    }
};

startServer();
