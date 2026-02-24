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
router.get('/dashboard/score', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'score' })
);
router.get('/dashboard/reviews', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'reviews' })
);
router.get('/dashboard/alerts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'alerts' })
);

// Reviews (6)
router.get('/reviews', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'list' })
);
router.get('/reviews/:id', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'detail' })
);
router.post('/reviews/:id/respond', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'respond' })
);
router.post('/reviews/:id/flag', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'flag' })
);
router.post('/reviews/bulk-respond', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'bulk-respond' })
);
router.get('/reviews/history', (_req: Request, res: Response) =>
  res.json({ section: 'reviews', action: 'history' })
);

// Scores (4)
router.get('/scores', (_req: Request, res: Response) =>
  res.json({ section: 'scores', action: 'list' })
);
router.get('/scores/:id', (_req: Request, res: Response) =>
  res.json({ section: 'scores', action: 'detail' })
);
router.get('/scores/:id/breakdown', (_req: Request, res: Response) =>
  res.json({ section: 'scores', action: 'breakdown' })
);
router.get('/scores/compare', (_req: Request, res: Response) =>
  res.json({ section: 'scores', action: 'compare' })
);

// Actions (4)
router.get('/actions', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'list' })
);
router.get('/actions/:id', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'detail' })
);
router.post('/actions', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'create' })
);
router.post('/actions/:id/complete', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'complete' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/score-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'score-trend' })
);
router.get('/analytics/sentiment-analysis', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'sentiment-analysis' })
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

