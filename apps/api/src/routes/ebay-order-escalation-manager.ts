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
router.get('/dashboard/critical', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'critical' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/resolved', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'resolved' })
);

// Escalations (6)
router.get('/escalations', (_req: Request, res: Response) =>
  res.json({ section: 'escalations', action: 'list' })
);
router.get('/escalations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'escalations', action: 'detail' })
);
router.post('/escalations', (_req: Request, res: Response) =>
  res.json({ section: 'escalations', action: 'create' })
);
router.post('/escalations/:id/escalate', (_req: Request, res: Response) =>
  res.json({ section: 'escalations', action: 'escalate' })
);
router.post('/escalations/:id/resolve', (_req: Request, res: Response) =>
  res.json({ section: 'escalations', action: 'resolve' })
);
router.post('/escalations/bulk-resolve', (_req: Request, res: Response) =>
  res.json({ section: 'escalations', action: 'bulk-resolve' })
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

// Teams (4)
router.get('/teams', (_req: Request, res: Response) =>
  res.json({ section: 'teams', action: 'list' })
);
router.get('/teams/:id', (_req: Request, res: Response) =>
  res.json({ section: 'teams', action: 'detail' })
);
router.post('/teams/:id/assign', (_req: Request, res: Response) =>
  res.json({ section: 'teams', action: 'assign' })
);
router.get('/teams/workload', (_req: Request, res: Response) =>
  res.json({ section: 'teams', action: 'workload' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/resolution-time', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'resolution-time' })
);
router.get('/analytics/escalation-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'escalation-rate' })
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

