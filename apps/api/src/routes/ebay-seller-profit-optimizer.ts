import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.post('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'create' }));
router.put('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'update' }));
router.delete('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'delete' }));
router.post('/sellers/:id/process', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'process' }));

// Profits (4)
router.get('/profits', (_req: Request, res: Response) => res.json({ section: 'profits', action: 'list' }));
router.get('/profits/:id', (_req: Request, res: Response) => res.json({ section: 'profits', action: 'detail' }));
router.post('/profits', (_req: Request, res: Response) => res.json({ section: 'profits', action: 'create' }));
router.put('/profits/:id', (_req: Request, res: Response) => res.json({ section: 'profits', action: 'update' }));

// Strategies (4)
router.get('/strategies', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'list' }));
router.get('/strategies/:id', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'detail' }));
router.post('/strategies', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'create' }));
router.put('/strategies/:id', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
