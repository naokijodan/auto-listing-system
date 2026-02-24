import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// vendors (6)
router.get('/vendors/list', (_req: Request, res: Response) => res.json({ section: 'vendors', action: 'list' }));
router.get('/vendors/detail', (_req: Request, res: Response) => res.json({ section: 'vendors', action: 'detail' }));
router.get('/vendors/create', (_req: Request, res: Response) => res.json({ section: 'vendors', action: 'create' }));
router.get('/vendors/update', (_req: Request, res: Response) => res.json({ section: 'vendors', action: 'update' }));
router.get('/vendors/delete', (_req: Request, res: Response) => res.json({ section: 'vendors', action: 'delete' }));
router.get('/vendors/bulk', (_req: Request, res: Response) => res.json({ section: 'vendors', action: 'bulk' }));

// scores (4)
router.get('/scores/list', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'list' }));
router.get('/scores/create', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'create' }));
router.get('/scores/update', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'update' }));
router.get('/scores/delete', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'delete' }));

// reviews (4)
router.get('/reviews/list', (_req: Request, res: Response) => res.json({ section: 'reviews', action: 'list' }));
router.get('/reviews/create', (_req: Request, res: Response) => res.json({ section: 'reviews', action: 'create' }));
router.get('/reviews/update', (_req: Request, res: Response) => res.json({ section: 'reviews', action: 'update' }));
router.get('/reviews/delete', (_req: Request, res: Response) => res.json({ section: 'reviews', action: 'delete' }));

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

