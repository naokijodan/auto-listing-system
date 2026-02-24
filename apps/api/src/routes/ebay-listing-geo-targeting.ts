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

// listings (6)
router.get('/listings/overview', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'overview' })
);
router.get('/listings/create', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'create' })
);
router.get('/listings/update', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'update' })
);
router.get('/listings/delete', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'delete' })
);
router.get('/listings/bulk', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'bulk' })
);
router.get('/listings/sync', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'sync' })
);

// regions (4)
router.get('/regions/overview', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'overview' })
);
router.get('/regions/add', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'add' })
);
router.get('/regions/update', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'update' })
);
router.get('/regions/remove', (_req: Request, res: Response) =>
  res.json({ section: 'regions', action: 'remove' })
);

// campaigns (4)
router.get('/campaigns/overview', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'overview' })
);
router.get('/campaigns/create', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'create' })
);
router.get('/campaigns/pause', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'pause' })
);
router.get('/campaigns/report', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'report' })
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

