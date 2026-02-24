import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// integrations (6)
router.get('/integrations/list', (_req: Request, res: Response) => res.json({ section: 'integrations', action: 'list' }));
router.get('/integrations/detail', (_req: Request, res: Response) => res.json({ section: 'integrations', action: 'detail' }));
router.get('/integrations/create', (_req: Request, res: Response) => res.json({ section: 'integrations', action: 'create' }));
router.get('/integrations/update', (_req: Request, res: Response) => res.json({ section: 'integrations', action: 'update' }));
router.get('/integrations/delete', (_req: Request, res: Response) => res.json({ section: 'integrations', action: 'delete' }));
router.get('/integrations/bulk', (_req: Request, res: Response) => res.json({ section: 'integrations', action: 'bulk' }));

// apis (4)
router.get('/apis/list', (_req: Request, res: Response) => res.json({ section: 'apis', action: 'list' }));
router.get('/apis/create', (_req: Request, res: Response) => res.json({ section: 'apis', action: 'create' }));
router.get('/apis/update', (_req: Request, res: Response) => res.json({ section: 'apis', action: 'update' }));
router.get('/apis/delete', (_req: Request, res: Response) => res.json({ section: 'apis', action: 'delete' }));

// webhooks (4)
router.get('/webhooks/list', (_req: Request, res: Response) => res.json({ section: 'webhooks', action: 'list' }));
router.get('/webhooks/create', (_req: Request, res: Response) => res.json({ section: 'webhooks', action: 'create' }));
router.get('/webhooks/update', (_req: Request, res: Response) => res.json({ section: 'webhooks', action: 'update' }));
router.get('/webhooks/delete', (_req: Request, res: Response) => res.json({ section: 'webhooks', action: 'delete' }));

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

