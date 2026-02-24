import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/cheapest', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'cheapest' }));
router.get('/dashboard/overpriced', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overpriced' }));
router.get('/dashboard/opportunities', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'opportunities' }));

// Comparisons (6)
router.get('/comparisons', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'list' }));
router.get('/comparisons/:id', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'detail' }));
router.post('/comparisons/run', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'run' }));
router.post('/comparisons/bulk-run', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'bulk-run' }));
router.post('/comparisons/schedule', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'schedule' }));
router.get('/comparisons/history', (_req: Request, res: Response) => res.json({ section: 'comparisons', action: 'history' }));

// Sources (4)
router.get('/sources', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'list' }));
router.get('/sources/:id', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'detail' }));
router.post('/sources', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'add' }));
router.delete('/sources/:id', (_req: Request, res: Response) => res.json({ section: 'sources', action: 'remove' }));

// Products (4)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/:id/price-map', (_req: Request, res: Response) => res.json({ section: 'products', action: 'price-map' }));
router.get('/products/:id/alerts', (_req: Request, res: Response) => res.json({ section: 'products', action: 'alerts' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/price-position', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'price-position' }));
router.get('/analytics/market-coverage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'market-coverage' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

