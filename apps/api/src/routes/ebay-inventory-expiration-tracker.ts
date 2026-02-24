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
router.get('/dashboard/expiring-soon', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'expiring-soon' })
);
router.get('/dashboard/expired', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'expired' })
);
router.get('/dashboard/healthy', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'healthy' })
);

// Products (6)
router.get('/products/list', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/detail', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.get('/products/set-expiry', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'set-expiry' })
);
router.get('/products/extend', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'extend' })
);
router.get('/products/dispose', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'dispose' })
);
router.get('/products/history', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'history' })
);

// Alerts (4)
router.get('/alerts/list', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'list' })
);
router.get('/alerts/detail', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'detail' })
);
router.get('/alerts/configure', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'configure' })
);
router.get('/alerts/dismiss', (_req: Request, res: Response) =>
  res.json({ section: 'alerts', action: 'dismiss' })
);

// Reports (4)
router.get('/reports/list', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'list' })
);
router.get('/reports/detail', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'detail' })
);
router.get('/reports/generate', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'generate' })
);
router.get('/reports/schedule', (_req: Request, res: Response) =>
  res.json({ section: 'reports', action: 'schedule' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/expiration-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'expiration-trend' })
);
router.get('/analytics/waste-reduction', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'waste-reduction' })
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

