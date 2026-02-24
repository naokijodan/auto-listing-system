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

// Orders (6)
router.get('/orders', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'list' })
);
router.get('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'detail' })
);
router.post('/orders', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'create' })
);
router.put('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'update' })
);
router.delete('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'delete' })
);
router.post('/orders/:id/process', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'process' })
);

// Shipments (4)
router.get('/shipments', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'list' })
);
router.get('/shipments/:id', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'detail' })
);
router.post('/shipments', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'create' })
);
router.put('/shipments/:id', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'update' })
);

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'list' })
);
router.get('/carriers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'detail' })
);
router.post('/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'create' })
);
router.put('/carriers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'update' })
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
