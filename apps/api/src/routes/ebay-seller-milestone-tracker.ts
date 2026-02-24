import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// milestones (6)
router.get('/milestones/list', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'list' }));
router.get('/milestones/detail', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'detail' }));
router.get('/milestones/create', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'create' }));
router.get('/milestones/update', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'update' }));
router.get('/milestones/delete', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'delete' }));
router.get('/milestones/bulk', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'bulk' }));

// goals (4)
router.get('/goals/list', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'list' }));
router.get('/goals/create', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'create' }));
router.get('/goals/update', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'update' }));
router.get('/goals/delete', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'delete' }));

// rewards (4)
router.get('/rewards/list', (_req: Request, res: Response) => res.json({ section: 'rewards', action: 'list' }));
router.get('/rewards/create', (_req: Request, res: Response) => res.json({ section: 'rewards', action: 'create' }));
router.get('/rewards/update', (_req: Request, res: Response) => res.json({ section: 'rewards', action: 'update' }));
router.get('/rewards/delete', (_req: Request, res: Response) => res.json({ section: 'rewards', action: 'delete' }));

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

