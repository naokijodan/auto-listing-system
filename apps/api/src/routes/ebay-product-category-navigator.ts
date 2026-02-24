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
router.get('/dashboard/popular', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'popular' })
);
router.get('/dashboard/underserved', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'underserved' })
);
router.get('/dashboard/trending', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'trending' })
);

// Categories (6)
router.get('/categories/list', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'list' })
);
router.get('/categories/detail', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'detail' })
);
router.get('/categories/browse', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'browse' })
);
router.get('/categories/search', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'search' })
);
router.get('/categories/suggest', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'suggest' })
);
router.get('/categories/history', (_req: Request, res: Response) =>
  res.json({ section: 'categories', action: 'history' })
);

// Mappings (4)
router.get('/mappings/list', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'list' })
);
router.get('/mappings/detail', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'detail' })
);
router.get('/mappings/create', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'create' })
);
router.get('/mappings/validate', (_req: Request, res: Response) =>
  res.json({ section: 'mappings', action: 'validate' })
);

// Insights (4)
router.get('/insights/list', (_req: Request, res: Response) =>
  res.json({ section: 'insights', action: 'list' })
);
router.get('/insights/detail', (_req: Request, res: Response) =>
  res.json({ section: 'insights', action: 'detail' })
);
router.get('/insights/generate', (_req: Request, res: Response) =>
  res.json({ section: 'insights', action: 'generate' })
);
router.get('/insights/compare', (_req: Request, res: Response) =>
  res.json({ section: 'insights', action: 'compare' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/category-performance', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'category-performance' })
);
router.get('/analytics/competition-level', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'competition-level' })
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

