import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'dashboard' })
);
router.get('/dashboard/summary', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'summary' })
);
router.get('/dashboard/fresh', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'fresh' })
);
router.get('/dashboard/stale', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'stale' })
);
router.get('/dashboard/refresh-queue', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'refresh-queue' })
);

// Listings (6)
router.get('/listings/list', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'list' })
);
router.get('/listings/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'detail' })
);
router.post('/listings/refresh/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'refresh' })
);
router.post('/listings/bulk-refresh', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'bulk-refresh' })
);
router.post('/listings/schedule-refresh', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'schedule-refresh' })
);
router.get('/listings/history/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'history' })
);

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.post('/rules/create', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.put('/rules/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Schedules (4)
router.get('/schedules/list', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'list' })
);
router.get('/schedules/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'detail' })
);
router.post('/schedules/create', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'create' })
);
router.put('/schedules/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'schedules', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/freshness-score', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'freshness-score' })
);
router.get('/analytics/refresh-impact', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'refresh-impact' })
);

// Settings (2)
router.get('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'get' })
);
router.put('/settings', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'put' })
);

// Utilities (4)
router.get('/health', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'health' })
);
router.get('/export', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'export' })
);
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

