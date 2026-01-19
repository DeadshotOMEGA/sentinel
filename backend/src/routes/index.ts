import { Router } from 'express';
import { memberRoutes } from './members';
import { checkinRoutes } from './checkins';
import { visitorRoutes } from './visitors';
import { divisionRoutes } from './divisions';
import { badgeRoutes } from './badges';
import { authRoutes } from './auth';
import { eventRoutes } from './events';
import { devRoutes } from './dev';
import { devToolsRoutes } from './dev-tools';
import { alertRoutes } from './alerts';
import { securityAlertRoutes } from './security-alerts';
import { ddsRoutes } from './dds';
import { lockupRoutes } from './lockup';
import { reportSettingsRoutes } from './report-settings';
import { trainingYearRoutes } from './training-years';
import { bmqCoursesRoutes } from './bmq-courses';
import { reportRoutes } from './reports';
import { tagRoutes } from './tags';
import { settingsRoutes } from './settings';
import { listRoutes } from './lists';
import { enumRoutes } from './enums';
import adminUserRoutes from './admin-users';
import auditLogRoutes from './audit-logs';
import { checkDatabaseHealth } from '../db/prisma';
import { redis } from '../db/redis';
import { logger } from '../utils/logger';
import { getMetrics } from '../utils/metrics';

const router = Router();

// Liveness probe - is the process running?
// Used by Kubernetes to know if the container should be restarted
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe - can the service accept traffic?
// Used by Kubernetes to know if traffic should be routed to this pod
router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    checks.database = await checkDatabaseHealth();
  } catch (err) {
    logger.warn('Readiness check: database not ready', { error: err });
  }

  try {
    await redis.ping();
    checks.redis = true;
  } catch (err) {
    logger.warn('Readiness check: redis not ready', { error: err });
  }

  const ready = checks.database && checks.redis;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint - detailed health status
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

// Metrics endpoint - request statistics
router.get('/metrics', (req, res) => {
  const metrics = getMetrics();
  res.status(200).json(metrics);
});

// Mount all routes
router.use('/members', memberRoutes);
router.use('/checkins', checkinRoutes);
router.use('/visitors', visitorRoutes);
router.use('/divisions', divisionRoutes);
router.use('/badges', badgeRoutes);
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/alerts', alertRoutes);
router.use('/security-alerts', securityAlertRoutes);
router.use('/dds', ddsRoutes);
router.use('/lockup', lockupRoutes);
router.use('/report-settings', reportSettingsRoutes);
router.use('/training-years', trainingYearRoutes);
router.use('/bmq-courses', bmqCoursesRoutes);
router.use('/reports', reportRoutes);
router.use('/tags', tagRoutes);
router.use('/settings', settingsRoutes);
router.use('/lists', listRoutes);
router.use('/enums', enumRoutes);
router.use('/admin-users', adminUserRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/dev', devRoutes);
router.use('/dev-tools', devToolsRoutes);

export { router as apiRoutes };
