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
router.get('/dashboard/high-priority', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'high-priority' })
);
router.get('/dashboard/normal', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'normal' })
);
router.get('/dashboard/low-priority', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'low-priority' })
);

// Orders (6)
router.get('/orders', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'list' })
);
router.get('/orders/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'detail' })
);
router.post('/orders/:id/prioritize', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'prioritize' })
);
router.post('/orders/:id/reassign', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'reassign' })
);
router.post('/orders/:id/escalate', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'escalate' })
);
router.get('/orders/:id/history', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'history' })
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

// Queues (4)
router.get('/queues', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'list' })
);
router.get('/queues/:id', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'detail' })
);
router.post('/queues/manage', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'manage' })
);
router.post('/queues/optimize', (_req: Request, res: Response) =>
  res.json({ section: 'queues', action: 'optimize' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/priority-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'priority-distribution' })
);
router.get('/analytics/processing-time', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'processing-time' })
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

