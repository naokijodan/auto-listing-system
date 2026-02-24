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
router.get('/dashboard/active', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'active' })
);
router.get('/dashboard/performance', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'performance' })
);
router.get('/dashboard/recommendations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'recommendations' })
);

// Products (6)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'create' })
);
router.put('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'update' })
);
router.get('/products/:id/related', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'related' })
);
router.post('/products/:id/link', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'link' })
);

// Crosssell (4)
router.get('/crosssell', (_req: Request, res: Response) =>
  res.json({ section: 'crosssell', action: 'list' })
);
router.get('/crosssell/:id', (_req: Request, res: Response) =>
  res.json({ section: 'crosssell', action: 'detail' })
);
router.post('/crosssell', (_req: Request, res: Response) =>
  res.json({ section: 'crosssell', action: 'create' })
);
router.put('/crosssell/:id', (_req: Request, res: Response) =>
  res.json({ section: 'crosssell', action: 'update' })
);

// Recommendations (4)
router.get('/recommendations', (_req: Request, res: Response) =>
  res.json({ section: 'recommendations', action: 'list' })
);
router.get('/recommendations/:id', (_req: Request, res: Response) =>
  res.json({ section: 'recommendations', action: 'detail' })
);
router.post('/recommendations/generate', (_req: Request, res: Response) =>
  res.json({ section: 'recommendations', action: 'generate' })
);
router.get('/recommendations/:id/preview', (_req: Request, res: Response) =>
  res.json({ section: 'recommendations', action: 'preview' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/conversion', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'conversion' })
);
router.get('/analytics/revenue-impact', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'revenue-impact' })
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

