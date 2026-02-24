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
router.get('/dashboard/calculated', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'calculated' })
);
router.get('/dashboard/pending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'pending' })
);
router.get('/dashboard/discrepancies', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'discrepancies' })
);

// Products (6)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/calculate', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'calculate' })
);
router.put('/products/:id/update-weight', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'update-weight' })
);
router.post('/products/bulk-calculate', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'bulk-calculate' })
);
router.post('/products/verify', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'verify' })
);

// Packages (4)
router.get('/packages', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'list' })
);
router.get('/packages/:id', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'detail' })
);
router.get('/packages/:id/dimensions', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'dimensions' })
);
router.get('/packages/:id/materials', (_req: Request, res: Response) =>
  res.json({ section: 'packages', action: 'materials' })
);

// Shipping (4)
router.get('/shipping', (_req: Request, res: Response) =>
  res.json({ section: 'shipping', action: 'list' })
);
router.get('/shipping/:id', (_req: Request, res: Response) =>
  res.json({ section: 'shipping', action: 'detail' })
);
router.get('/shipping/estimate', (_req: Request, res: Response) =>
  res.json({ section: 'shipping', action: 'estimate' })
);
router.get('/shipping/compare', (_req: Request, res: Response) =>
  res.json({ section: 'shipping', action: 'compare' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/accuracy', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'accuracy' })
);
router.get('/analytics/shipping-savings', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'shipping-savings' })
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

