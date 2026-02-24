import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-performers', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-performers' }));
router.get('/dashboard/underperformers', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'underperformers' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.get('/listings/:id/performance', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'performance' }));
router.get('/listings/:id/views', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'views' }));
router.get('/listings/:id/watchers', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'watchers' }));
router.get('/listings/:id/conversion', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'conversion' }));

// Categories (4)
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'detail' }));
router.get('/categories/:id/performance', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'performance' }));
router.get('/categories/:id/comparison', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'comparison' }));

// Reports (4)
router.get('/reports', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'list' }));
router.get('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'detail' }));
router.post('/reports/generate', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'generate' }));
router.post('/reports/schedule', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'schedule' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/roi', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'roi' }));
router.get('/analytics/seasonal', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'seasonal' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

