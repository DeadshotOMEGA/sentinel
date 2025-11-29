import { z } from 'zod';
import { logger } from '../utils/logger';

const envSchema = z.object({
  // Database - all required
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('sentinel'),
  DB_USER: z.string(),
  DB_PASSWORD: z.string().min(8, 'Database password must be at least 8 characters'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Auth - required
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  KIOSK_API_KEY: z.string().min(32, 'KIOSK_API_KEY must be at least 32 characters'),

  // Session
  SESSION_DURATION: z.coerce.number().default(86400),

  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Display API key (optional - added by tv-display integration)
  DISPLAY_API_KEY: z.string().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error('❌ Invalid environment configuration:');
    logger.error(result.error.format());
    logger.error('\n💡 See backend/.env.example for required variables');
    process.exit(1);
  }

  // Warn about development defaults in production
  if (result.data.NODE_ENV === 'production') {
    if (!process.env.REDIS_PASSWORD) {
      logger.warn('⚠️ REDIS_PASSWORD not set - Redis should be password protected in production');
    }

    if (result.data.DB_PASSWORD.length < 16) {
      logger.warn('⚠️ DB_PASSWORD is weak - use at least 16 characters in production');
    }

    if (result.data.JWT_SECRET.length < 64) {
      logger.warn('⚠️ JWT_SECRET is weak - use at least 64 characters in production');
    }
  }

  return result.data;
}

export type Env = z.infer<typeof envSchema>;
