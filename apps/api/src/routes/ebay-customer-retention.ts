import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Theme: pink-600

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/summary' }));
router.get('/dashboard/at-risk', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/at-risk' }));
router.get('/dashboard/churned', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/churned' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', route: '/dashboard/trends' }));

// Customers (6): list + detail + segment + score + export + refresh
router.get('/customers', (_req: Request, res: Response) => res.json({ section: 'customers', action: 'list' }));
router.get('/customers/:id', (req: Request, res: Response) => res.json({ section: 'customers', action: 'detail', id: req.params.id }));
router.get('/customers/segment', (_req: Request, res: Response) => res.json({ section: 'customers', action: 'segment' }));
router.get('/customers/score', (_req: Request, res: Response) => res.json({ section: 'customers', action: 'score' }));
router.post('/customers/export', (_req: Request, res: Response) => res.json({ section: 'customers', action: 'export' }));
router.post('/customers/refresh', (_req: Request, res: Response) => res.json({ section: 'customers', action: 'refresh' }));

// Campaigns (4)
router.get('/campaigns', (_req: Request, res: Response) => res.json({ section: 'campaigns', route: '/campaigns' }));
router.get('/campaigns/:id', (req: Request, res: Response) => res.json({ section: 'campaigns', route: '/campaigns/:id', id: req.params.id }));
router.post('/campaigns/create', (_req: Request, res: Response) => res.json({ section: 'campaigns', route: '/campaigns/create' }));
router.post('/campaigns/launch', (_req: Request, res: Response) => res.json({ section: 'campaigns', route: '/campaigns/launch' }));

// Actions (4)
router.get('/actions', (_req: Request, res: Response) => res.json({ section: 'actions', route: '/actions' }));
router.get('/actions/:id', (req: Request, res: Response) => res.json({ section: 'actions', route: '/actions/:id', id: req.params.id }));
router.post('/actions/create', (_req: Request, res: Response) => res.json({ section: 'actions', route: '/actions/create' }));
router.post('/actions/trigger', (_req: Request, res: Response) => res.json({ section: 'actions', route: '/actions/trigger' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics' }));
router.get('/analytics/retention-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/retention-rate' }));
router.get('/analytics/lifetime-value', (_req: Request, res: Response) => res.json({ section: 'analytics', route: '/analytics/lifetime-value' }));

// Settings (2) GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ util: 'health', status: 'ok' }));
router.post('/export', (_req: Request, res: Response) => res.json({ util: 'export', status: 'queued' }));
router.post('/import', (_req: Request, res: Response) => res.json({ util: 'import', status: 'queued' }));
router.post('/recalculate', (_req: Request, res: Response) => res.json({ util: 'recalculate', status: 'started' }));

export default router;

