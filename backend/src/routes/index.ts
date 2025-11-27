import { Router } from 'express';
import { memberRoutes } from './members';
import { checkinRoutes } from './checkins';
import { visitorRoutes } from './visitors';
import { divisionRoutes } from './divisions';
import { badgeRoutes } from './badges';
import { authRoutes } from './auth';
import { eventRoutes } from './events';
import { devRoutes } from './dev';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
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
