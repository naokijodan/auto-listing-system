import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Theme: fuchsia-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/summary' }));
router.get('/dashboard/markets', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/markets' }));
router.get('/dashboard/opportunities', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/opportunities' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/trends' }));

// Markets (6): CRUD + analyze + expand
router.get('/markets', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'list' }));
router.get('/markets/:id', (req: Request, res: Response) => res.json({ section: 'markets', action: 'detail', id: req.params.id }));
router.post('/markets/create', (_req: Request, res: Response) => res.json({ section: 'markets', action: 'create' }));
router.put('/markets/:id', (req: Request, res: Response) => res.json({ section: 'markets', action: 'update', id: req.params.id }));
router.delete('/markets/:id', (req: Request, res: Response) => res.json({ section: 'markets', action: 'delete', id: req.params.id }));
router.post('/markets/:id/analyze', (req: Request, res: Response) => res.json({ section: 'markets', action: 'analyze', id: req.params.id }));
router.post('/markets/:id/expand', (req: Request, res: Response) => res.json({ section: 'markets', action: 'expand', id: req.params.id }));

// Translations (4)
router.get('/translations', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'list' }));
router.get('/translations/:id', (req: Request, res: Response) => res.json({ section: 'translations', action: 'detail', id: req.params.id }));
router.post('/translations/auto', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'auto' }));
router.post('/translations/review', (_req: Request, res: Response) => res.json({ section: 'translations', action: 'review' }));

// Pricing (4)
router.get('/pricing', (_req: Request, res: Response) => res.json({ section: 'pricing', action: 'list' }));
router.get('/pricing/:id', (req: Request, res: Response) => res.json({ section: 'pricing', action: 'detail', id: req.params.id }));
router.post('/pricing/convert', (_req: Request, res: Response) => res.json({ section: 'pricing', action: 'convert' }));
router.post('/pricing/optimize', (_req: Request, res: Response) => res.json({ section: 'pricing', action: 'optimize' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/performance' }));
router.get('/analytics/competition', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/competition' }));

// Settings (2) GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ util: 'health', status: 'ok' }));
router.post('/export', (_req: Request, res: Response) => res.json({ util: 'export', status: 'queued' }));
router.post('/import', (_req: Request, res: Response) => res.json({ util: 'import', status: 'queued' }));
router.post('/sync-all', (_req: Request, res: Response) => res.json({ util: 'sync-all', status: 'started' }));

export default router;
