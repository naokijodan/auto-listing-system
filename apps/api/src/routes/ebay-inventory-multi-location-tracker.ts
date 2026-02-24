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
router.get('/dashboard/locations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'locations' })
);
router.get('/dashboard/transfers', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'transfers' })
);
router.get('/dashboard/low-stock', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'low-stock' })
);

// Locations (6)
router.get('/locations', (_req: Request, res: Response) =>
  res.json({ section: 'locations', action: 'list' })
);
router.get('/locations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'locations', action: 'detail' })
);
router.post('/locations/create', (_req: Request, res: Response) =>
  res.json({ section: 'locations', action: 'create' })
);
router.put('/locations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'locations', action: 'update' })
);
router.post('/locations/:id/deactivate', (_req: Request, res: Response) =>
  res.json({ section: 'locations', action: 'deactivate' })
);
router.get('/locations/:id/inventory', (_req: Request, res: Response) =>
  res.json({ section: 'locations', action: 'inventory' })
);

// Transfers (4)
router.get('/transfers', (_req: Request, res: Response) =>
  res.json({ section: 'transfers', action: 'list' })
);
router.get('/transfers/:id', (_req: Request, res: Response) =>
  res.json({ section: 'transfers', action: 'detail' })
);
router.post('/transfers/create', (_req: Request, res: Response) =>
  res.json({ section: 'transfers', action: 'create' })
);
router.post('/transfers/:id/complete', (_req: Request, res: Response) =>
  res.json({ section: 'transfers', action: 'complete' })
);

// Products (4)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/:id/allocate', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'allocate' })
);
router.post('/products/:id/rebalance', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'rebalance' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/location-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'location-performance' })
);
router.get('/analytics/transfer-efficiency', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'transfer-efficiency' })
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

