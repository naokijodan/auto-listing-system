import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Mentors (6)
router.get('/mentors', (_req: Request, res: Response) => res.json({ section: 'mentors', action: 'list' }));
router.get('/mentors/:id', (_req: Request, res: Response) => res.json({ section: 'mentors', action: 'detail' }));
router.post('/mentors', (_req: Request, res: Response) => res.json({ section: 'mentors', action: 'create' }));
router.put('/mentors/:id', (_req: Request, res: Response) => res.json({ section: 'mentors', action: 'update' }));
router.delete('/mentors/:id', (_req: Request, res: Response) => res.json({ section: 'mentors', action: 'delete' }));
router.post('/mentors/:id/process', (_req: Request, res: Response) => res.json({ section: 'mentors', action: 'process' }));

// Programs (4)
router.get('/programs', (_req: Request, res: Response) => res.json({ section: 'programs', action: 'list' }));
router.get('/programs/:id', (_req: Request, res: Response) => res.json({ section: 'programs', action: 'detail' }));
router.post('/programs', (_req: Request, res: Response) => res.json({ section: 'programs', action: 'create' }));
router.put('/programs/:id', (_req: Request, res: Response) => res.json({ section: 'programs', action: 'update' }));

// Sellers (4)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.post('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'create' }));
router.put('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'update' }));

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
