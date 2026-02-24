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
router.get('/dashboard/high-risk', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'high-risk' })
);
router.get('/dashboard/medium-risk', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'medium-risk' })
);
router.get('/dashboard/low-risk', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'low-risk' })
);

// Orders (6)
router.get('/orders/list', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'list' })
);
router.get('/orders/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'detail' })
);
router.post('/orders/score/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'score' })
);
router.post('/orders/bulk-score', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'bulk-score' })
);
router.post('/orders/flag/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'flag' })
);
router.post('/orders/unflag/:id', (_req: Request, res: Response) =>
  res.json({ section: 'orders', action: 'unflag' })
);

// Risks (4)
router.get('/risks/list', (_req: Request, res: Response) =>
  res.json({ section: 'risks', action: 'list' })
);
router.get('/risks/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'risks', action: 'detail' })
);
router.post('/risks/mitigate/:id', (_req: Request, res: Response) =>
  res.json({ section: 'risks', action: 'mitigate' })
);
router.get('/risks/export', (_req: Request, res: Response) =>
  res.json({ section: 'risks', action: 'export' })
);

// Scoring (4)
router.get('/scoring/overview', (_req: Request, res: Response) =>
  res.json({ section: 'scoring', action: 'overview' })
);
router.get('/scoring/model/:id', (_req: Request, res: Response) =>
  res.json({ section: 'scoring', action: 'model' })
);
router.post('/scoring/retrain', (_req: Request, res: Response) =>
  res.json({ section: 'scoring', action: 'retrain' })
);
router.post('/scoring/thresholds', (_req: Request, res: Response) =>
  res.json({ section: 'scoring', action: 'thresholds' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/risk-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'risk-distribution' })
);
router.get('/analytics/fraud-prevention', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'fraud-prevention' })
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
