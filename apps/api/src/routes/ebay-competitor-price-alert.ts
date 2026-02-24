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
router.get('/dashboard/active-alerts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'active-alerts' })
);
router.get('/dashboard/price-changes', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'price-changes' })
);
router.get('/dashboard/opportunities', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'opportunities' })
);

// Alerts (6)
router.get('/alerts', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'list' })
);
router.get('/alerts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'detail' })
);
router.post('/alerts', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'create' })
);
router.put('/alerts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'update' })
);
router.delete('/alerts/:id', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'delete' })
);
router.post('/alerts/:id/trigger', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'trigger' })
);

// Competitors (4)
router.get('/competitors', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'list' })
);
router.get('/competitors/:id', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'detail' })
);
router.post('/competitors/:id/track', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'track' })
);
router.post('/competitors/:id/untrack', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'untrack' })
);

// Rules (4)
router.get('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.post('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.put('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/price-trends', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'price-trends' })
);
router.get('/analytics/alert-effectiveness', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'alert-effectiveness' })
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

