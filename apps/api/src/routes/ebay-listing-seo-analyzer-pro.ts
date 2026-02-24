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
router.get('/dashboard/top-ranked', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'top-ranked' })
);
router.get('/dashboard/needs-improvement', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'needs-improvement' })
);
router.get('/dashboard/opportunities', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'opportunities' })
);

// Listings (6)
router.get('/listings/list', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'list' })
);
router.get('/listings/detail', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'detail' })
);
router.get('/listings/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'analyze' })
);
router.get('/listings/optimize', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'optimize' })
);
router.get('/listings/bulk-analyze', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'bulk-analyze' })
);
router.get('/listings/history', (_req: Request, res: Response) =>
  res.json({ section: 'listings', action: 'history' })
);

// Keywords (4)
router.get('/keywords/list', (_req: Request, res: Response) =>
  res.json({ section: 'keywords', action: 'list' })
);
router.get('/keywords/detail', (_req: Request, res: Response) =>
  res.json({ section: 'keywords', action: 'detail' })
);
router.get('/keywords/research', (_req: Request, res: Response) =>
  res.json({ section: 'keywords', action: 'research' })
);
router.get('/keywords/track', (_req: Request, res: Response) =>
  res.json({ section: 'keywords', action: 'track' })
);

// Competitors (4)
router.get('/competitors/list', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'list' })
);
router.get('/competitors/detail', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'detail' })
);
router.get('/competitors/analyze', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'analyze' })
);
router.get('/competitors/compare', (_req: Request, res: Response) =>
  res.json({ section: 'competitors', action: 'compare' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/ranking-trend', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'ranking-trend' })
);
router.get('/analytics/keyword-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'keyword-performance' })
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

