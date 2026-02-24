import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// listings (6)
router.get('/listings/list', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/detail', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.get('/listings/create', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.get('/listings/update', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.get('/listings/delete', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'delete' }));
router.get('/listings/bulk', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk' }));

// urgency (4)
router.get('/urgency/list', (_req: Request, res: Response) => res.json({ section: 'urgency', action: 'list' }));
router.get('/urgency/create', (_req: Request, res: Response) => res.json({ section: 'urgency', action: 'create' }));
router.get('/urgency/update', (_req: Request, res: Response) => res.json({ section: 'urgency', action: 'update' }));
router.get('/urgency/delete', (_req: Request, res: Response) => res.json({ section: 'urgency', action: 'delete' }));

// campaigns (4)
router.get('/campaigns/list', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'list' }));
router.get('/campaigns/create', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'create' }));
router.get('/campaigns/update', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'update' }));
router.get('/campaigns/delete', (_req: Request, res: Response) => res.json({ section: 'campaigns', action: 'delete' }));

// analytics (3)
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));
router.get('/analytics/export', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'export' }));

// settings (2)
router.get('/settings/get', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.get('/settings/update', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// utilities (4)
router.get('/utilities/ping', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'ping' }));
router.get('/utilities/status', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'status' }));
router.get('/utilities/version', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'version' }));
router.get('/utilities/help', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'help' }));

export default router;

