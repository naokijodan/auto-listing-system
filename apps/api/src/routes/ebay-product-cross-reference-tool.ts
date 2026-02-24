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
router.get('/dashboard/matched', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'matched' })
);
router.get('/dashboard/unmatched', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'unmatched' })
);
router.get('/dashboard/conflicts', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'conflicts' })
);

// References (6)
router.get('/references', (_req: Request, res: Response) =>
  res.json({ section: 'references', action: 'list' })
);
router.get('/references/:id', (_req: Request, res: Response) =>
  res.json({ section: 'references', action: 'detail' })
);
router.post('/references', (_req: Request, res: Response) =>
  res.json({ section: 'references', action: 'create' })
);
router.post('/references/:id/link', (_req: Request, res: Response) =>
  res.json({ section: 'references', action: 'link' })
);
router.post('/references/:id/unlink', (_req: Request, res: Response) =>
  res.json({ section: 'references', action: 'unlink' })
);
router.post('/references/bulk-match', (_req: Request, res: Response) =>
  res.json({ section: 'references', action: 'bulk-match' })
);

// Products (4)
router.get('/products', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.get('/products/search', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'search' })
);
router.get('/products/:id/compare', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'compare' })
);

// Sources (4)
router.get('/sources', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'list' })
);
router.get('/sources/:id', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'detail' })
);
router.post('/sources/:id/configure', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'configure' })
);
router.post('/sources/sync', (_req: Request, res: Response) =>
  res.json({ section: 'sources', action: 'sync' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'overview' })
);
router.get('/analytics/match-rate', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'match-rate' })
);
router.get('/analytics/data-quality', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'data-quality' })
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

