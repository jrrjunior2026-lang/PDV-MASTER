import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env, isProduction } from '../config/env.js';

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove potential script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove potential event handlers
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    // Remove potential javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove potential data: URLs in common contexts
    .replace(/data:\s*text\/html/gi, '')
    // Trim whitespace
    .trim()
    // Limit length to prevent buffer overflow attacks
    .substring(0, 10000);
};

export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeInput(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Also sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// SQL Injection basic protection (complement to prepared statements)
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const dangerousPatterns = [
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /('|(\\x27)|(\\x2D\\x2D)|(\\\\)|(\\x3B)|(\\x2F\\x2A)|(\\x2A\\x2F))/i,
    /(';\s*DROP)/i,
    /(1=1|1=0|'OR'|OR 1=1)/i
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (req.body && checkValue(req.body)) {
    return res.status(400).json({
      error: 'Requisição contém caracteres suspeitos e foi bloqueada por segurança'
    });
  }

  if (req.query && checkValue(req.query)) {
    return res.status(400).json({
      error: 'Parâmetros de consulta contêm caracteres suspeitos e foram bloqueados por segurança'
    });
  }

  next();
};

// JWT Validation Middleware
export const validateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = req.headers['x-access-token'] || authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      error: 'Token de autenticação não fornecido'
    });
  }

  try {
    // Additional JWT validation logic would go here
    // For now, basic structure check
    if (Array.isArray(token)) {
      return res.status(401).json({
        error: 'Token JWT inválido'
      });
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({
        error: 'Token JWT inválido'
      });
    }

    // In real implementation, you'd verify the JWT signature here
    (req as any).user = { token }; // Simplified, would decode JWT properly

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token JWT inválido ou expirado'
    });
  }
};

// Rate limiting configurations
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    max = env.RATE_LIMIT_MAX_REQUESTS,
    message = 'Muitas tentativas, tente novamente mais tarde',
    skipSuccessfulRequests = env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    skipSuccessfulRequests,
    skip: (req, res) => {
      // Skip rate limiting for health checks
      return req.path === env.HEALTH_CHECK_ENDPOINT;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Allow 5 auth attempts per window
  message: 'Muitas tentativas de login, aguarde 15 minutos'
});

export const generalRateLimit = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS
});

// API rate limit for high-traffic endpoints
export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Limite de requisições excedido, aguarde 1 minuto'
});

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API responses
  hsts: isProduction() ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// IP whitelist middleware (for production hardening)
export const ipWhitelist = (req: Request, res: Response, next: NextFunction) => {
  if (!env.IP_WHITELIST || !isProduction()) {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress || '';
  const allowedIPs = env.IP_WHITELIST.split(',').map(ip => ip.trim());

  if (!allowedIPs.includes(clientIP)) {
    console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
    return res.status(403).json({
      error: 'Acesso negado: IP não autorizado'
    });
  }

  next();
};

// Request logging with security context
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    // Log suspicious activities
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('Security event:', logData);
    } else if (duration > 5000) { // Slow requests might indicate DoS
      console.warn('Slow request detected:', logData);
    }
  });

  next();
};

// File upload security (simplified - add multer types when needed)
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  // This is a placeholder - implement when multer is added to dependencies
  // For now, just pass through
  next();
};

// Export security middleware bundle
export const securityMiddleware = {
  inputSanitization: sanitizeBody,
  sqlInjection: sqlInjectionProtection,
  jwtValidation: validateJWT,
  rateLimiters: {
    auth: authRateLimit,
    general: generalRateLimit,
    api: apiRateLimit
  },
  headers: securityHeaders,
  ipWhitelist,
  logging: securityLogger,
  fileUpload: validateFileUpload
};

export default securityMiddleware;
