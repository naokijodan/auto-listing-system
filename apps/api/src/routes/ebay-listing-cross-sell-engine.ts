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
router.get('/dashboard/active-pairs', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'active-pairs' })
);
router.get('/dashboard/revenue-impact', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'revenue-impact' })
);
router.get('/dashboard/suggestions', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'suggestions' })
);

// Pairs (6)
router.get('/pairs', (_req: Request, res: Response) =>
  res.json({ section: 'pairs', action: 'list' })
);
router.get('/pairs/:id', (_req: Request, res: Response) =>
  res.json({ section: 'pairs', action: 'detail' })
);
router.post('/pairs', (_req: Request, res: Response) =>
  res.json({ section: 'pairs', action: 'create' })
);
router.put('/pairs/:id', (_req: Request, res: Response) =>
  res.json({ section: 'pairs', action: 'update' })
);
router.post('/pairs/:id/activate', (_req: Request, res: Response) =>
  res.json({ section: 'pairs', action: 'activate' })
);
router.post('/pairs/:id/deactivate', (_req: Request, res: Response) =>
  res.json({ section: 'pairs', action: 'deactivate' })
);

// Products (4)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.get('/products/:id/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'analyze' })
);
router.get('/products/:id/suggest', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'suggest' })
);

// Rules (4)
router.get('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'list' })
);
router.get('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'detail' })
);
router.post('/rules', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'create' })
);
router.put('/rules/:id', (_req: Request, res: Response) =>
  res.json({ section: 'rules', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/cross-sell-revenue', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'cross-sell-revenue' })
);
router.get('/analytics/conversion-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'conversion-rate' })
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
router.post('/import', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'import' })
);
router.post('/sync', (_req: Request, res: Response) =>
  res.json({ section: 'utilities', action: 'sync' })
);

export default router;

