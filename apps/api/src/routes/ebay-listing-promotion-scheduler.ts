import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'overview' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/active', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'active' })
);
router.get('/dashboard/upcoming', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'upcoming' })
);
router.get('/dashboard/completed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'completed' })
);

// Promotions (6)
router.get('/promotions', (_req: Request, res: Response) =>
  res.json({ section: 'promotions', action: 'list' })
);
router.get('/promotions/:id', (_req: Request, res: Response) =>
  res.json({ section: 'promotions', action: 'detail' })
);
router.post('/promotions', (_req: Request, res: Response) =>
  res.json({ section: 'promotions', action: 'create' })
);
router.put('/promotions/:id', (_req: Request, res: Response) =>
  res.json({ section: 'promotions', action: 'update' })
);
router.post('/promotions/:id/activate', (_req: Request, res: Response) =>
  res.json({ section: 'promotions', action: 'activate' })
);
router.post('/promotions/:id/deactivate', (_req: Request, res: Response) =>
  res.json({ section: 'promotions', action: 'deactivate' })
);

// Schedules (4)
router.get('/schedules', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'list' })
);
router.get('/schedules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'detail' })
);
router.post('/schedules', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'create' })
);
router.put('/schedules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'update' })
);

// Templates (4)
router.get('/templates', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'list' })
);
router.get('/templates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'detail' })
);
router.post('/templates', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'create' })
);
router.post('/templates/:id/apply', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'apply' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/roi', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'roi' })
);
router.get('/analytics/traffic-boost', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'traffic-boost' })
);

// Settings (2)
router.get('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'get' })
);
router.put('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'update' })
);

// Utilities (4)
router.get('/health', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'health' })
);
router.post('/export', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'export' })
);
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

