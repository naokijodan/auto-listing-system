import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'overview' })
);
router.get('/dashboard/performance', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'performance' })
);
router.get('/dashboard/alerts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'alerts' })
);
router.get('/dashboard/recommendations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'recommendations' })
);
router.get('/dashboard/status', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'status' })
);

// shipments (6)
router.get('/shipments/overview', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'overview' })
);
router.get('/shipments/create', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'create' })
);
router.get('/shipments/split', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'split' })
);
router.get('/shipments/assign', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'assign' })
);
router.get('/shipments/label', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'label' })
);
router.get('/shipments/summary', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'summary' })
);

// packages (4)
router.get('/packages/overview', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'overview' })
);
router.get('/packages/add', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'add' })
);
router.get('/packages/update', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'update' })
);
router.get('/packages/remove', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'remove' })
);

// tracking (4)
router.get('/tracking/overview', (_req: Request, res: Response) =>
  res.json({ section: 'tracking', action: 'overview' })
);
router.get('/tracking/add', (_req: Request, res: Response) =>
  res.json({ section: 'tracking', action: 'add' })
);
router.get('/tracking/update', (_req: Request, res: Response) =>
  res.json({ section: 'tracking', action: 'update' })
);
router.get('/tracking/remove', (_req: Request, res: Response) =>
  res.json({ section: 'tracking', action: 'remove' })
);

// analytics (3)
router.get('/analytics/overview', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/metrics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'metrics' })
);
router.get('/analytics/trends', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'trends' })
);

// settings (2)
router.get('/settings/get', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'get' })
);
router.get('/settings/update', (_req: Request, res: Response) =>
  res.json({ section: 'settings', action: 'update' })
);

// utilities (4)
router.get('/utilities/ping', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'ping' })
);
router.get('/utilities/health', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'health' })
);
router.get('/utilities/export', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'export' })
);
router.get('/utilities/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);

export default router;

