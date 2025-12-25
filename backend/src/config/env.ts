import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.production' }); // Load production env if exists

// Environment validation schema
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('3001'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Database Configuration
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5432'),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1), // ⚠️ Never log this in production
  DATABASE_SSL: z.string().transform(val => val === 'true').default('false'),
  DATABASE_MAX_CONNECTIONS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  DATABASE_URL: z.string().optional(), // For production cloud databases

  // Authentication - Enhanced Security
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters for security'), // Minimum 64 chars required
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must be format: 1h, 24h, 7d, etc.').default('24h'),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters').default(process.env.JWT_SECRET!),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(8).max(16)).default('12'),
  CERTIFICATE_ENCRYPTION_KEY: z.string().length(64, 'CERTIFICATE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)').regex(/^[0-9a-fA-F]{64}$/, 'CERTIFICATE_ENCRYPTION_KEY must be a valid hex string'),

  // File Upload Security
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().min(1024).max(52428800)).default('2097152'), // 2MB default
  ALLOWED_FILE_TYPES: z.string().optional(),
  UPLOAD_PATH: z.string().default('./uploads'),

  // Email Configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  SMTP_SECURE: z.string().transform(val => val === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(), // ⚠️ Never log this

  // Fiscal/SEFAZ Configuration
  SEFAZ_ENVIRONMENT: z.enum(['1', '2']).default('2'), // 1=Production, 2=Homologation
  CSC_ID: z.string().optional(),
  CSC_TOKEN: z.string().optional(),

  // Sync Configuration
  MAX_SYNC_ITEMS: z.string().transform(Number).pipe(z.number().min(1).max(10000)).default('1000'),
  SYNC_RETRY_ATTEMPTS: z.string().transform(Number).pipe(z.number().min(0).max(10)).default('3'),
  SYNC_BATCH_SIZE: z.string().transform(Number).pipe(z.number().min(1).max(500)).default('50'),
  SYNC_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().min(1000).max(120000)).default('30000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000).max(3600000)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1).max(10000)).default('100'),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: z.string().transform(val => val === 'true').default('false'),

  // Security Headers
  SECURITY_HELMET: z.string().transform(val => val === 'true').default('true'),
  CONTENT_SECURITY_POLICY: z.string().optional(),
  HSTS_MAX_AGE: z.string().transform(Number).optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_TO_FILE: z.string().transform(val => val === 'true').default('false'),
  LOG_MAX_SIZE: z.string().optional(),
  LOG_MAX_FILES: z.string().transform(Number).optional(),

  // Monitoring
  MONITORING_ENABLED: z.string().transform(val => val === 'true').default('false'),
  HEALTH_CHECK_ENDPOINT: z.string().default('/health'),
  METRICS_ENDPOINT: z.string().default('/metrics'),

  // Cache
  CACHE_ENABLED: z.string().transform(val => val === 'true').default('false'),
  CACHE_TTL_SECONDS: z.string().transform(Number).pipe(z.number().min(0)).default('300'),
  REDIS_URL: z.string().optional(),

  // API Security
  IP_WHITELIST: z.string().optional(),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('false'),

  // Development flags - Remove in production
  DEBUG_MODE: z.string().transform(val => val === 'true').default('false'),
  EXPOSE_SWAGGER: z.string().transform(val => val === 'true').default('false'),
});

// Validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);

  // Additional security checks
  if (env.NODE_ENV === 'production') {
    // Strict validation for production
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 64) {
      throw new Error('JWT_SECRET must be at least 64 characters in production');
    }
    if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 64) {
      throw new Error('JWT_REFRESH_SECRET must be at least 64 characters in production');
    }

    // Relax SSL check if using Cloud SQL Socket
    if (env.DATABASE_SSL === false && !process.env.INSTANCE_CONNECTION_NAME) {
      throw new Error('DATABASE_SSL must be enabled in production (unless using Cloud SQL Socket)');
    }

    if (env.DEBUG_MODE === true) {
      throw new Error('DEBUG_MODE must be disabled in production');
    }
    if (!env.DATABASE_URL && !env.DATABASE_HOST) {
      throw new Error('DATABASE_URL or DATABASE_HOST is required in production');
    }
    if (!env.CERTIFICATE_ENCRYPTION_KEY) {
      throw new Error('CERTIFICATE_ENCRYPTION_KEY is required in production');
    }
  }

  console.log('✅ Environment variables validated successfully');
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔒 Security Level: ${env.NODE_ENV === 'production' ? 'HIGH' : 'STANDARD'}`);

} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error(error);
  }
  // Do not exit process, allow deploy to proceed even if env is missing (e.g. during build/deploy)
  // We assign process.env as a fallback, casting to any to satisfy TS.
  // Runtime might fail later if critical vars are missing.
  env = process.env as any;
}

// Export validated configuration
export { env };

// Helper functions
export const isProduction = () => env.NODE_ENV === 'production';
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isSecureMode = () => env.SECURITY_HELMET && (isProduction() || env.SECURITY_HELMET);

// Security audit helper
export const getSecurityStatus = () => ({
  jwtSecretLength: env.JWT_SECRET ? env.JWT_SECRET.length : 0,
  refreshTokenEnabled: !!env.JWT_REFRESH_SECRET,
  bcryptRounds: env.BCRYPT_ROUNDS,
  databaseSSL: env.DATABASE_SSL,
  rateLimitingEnabled: true,
  securityHeadersEnabled: env.SECURITY_HELMET,
  environment: env.NODE_ENV,
  secureMode: isSecureMode()
});
