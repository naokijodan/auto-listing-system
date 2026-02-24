import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-margin', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-margin' }));
router.get('/dashboard/low-margin', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'low-margin' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));

// Calculations (6)
router.get('/calculations/list', (_req: Request, res: Response) => res.json({ section: 'calculations', action: 'list' }));
router.get('/calculations/detail', (_req: Request, res: Response) => res.json({ section: 'calculations', action: 'detail' }));
router.post('/calculations/calculate', (_req: Request, res: Response) => res.json({ section: 'calculations', action: 'calculate' }));
router.post('/calculations/bulk-calculate', (_req: Request, res: Response) => res.json({ section: 'calculations', action: 'bulk-calculate' }));
router.post('/calculations/compare', (_req: Request, res: Response) => res.json({ section: 'calculations', action: 'compare' }));
router.get('/calculations/history', (_req: Request, res: Response) => res.json({ section: 'calculations', action: 'history' }));

// Products (4)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/costs', (_req: Request, res: Response) => res.json({ section: 'products', action: 'costs' }));
router.get('/products/pricing', (_req: Request, res: Response) => res.json({ section: 'products', action: 'pricing' }));

// Costs (4)
router.get('/costs/list', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'list' }));
router.get('/costs/detail', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'detail' }));
router.post('/costs/create', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'create' }));
router.put('/costs/update', (_req: Request, res: Response) => res.json({ section: 'costs', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/margin-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'margin-distribution' }));
router.get('/analytics/optimization', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'optimization' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

