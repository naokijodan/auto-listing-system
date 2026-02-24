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
router.get('/dashboard/metrics', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'metrics' })
);
router.get('/dashboard/recent', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'recent' })
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
router.delete('/sellers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'delete' })
);
router.post('/sellers/:id/process', (_req: Request, res: Response) =>
  res.json({ section: 'sellers', action: 'process' })
);

// Partners (4)
router.get('/partners', (_req: Request, res: Response) =>
  res.json({ section: 'partners', action: 'list' })
);
router.get('/partners/:id', (_req: Request, res: Response) =>
  res.json({ section: 'partners', action: 'detail' })
);
router.post('/partners', (_req: Request, res: Response) =>
  res.json({ section: 'partners', action: 'create' })
);
router.put('/partners/:id', (_req: Request, res: Response) =>
  res.json({ section: 'partners', action: 'update' })
);

// Agreements (4)
router.get('/agreements', (_req: Request, res: Response) =>
  res.json({ section: 'agreements', action: 'list' })
);
router.get('/agreements/:id', (_req: Request, res: Response) =>
  res.json({ section: 'agreements', action: 'detail' })
);
router.post('/agreements', (_req: Request, res: Response) =>
  res.json({ section: 'agreements', action: 'create' })
);
router.put('/agreements/:id', (_req: Request, res: Response) =>
  res.json({ section: 'agreements', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/trends', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'trends' })
);
router.get('/analytics/performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'performance' })
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
