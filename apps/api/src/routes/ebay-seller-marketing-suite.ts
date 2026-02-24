import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/kpis', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'kpis' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));
router.get('/dashboard/audience', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'audience' }));

// Sellers (6)
router.get('/sellers/list', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/detail', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.get('/sellers/segments', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'segments' }));
router.post('/sellers/tags', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'tags' }));
router.put('/sellers/preferences', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'preferences' }));
router.get('/sellers/audiences', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'audiences' }));

// Marketing (4)
router.get('/marketing/strategies', (_req: Request, res: Response) => res.json({ section: 'marketing', action: 'strategies' }));
router.get('/marketing/assets', (_req: Request, res: Response) => res.json({ section: 'marketing', action: 'assets' }));
router.post('/marketing/messages', (_req: Request, res: Response) => res.json({ section: 'marketing', action: 'messages' }));
router.put('/marketing/budgets', (_req: Request, res: Response) => res.json({ section: 'marketing', action: 'budgets' }));

// Campaigns (4)
router.get('/campaigns/list', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'list' }));
router.get('/campaigns/detail', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'detail' }));
router.post('/campaigns/create', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'create' }));
router.put('/campaigns/update', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/roi', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'roi' }));
router.get('/analytics/engagement', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'engagement' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

