import { Router } from 'express';

const router = Router();

// Note: Event roles management has been migrated to /api/lists/event_role
// See lists.ts for the new endpoints

export { router as settingsRoutes };
