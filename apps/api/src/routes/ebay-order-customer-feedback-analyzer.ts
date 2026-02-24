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
router.get('/dashboard/positive', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'positive' })
);
router.get('/dashboard/negative', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'negative' })
);
router.get('/dashboard/neutral', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'neutral' })
);

// Feedbacks (6)
router.get('/feedbacks', (_req: Request, res: Response) =>
  res.json({ section: 'feedbacks', action: 'list' })
);
router.get('/feedbacks/:id', (_req: Request, res: Response) =>
  res.json({ section: 'feedbacks', action: 'detail' })
);
router.post('/feedbacks/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'feedbacks', action: 'analyze' })
);
router.post('/feedbacks/respond', (_req: Request, res: Response) =>
  res.json({ section: 'feedbacks', action: 'respond' })
);
router.post('/feedbacks/bulk-respond', (_req: Request, res: Response) =>
  res.json({ section: 'feedbacks', action: 'bulk-respond' })
);
router.get('/feedbacks/history', (_req: Request, res: Response) =>
  res.json({ section: 'feedbacks', action: 'history' })
);

// Sentiments (4)
router.get('/sentiments', (_req: Request, res: Response) =>
  res.json({ section: 'sentiments', action: 'list' })
);
router.get('/sentiments/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sentiments', action: 'detail' })
);
router.get('/sentiments/trends', (_req: Request, res: Response) =>
  res.json({ section: 'sentiments', action: 'trends' })
);
router.get('/sentiments/keywords', (_req: Request, res: Response) =>
  res.json({ section: 'sentiments', action: 'keywords' })
);

// Actions (4)
router.get('/actions', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'list' })
);
router.get('/actions/:id', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'detail' })
);
router.post('/actions/create', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'create' })
);
router.post('/actions/complete', (_req: Request, res: Response) =>
  res.json({ section: 'actions', action: 'complete' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/sentiment-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'sentiment-trend' })
);
router.get('/analytics/satisfaction-score', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'satisfaction-score' })
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

