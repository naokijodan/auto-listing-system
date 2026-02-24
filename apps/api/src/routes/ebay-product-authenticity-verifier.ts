import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// products (6)
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/create', (_req: Request, res: Response) => res.json({ section: 'products', action: 'create' }));
router.get('/products/update', (_req: Request, res: Response) => res.json({ section: 'products', action: 'update' }));
router.get('/products/delete', (_req: Request, res: Response) => res.json({ section: 'products', action: 'delete' }));
router.get('/products/bulk', (_req: Request, res: Response) => res.json({ section: 'products', action: 'bulk' }));

// verifications (4)
router.get('/verifications/list', (_req: Request, res: Response) => res.json({ section: 'verifications', action: 'list' }));
router.get('/verifications/create', (_req: Request, res: Response) => res.json({ section: 'verifications', action: 'create' }));
router.get('/verifications/update', (_req: Request, res: Response) => res.json({ section: 'verifications', action: 'update' }));
router.get('/verifications/delete', (_req: Request, res: Response) => res.json({ section: 'verifications', action: 'delete' }));

// certificates (4)
router.get('/certificates/list', (_req: Request, res: Response) => res.json({ section: 'certificates', action: 'list' }));
router.get('/certificates/create', (_req: Request, res: Response) => res.json({ section: 'certificates', action: 'create' }));
router.get('/certificates/update', (_req: Request, res: Response) => res.json({ section: 'certificates', action: 'update' }));
router.get('/certificates/delete', (_req: Request, res: Response) => res.json({ section: 'certificates', action: 'delete' }));

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

