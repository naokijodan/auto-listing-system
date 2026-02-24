import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-rules', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-rules' }));
router.get('/dashboard/price-changes', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'price-changes' }));
router.get('/dashboard/impact', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'impact' }));

// Rules (6)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));
router.post('/rules/:id/activate', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'activate' }));
router.post('/rules/:id/deactivate', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'deactivate' }));

// Products (4)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/:id/price-history', (_req: Request, res: Response) => res.json({ section: 'products', action: 'price-history' }));
router.post('/products/:id/simulate', (_req: Request, res: Response) => res.json({ section: 'products', action: 'simulate' }));

// Competitors (4)
router.get('/competitors', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'list' }));
router.get('/competitors/:id', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'detail' }));
router.post('/competitors/:id/track', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'track' }));
router.get('/competitors/:id/compare', (_req: Request, res: Response) => res.json({ section: 'competitors', action: 'compare' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/revenue-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-impact' }));
router.get('/analytics/win-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'win-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

