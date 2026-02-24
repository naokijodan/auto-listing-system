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

// Listings (6)
router.get('/listings', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'list' })
);
router.get('/listings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'detail' })
);
router.post('/listings', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'create' })
);
router.put('/listings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'update' })
);
router.delete('/listings/:id', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'delete' })
);
router.post('/listings/:id/process', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'process' })
);

// Regions (4)
router.get('/regions', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'list' })
);
router.get('/regions/:id', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'detail' })
);
router.post('/regions', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'create' })
);
router.put('/regions/:id', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'update' })
);

// Prices (4)
router.get('/prices', (_req: Request, res: Response) =>
  res.json({ section: 'prices', action: 'list' })
);
router.get('/prices/:id', (_req: Request, res: Response) =>
  res.json({ section: 'prices', action: 'detail' })
);
router.post('/prices', (_req: Request, res: Response) =>
  res.json({ section: 'prices', action: 'create' })
);
router.put('/prices/:id', (_req: Request, res: Response) =>
  res.json({ section: 'prices', action: 'update' })
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
