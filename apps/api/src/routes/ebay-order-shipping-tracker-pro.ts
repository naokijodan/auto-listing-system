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
router.get('/dashboard/in-transit', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'in-transit' })
);
router.get('/dashboard/delivered', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'delivered' })
);
router.get('/dashboard/exceptions', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'exceptions' })
);

// Shipments (6)
router.get('/shipments/list', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'list' })
);
router.get('/shipments/detail', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'detail' })
);
router.get('/shipments/track', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'track' })
);
router.get('/shipments/update', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'update' })
);
router.get('/shipments/bulk-track', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'bulk-track' })
);
router.get('/shipments/history', (_req: Request, res: Response) =>
  res.json({ section: 'shipments', action: 'history' })
);

// Carriers (4)
router.get('/carriers/list', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'list' })
);
router.get('/carriers/detail', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'detail' })
);
router.get('/carriers/compare', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'compare' })
);
router.get('/carriers/rate', (_req: Request, res: Response) =>
  res.json({ section: 'carriers', action: 'rate' })
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

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/delivery-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'delivery-performance' })
);
router.get('/analytics/carrier-comparison', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'carrier-comparison' })
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
router.get('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.get('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

