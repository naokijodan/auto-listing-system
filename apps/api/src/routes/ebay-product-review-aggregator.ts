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
router.get('/dashboard/recent', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'recent' })
);
router.get('/dashboard/sentiment', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'sentiment' })
);
router.get('/dashboard/top-reviewed', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'top-reviewed' })
);

// Reviews (6)
router.get('/reviews/list', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'list' })
);
router.get('/reviews/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'detail' })
);
router.post('/reviews/aggregate', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'aggregate' })
);
router.post('/reviews/respond/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'respond' })
);
router.post('/reviews/flag/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'flag' })
);
router.post('/reviews/bulk-respond', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'bulk-respond' })
);

// Products (4)
router.get('/products/list', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.get('/products/review-summary/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'review-summary' })
);
router.get('/products/comparison', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'comparison' })
);

// Sentiment (4)
router.get('/sentiment/list', (_req: Request, res: Response) =>
  res.json({ section: 'sentiment', action: 'list' })
);
router.get('/sentiment/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sentiment', action: 'detail' })
);
router.post('/sentiment/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'sentiment', action: 'analyze' })
);
router.get('/sentiment/trends', (_req: Request, res: Response) =>
  res.json({ section: 'sentiment', action: 'trends' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/rating-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'rating-distribution' })
);
router.get('/analytics/sentiment-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'sentiment-trend' })
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

