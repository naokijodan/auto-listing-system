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

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'list' })
);
router.get('/inventory/:id', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'detail' })
);
router.post('/inventory', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'create' })
);
router.put('/inventory/:id', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'update' })
);
router.delete('/inventory/:id', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'delete' })
);
router.post('/inventory/:id/process', (_req: Request, res: Response) =>
  res.json({ section: 'inventory', action: 'process' })
);

// Waste (4)
router.get('/waste', (_req: Request, res: Response) =>
  res.json({ section: 'waste', action: 'list' })
);
router.get('/waste/:id', (_req: Request, res: Response) =>
  res.json({ section: 'waste', action: 'detail' })
);
router.post('/waste', (_req: Request, res: Response) =>
  res.json({ section: 'waste', action: 'create' })
);
router.put('/waste/:id', (_req: Request, res: Response) =>
  res.json({ section: 'waste', action: 'update' })
);

// Optimization (4)
router.get('/optimization', (_req: Request, res: Response) =>
  res.json({ section: 'optimization', action: 'list' })
);
router.get('/optimization/:id', (_req: Request, res: Response) =>
  res.json({ section: 'optimization', action: 'detail' })
);
router.post('/optimization', (_req: Request, res: Response) =>
  res.json({ section: 'optimization', action: 'create' })
);
router.put('/optimization/:id', (_req: Request, res: Response) =>
  res.json({ section: 'optimization', action: 'update' })
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
