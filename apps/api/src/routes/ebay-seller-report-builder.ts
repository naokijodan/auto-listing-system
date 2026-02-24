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
router.get('/dashboard/performance', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'performance' })
);
router.get('/dashboard/alerts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'alerts' })
);

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'list' })
);
router.get('/sellers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'detail' })
);
router.post('/sellers', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'create' })
);
router.put('/sellers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'update' })
);
router.get('/sellers/search', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'search' })
);
router.get('/sellers/:id/reports', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'reports' })
);

// Reports (4)
router.get('/reports', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'list' })
);
router.get('/reports/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'detail' })
);
router.post('/reports', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'create' })
);
router.put('/reports/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'update' })
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
router.put('/templates/:id', (_req: Request, res: Response) =>
  res.json({ section: 'templates', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/usage', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'usage' })
);
router.get('/analytics/performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'performance' })
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

