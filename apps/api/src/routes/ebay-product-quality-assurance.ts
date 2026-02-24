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
router.get('/dashboard/passed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'passed' })
);
router.get('/dashboard/failed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'failed' })
);
router.get('/dashboard/pending-review', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending-review' })
);

// Products (6)
router.get('/products/list', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/detail', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.get('/products/inspect', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'inspect' })
);
router.get('/products/certify', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'certify' })
);
router.get('/products/reject', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'reject' })
);
router.get('/products/history', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'history' })
);

// Standards (4)
router.get('/standards/list', (_req: Request, res: Response) =>
  res.json({ section: 'standards', action: 'list' })
);
router.get('/standards/detail', (_req: Request, res: Response) =>
  res.json({ section: 'standards', action: 'detail' })
);
router.get('/standards/create', (_req: Request, res: Response) =>
  res.json({ section: 'standards', action: 'create' })
);
router.get('/standards/update', (_req: Request, res: Response) =>
  res.json({ section: 'standards', action: 'update' })
);

// Inspections (4)
router.get('/inspections/list', (_req: Request, res: Response) =>
  res.json({ section: 'inspections', action: 'list' })
);
router.get('/inspections/detail', (_req: Request, res: Response) =>
  res.json({ section: 'inspections', action: 'detail' })
);
router.get('/inspections/schedule', (_req: Request, res: Response) =>
  res.json({ section: 'inspections', action: 'schedule' })
);
router.get('/inspections/complete', (_req: Request, res: Response) =>
  res.json({ section: 'inspections', action: 'complete' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/quality-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'quality-trend' })
);
router.get('/analytics/defect-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'defect-distribution' })
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
router.get('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.get('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

