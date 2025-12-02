import Redis from 'ioredis';
import { logger } from '../utils/logger';

function getRedisConfig(): { host: string; port: number; password: string | undefined } {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;
  const password = process.env.REDIS_PASSWORD || undefined;

  if (!host) {
    throw new Error('REDIS_HOST environment variable is required');
  }
  if (!port) {
    throw new Error('REDIS_PORT environment variable is required');
  }

  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber)) {
    throw new Error('REDIS_PORT must be a valid number');
  }

  return { host, port: portNumber, password };
}

const config = getRedisConfig();

const redis = new Redis({
  host: config.host,
  port: config.port,
  password: config.password,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

export { redis };
