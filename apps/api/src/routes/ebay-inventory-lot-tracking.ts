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

// lots (6)
router.get('/lots/overview', (_req: Request, res: Response) =>
  res.json({ section: 'lots', action: 'overview' })
);
router.get('/lots/create', (_req: Request, res: Response) =>
  res.json({ section: 'lots', action: 'create' })
);
router.get('/lots/merge', (_req: Request, res: Response) =>
  res.json({ section: 'lots', action: 'merge' })
);
router.get('/lots/split', (_req: Request, res: Response) =>
  res.json({ section: 'lots', action: 'split' })
);
router.get('/lots/assign', (_req: Request, res: Response) =>
  res.json({ section: 'lots', action: 'assign' })
);
router.get('/lots/audit', (_req: Request, res: Response) =>
  res.json({ section: 'lots', action: 'audit' })
);

// products (4)
router.get('/products/overview', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'overview' })
);
router.get('/products/add', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'add' })
);
router.get('/products/update', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'update' })
);
router.get('/products/remove', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'remove' })
);

// movements (4)
router.get('/movements/overview', (_req: Request, res: Response) =>
  res.json({ section: 'movements', action: 'overview' })
);
router.get('/movements/inbound', (_req: Request, res: Response) =>
  res.json({ section: 'movements', action: 'inbound' })
);
router.get('/movements/outbound', (_req: Request, res: Response) =>
  res.json({ section: 'movements', action: 'outbound' })
);
router.get('/movements/adjust', (_req: Request, res: Response) =>
  res.json({ section: 'movements', action: 'adjust' })
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

