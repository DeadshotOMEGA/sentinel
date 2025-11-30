import { Router } from 'express';
import { memberRoutes } from './members';
import { checkinRoutes } from './checkins';
import { visitorRoutes } from './visitors';
import { divisionRoutes } from './divisions';
import { badgeRoutes } from './badges';
import { authRoutes } from './auth';
import { eventRoutes } from './events';
import { devRoutes } from './dev';
import { checkDatabaseHealth } from '../db/connection';
import { redis } from '../db/redis';
import { logger } from '../utils/logger';

const router = Router();

// Health check endpoint - checks database and Redis connectivity
router.get('/health', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    checks.database = await checkDatabaseHealth();
  } catch (err) {
    logger.error('Health check: database failed', { error: err });
  }

  try {
    await redis.ping();
    checks.redis = true;
  } catch (err) {
    logger.error('Health check: redis failed', { error: err });
  }

  const healthy = checks.database && checks.redis;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Mount all routes
router.use('/members', memberRoutes);
router.use('/checkins', checkinRoutes);
router.use('/visitors', visitorRoutes);
router.use('/divisions', divisionRoutes);
router.use('/badges', badgeRoutes);
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/dev', devRoutes);

export { router as apiRoutes };
