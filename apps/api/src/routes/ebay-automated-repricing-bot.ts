import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/active-bots, /dashboard/price-changes, /dashboard/win-rate
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-bots', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-bots' }));
router.get('/dashboard/price-changes', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'price-changes' }));
router.get('/dashboard/win-rate', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'win-rate' }));

// Bots (6): list, detail, create, update, activate, deactivate
router.get('/bots', (_req: Request, res: Response) => res.json({ section: 'bots', action: 'list' }));
router.get('/bots/:id', (_req: Request, res: Response) => res.json({ section: 'bots', action: 'detail' }));
router.post('/bots', (_req: Request, res: Response) => res.json({ section: 'bots', action: 'create' }));
router.put('/bots/:id', (_req: Request, res: Response) => res.json({ section: 'bots', action: 'update' }));
router.post('/bots/:id/activate', (_req: Request, res: Response) => res.json({ section: 'bots', action: 'activate' }));
router.post('/bots/:id/deactivate', (_req: Request, res: Response) => res.json({ section: 'bots', action: 'deactivate' }));

// Strategies (4): list, detail, create, update
router.get('/strategies', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'list' }));
router.get('/strategies/:id', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'detail' }));
router.post('/strategies', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'create' }));
router.put('/strategies/:id', (_req: Request, res: Response) => res.json({ section: 'strategies', action: 'update' }));

// History (4): list, detail, rollback, compare
router.get('/history', (_req: Request, res: Response) => res.json({ section: 'history', action: 'list' }));
router.get('/history/:id', (_req: Request, res: Response) => res.json({ section: 'history', action: 'detail' }));
router.post('/history/:id/rollback', (_req: Request, res: Response) => res.json({ section: 'history', action: 'rollback' }));
router.post('/history/compare', (_req: Request, res: Response) => res.json({ section: 'history', action: 'compare' }));

// Analytics (3): analytics, analytics/bot-performance, analytics/revenue-impact
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/bot-performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'bot-performance' }));
router.get('/analytics/revenue-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-impact' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

