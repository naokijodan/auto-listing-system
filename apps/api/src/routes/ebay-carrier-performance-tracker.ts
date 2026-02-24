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
router.get('/dashboard/top-carriers', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'top-carriers' })
);
router.get('/dashboard/issues', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'issues' })
);
router.get('/dashboard/trends', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'trends' })
);

// Carriers (6)
router.get('/carriers/list', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'list' })
);
router.get('/carriers/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'detail' })
);
router.post('/carriers/add', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'add' })
);
router.delete('/carriers/remove/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'remove' })
);
router.post('/carriers/rate/:id', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'rate' })
);
router.post('/carriers/compare', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'compare' })
);

// Shipments (4)
router.get('/shipments/list', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'list' })
);
router.get('/shipments/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'detail' })
);
router.get('/shipments/track/:id', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'track' })
);
router.get('/shipments/history/:id', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'history' })
);

// Issues (4)
router.get('/issues/list', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'list' })
);
router.get('/issues/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'detail' })
);
router.post('/issues/report', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'report' })
);
router.post('/issues/resolve/:id', (_req: Request, res: Response) =>
  res.json({ section: 'issues', action: 'resolve' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/delivery-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'delivery-rate' })
);
router.get('/analytics/damage-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'damage-rate' })
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
router.post('/refresh', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'refresh' })
);

export default router;

