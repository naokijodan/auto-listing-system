import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/recent-comparisons', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent-comparisons' }));
router.get('/dashboard/popular-products', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'popular-products' }));
router.get('/dashboard/impact', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'impact' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.put('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.post('/products/:id/track', (_req: Request, res: Response) => res.json({ section: 'products', action: 'track' }));
router.delete('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'delete' }));

// Specs (4)
router.get('/specs', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'list' }));
router.get('/specs/templates', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'templates' }));
router.post('/specs/normalize', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'normalize' }));
router.post('/specs/validate', (_req: Request, res: Response) => res.json({ section: 'specs', action: 'validate' }));

// Comparisons (4)
router.get('/comparisons', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'list' }));
router.post('/comparisons', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'create' }));
router.get('/comparisons/:id', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'detail' }));
router.post('/comparisons/:id/compare', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'compare' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/coverage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'coverage' }));
router.get('/analytics/accuracy', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'accuracy' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

