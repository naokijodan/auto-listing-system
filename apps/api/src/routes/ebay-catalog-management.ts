import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/products', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'products' }));
router.get('/dashboard/categories', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'categories' }));
router.get('/dashboard/quality-score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'quality-score' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.put('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.put('/products/bulk', (_req: Request, res: Response) => res.json({ section: 'products', action: 'bulk-update' }));
router.post('/products/:id/archive', (_req: Request, res: Response) => res.json({ section: 'products', action: 'archive' }));

// Categories (4)
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'detail' }));
router.post('/categories/:id/assign', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'assign' }));
router.post('/categories/bulk-assign', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'bulk-assign' }));

// Attributes (4)
router.get('/attributes', (_req: Request, res: Response) => res.json({ section: 'attributes', action: 'list' }));
router.get('/attributes/:id', (_req: Request, res: Response) => res.json({ section: 'attributes', action: 'detail' }));
router.post('/attributes', (_req: Request, res: Response) => res.json({ section: 'attributes', action: 'create' }));
router.put('/attributes/:id', (_req: Request, res: Response) => res.json({ section: 'attributes', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/completeness', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'completeness' }));
router.get('/analytics/quality', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'quality' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

