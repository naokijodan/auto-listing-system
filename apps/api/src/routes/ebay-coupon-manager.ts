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
router.get('/dashboard/active', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'active' })
);
router.get('/dashboard/expired', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'expired' })
);
router.get('/dashboard/performance', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'performance' })
);

// Coupons (6)
router.get('/coupons/list', (_req: Request, res: Response) =>
  res.json({ section: 'coupons', action: 'list' })
);
router.get('/coupons/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'coupons', action: 'detail' })
);
router.post('/coupons/create', (_req: Request, res: Response) =>
  res.json({ section: 'coupons', action: 'create' })
);
router.put('/coupons/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'coupons', action: 'update' })
);
router.post('/coupons/activate/:id', (_req: Request, res: Response) =>
  res.json({ section: 'coupons', action: 'activate' })
);
router.post('/coupons/deactivate/:id', (_req: Request, res: Response) =>
  res.json({ section: 'coupons', action: 'deactivate' })
);

// Campaigns (4)
router.get('/campaigns/list', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'list' })
);
router.get('/campaigns/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'detail' })
);
router.post('/campaigns/create', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'create' })
);
router.put('/campaigns/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'campaigns', action: 'update' })
);

// Redemptions (4)
router.get('/redemptions/list', (_req: Request, res: Response) =>
  res.json({ section: 'redemptions', action: 'list' })
);
router.get('/redemptions/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'redemptions', action: 'detail' })
);
router.post('/redemptions/validate/:id', (_req: Request, res: Response) =>
  res.json({ section: 'redemptions', action: 'validate' })
);
router.post('/redemptions/void/:id', (_req: Request, res: Response) =>
  res.json({ section: 'redemptions', action: 'void' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/roi', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'roi' })
);
router.get('/analytics/redemption-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'redemption-rate' })
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
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

