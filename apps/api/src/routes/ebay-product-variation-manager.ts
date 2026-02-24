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
router.get('/dashboard/products', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'products' })
);
router.get('/dashboard/variations', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'variations' })
);
router.get('/dashboard/stock-level', (_req: Request, res: Response) =>
  res.json({ section: 'dashboard', action: 'stock-level' })
);

// Products (6)
router.get('/products/list', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'list' })
);
router.get('/products/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'detail' })
);
router.post('/products/create', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'create' })
);
router.put('/products/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'update' })
);
router.post('/products/add-variation/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'add-variation' })
);
router.post('/products/remove-variation/:id', (_req: Request, res: Response) =>
  res.json({ section: 'products', action: 'remove-variation' })
);

// Variations (4)
router.get('/variations/list', (_req: Request, res: Response) =>
  res.json({ section: 'variations', action: 'list' })
);
router.get('/variations/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'variations', action: 'detail' })
);
router.post('/variations/create', (_req: Request, res: Response) =>
  res.json({ section: 'variations', action: 'create' })
);
router.put('/variations/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'variations', action: 'update' })
);

// Attributes (4)
router.get('/attributes/list', (_req: Request, res: Response) =>
  res.json({ section: 'attributes', action: 'list' })
);
router.get('/attributes/detail/:id', (_req: Request, res: Response) =>
  res.json({ section: 'attributes', action: 'detail' })
);
router.post('/attributes/create', (_req: Request, res: Response) =>
  res.json({ section: 'attributes', action: 'create' })
);
router.put('/attributes/update/:id', (_req: Request, res: Response) =>
  res.json({ section: 'attributes', action: 'update' })
);

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'analytics' })
);
router.get('/analytics/best-sellers', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'best-sellers' })
);
router.get('/analytics/stock-distribution', (_req: Request, res: Response) =>
  res.json({ section: 'analytics', action: 'stock-distribution' })
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

