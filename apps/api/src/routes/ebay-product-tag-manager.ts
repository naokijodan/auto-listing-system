import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Phase 735: Product Tag Manager — Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'root' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-tags', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-tags' }));
router.get('/dashboard/tag-coverage', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'tag-coverage' }));
router.get('/dashboard/quality', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'quality' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/:id/tags', (_req: Request, res: Response) => res.json({ section: 'products', action: 'add-tags' }));
router.delete('/products/:id/tags/:tag', (_req: Request, res: Response) => res.json({ section: 'products', action: 'remove-tag' }));
router.get('/products/:id/tags', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list-tags' }));
router.get('/products/untagged', (_req: Request, res: Response) => res.json({ section: 'products', action: 'untagged' }));

// Tags (4)
router.get('/tags', (_req: Request, res: Response) => res.json({ section: 'tags', action: 'list' }));
router.post('/tags', (_req: Request, res: Response) => res.json({ section: 'tags', action: 'create' }));
router.put('/tags/:name', (_req: Request, res: Response) => res.json({ section: 'tags', action: 'update' }));
router.delete('/tags/:name', (_req: Request, res: Response) => res.json({ section: 'tags', action: 'delete' }));

// Categories (4)
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id/tags', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'tags' }));
router.post('/categories/:id/tags', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'assign-tags' }));
router.delete('/categories/:id/tags/:tag', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'remove-tag' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/tag-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'tag-impact' }));
router.get('/analytics/coverage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'coverage' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

