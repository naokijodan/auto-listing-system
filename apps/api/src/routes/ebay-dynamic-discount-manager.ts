import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active' }));
router.get('/dashboard/scheduled', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'scheduled' }));
router.get('/dashboard/expired', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expired' }));

// Discounts (6): list, detail, create, update, activate, deactivate
router.get('/discounts', (_req: Request, res: Response) => res.json({ section: 'discounts', action: 'list' }));
router.get('/discounts/list', (_req: Request, res: Response) => res.json({ section: 'discounts', action: 'list' }));
router.get('/discounts/detail', (_req: Request, res: Response) => res.json({ section: 'discounts', action: 'detail' }));
router.post('/discounts/create', (_req: Request, res: Response) => res.json({ section: 'discounts', action: 'create' }));
router.put('/discounts/update', (_req: Request, res: Response) => res.json({ section: 'discounts', action: 'update' }));
router.post('/discounts/activate', (_req: Request, res: Response) => res.json({ section: 'discounts', action: 'activate' }));
router.post('/discounts/deactivate', (_req: Request, res: Response) => res.json({ section: 'discounts', action: 'deactivate' }));

// Rules (4): list, detail, create, update
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/list', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/detail', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/update', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Campaigns (4): list, detail, create, schedule
router.get('/campaigns', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'list' }));
router.get('/campaigns/list', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'list' }));
router.get('/campaigns/detail', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'detail' }));
router.post('/campaigns/create', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'create' }));
router.post('/campaigns/schedule', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'schedule' }));

// Analytics (3): analytics, analytics/discount-impact, analytics/revenue-comparison
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/discount-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'discount-impact' }));
router.get('/analytics/revenue-comparison', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-comparison' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
