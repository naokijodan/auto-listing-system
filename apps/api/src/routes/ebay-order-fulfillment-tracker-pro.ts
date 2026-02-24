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
router.get('/dashboard/in-progress', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'in-progress' })
);
router.get('/dashboard/completed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'completed' })
);
router.get('/dashboard/delayed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'delayed' })
);

// Orders (6)
router.get('/orders', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'list' })
);
router.get('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'detail' })
);
router.post('/orders/:id/fulfill', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'fulfill' })
);
router.put('/orders/:id/status', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'update-status' })
);
router.post('/orders/bulk-fulfill', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'bulk-fulfill' })
);
router.get('/orders/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'history' })
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
router.get('/shipments/:id/track', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'track' })
);

// Carriers (4)
router.get('/carriers', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'list' })
);
router.get('/carriers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'detail' })
);
router.get('/carriers/rates', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'rates' })
);
router.get('/carriers/performance', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'performance' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/fulfillment-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'fulfillment-rate' })
);
router.get('/analytics/delivery-time', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'delivery-time' })
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

