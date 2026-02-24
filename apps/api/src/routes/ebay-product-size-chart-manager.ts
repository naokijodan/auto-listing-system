import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/popular-charts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'popular-charts' }));
router.get('/dashboard/compliance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'compliance' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.put('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.post('/products/:id/assign-chart', (_req: Request, res: Response) => res.json({ section: 'products', action: 'assign-chart' }));
router.post('/products/:id/remove-chart', (_req: Request, res: Response) => res.json({ section: 'products', action: 'remove-chart' }));

// Charts (4)
router.get('/charts', (_req: Request, res: Response) => res.json({ section: 'charts', action: 'list' }));
router.get('/charts/:id', (_req: Request, res: Response) => res.json({ section: 'charts', action: 'detail' }));
router.post('/charts', (_req: Request, res: Response) => res.json({ section: 'charts', action: 'create' }));
router.put('/charts/:id', (_req: Request, res: Response) => res.json({ section: 'charts', action: 'update' }));

// Templates (4)
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/conversion', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion' }));
router.get('/analytics/fit-returns', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'fit-returns' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

