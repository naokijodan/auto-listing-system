import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/abandoned', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'abandoned' }));
router.get('/dashboard/recovered', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recovered' }));
router.get('/dashboard/revenue-impact', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'revenue-impact' }));

// Carts (6)
router.get('/carts/list', (_req: Request, res: Response) => res.json({ section: 'carts', action: 'list' }));
router.get('/carts/detail', (_req: Request, res: Response) => res.json({ section: 'carts', action: 'detail' }));
router.post('/carts/send-reminder', (_req: Request, res: Response) => res.json({ section: 'carts', action: 'send-reminder' }));
router.post('/carts/bulk-remind', (_req: Request, res: Response) => res.json({ section: 'carts', action: 'bulk-remind' }));
router.post('/carts/mark-recovered', (_req: Request, res: Response) => res.json({ section: 'carts', action: 'mark-recovered' }));
router.post('/carts/archive', (_req: Request, res: Response) => res.json({ section: 'carts', action: 'archive' }));

// Campaigns (4)
router.get('/campaigns/list', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'list' }));
router.get('/campaigns/detail', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'detail' }));
router.post('/campaigns/create', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'create' }));
router.put('/campaigns/update', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'update' }));

// Templates (4)
router.get('/templates/list', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/detail', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates/create', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/update', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/recovery-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'recovery-rate' }));
router.get('/analytics/revenue-recovered', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-recovered' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

