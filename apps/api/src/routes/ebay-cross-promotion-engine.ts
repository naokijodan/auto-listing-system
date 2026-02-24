import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));
router.get('/dashboard/recommendations', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recommendations' }));

// Promotions (6)
router.get('/promotions/list', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'list' }));
router.get('/promotions/detail', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'detail' }));
router.post('/promotions/create', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'create' }));
router.put('/promotions/update', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'update' }));
router.post('/promotions/activate', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'activate' }));
router.post('/promotions/deactivate', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'deactivate' }));

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/detail', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/update', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Products (4)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/pair', (_req: Request, res: Response) => res.json({ section: 'products', action: 'pair' }));
router.post('/products/unpair', (_req: Request, res: Response) => res.json({ section: 'products', action: 'unpair' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/conversion-lift', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion-lift' }));
router.get('/analytics/revenue-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

