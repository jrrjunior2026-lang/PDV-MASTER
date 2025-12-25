import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

// Load environment variables and validate
import { env, getSecurityStatus } from './config/env.js';
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
import adminRoutes from './routes/admin.js';
import { auditMiddleware, errorHandler, notFoundHandler } from './middleware/index.js';
import { connectDB } from './config/database.js';

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
    origin: true, // Allow all origins temporarily to fix the issue
    credentials: true // Force true for cookies/auth headers
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
app.use('/api/uploads', express.static('uploads')); // Alternative path for API

// Root route
app.get('/', (req, res) => {
    res.json({
        message: "PDV Master API is running",
        health: "/health",
        api: "/api",
        status: "operational"
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime()
    });
});

// Security status endpoint - for debugging/security audits
app.get('/security-status', (req, res) => {
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
app.get('/api', (req, res) => {
    res.json({
        name: "PDV Master Enterprise API",
        version: "1.0.0",
        description: "Sistema de PDV completo com gestão de vendas, estoque e finanças",
        status: "operational",
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        routes: {
            auth: { path: '/api/auth', description: 'Autenticação e autorização' },
            products: { path: '/api/products', description: 'Gestão de produtos e estoque' },
            customers: { path: '/api/customers', description: 'Gestão de clientes' },
            sales: { path: '/api/sales', description: 'Gestão de vendas e transações' },
            finance: { path: '/api/finance', description: 'Relatórios financeiros' },
            register: { path: '/api/register', description: 'Controle de caixas PDV' },
            sync: { path: '/api/sync', description: 'Sincronização offline/online' },
            reports: { path: '/api/reports', description: 'Relatórios de negócio' },
            settings: { path: '/api/settings', description: 'Configurações do sistema' }
        }
    });
});

// === API ROUTER SETUP ===
const apiRouter = express.Router();

// Audit middleware for all API routes
apiRouter.use(auditMiddleware);

// Register routes on the API router (without /api prefix)
apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/sales', saleRoutes);
apiRouter.use('/finance', financeRoutes);
apiRouter.use('/settings', settingRoutes);
apiRouter.use('/register', registerRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/admin', adminRoutes);

// Mount the API router at both /api (for local) and / (for Firebase)
// This ensures that requests to .../api/settings work in both environments
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Recebido SIGINT. Encerrando servidor...');
    await connectDB().end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Recebido SIGTERM. Encerrando servidor...');
    await connectDB().end();
    process.exit(0);
});

// Export the express app for Firebase
export { app };

// Start local server if not running in Firebase
import { createServer } from 'http';
import { initializeSocketService } from './services/socketService.js';

if (process.env.NODE_ENV !== 'test') {
    const httpServer = createServer(app);
    initializeSocketService(httpServer);

    httpServer.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
}
