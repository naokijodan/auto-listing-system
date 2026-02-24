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

// products (6)
router.get('/products/overview', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'overview' })
);
router.get('/products/scan', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'scan' })
);
router.get('/products/validate', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'validate' })
);
router.get('/products/update', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'update' })
);
router.get('/products/delete', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'delete' })
);
router.get('/products/bulk', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'bulk' })
);

// rules (4)
router.get('/rules/overview', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'overview' })
);
router.get('/rules/add', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'add' })
);
router.get('/rules/update', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);
router.get('/rules/remove', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'remove' })
);

// reports (4)
router.get('/reports/overview', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'overview' })
);
router.get('/reports/generate', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'generate' })
);
router.get('/reports/export', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'export' })
);
router.get('/reports/history', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'history' })
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

