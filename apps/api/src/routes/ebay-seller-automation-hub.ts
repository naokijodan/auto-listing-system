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

// workflows (6)
router.get('/workflows/overview', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'overview' })
);
router.get('/workflows/create', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'create' })
);
router.get('/workflows/update', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'update' })
);
router.get('/workflows/delete', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'delete' })
);
router.get('/workflows/run', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'run' })
);
router.get('/workflows/clone', (_req: Request, res: Response) =>
  res.json({ section: 'workflows', action: 'clone' })
);

// triggers (4)
router.get('/triggers/overview', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'overview' })
);
router.get('/triggers/add', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'add' })
);
router.get('/triggers/update', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'update' })
);
router.get('/triggers/remove', (_req: Request, res: Response) =>
  res.json({ section: 'triggers', action: 'remove' })
);

// actions (4)
router.get('/actions/overview', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'overview' })
);
router.get('/actions/add', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'add' })
);
router.get('/actions/update', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'update' })
);
router.get('/actions/remove', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'remove' })
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

