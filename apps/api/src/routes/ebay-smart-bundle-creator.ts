import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-bundles', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-bundles' }));
router.get('/dashboard/revenue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'revenue' }));
router.get('/dashboard/suggestions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'suggestions' }));

// Bundles (6)
router.get('/bundles/list', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'list' }));
router.get('/bundles/detail/:id', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'detail' }));
router.post('/bundles/create', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'create' }));
router.put('/bundles/update/:id', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'update' }));
router.delete('/bundles/delete/:id', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'delete' }));
router.post('/bundles/activate/:id', (_req: Request, res: Response) => res.json({ section: 'bundles', action: 'activate' }));

// Products (4)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/compatibility/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'compatibility' }));
router.get('/products/recommendations/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'recommendations' }));

// Pricing (4)
router.get('/pricing/list', (_req: Request, res: Response) => res.json({ section: 'pricing', action: 'list' }));
router.get('/pricing/detail/:id', (_req: Request, res: Response) => res.json({ section: 'pricing', action: 'detail' }));
router.post('/pricing/calculate', (_req: Request, res: Response) => res.json({ section: 'pricing', action: 'calculate' }));
router.post('/pricing/optimize', (_req: Request, res: Response) => res.json({ section: 'pricing', action: 'optimize' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/bundle-performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'bundle-performance' }));
router.get('/analytics/conversion-lift', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion-lift' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

