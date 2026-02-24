import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// orders (6)
router.get('/orders/list', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/detail', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.get('/orders/create', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.get('/orders/update', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.get('/orders/delete', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'delete' }));
router.get('/orders/bulk', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'bulk' }));

// signatures (4)
router.get('/signatures/list', (_req: Request, res: Response) => res.json({ section: 'signatures', action: 'list' }));
router.get('/signatures/create', (_req: Request, res: Response) => res.json({ section: 'signatures', action: 'create' }));
router.get('/signatures/update', (_req: Request, res: Response) => res.json({ section: 'signatures', action: 'update' }));
router.get('/signatures/delete', (_req: Request, res: Response) => res.json({ section: 'signatures', action: 'delete' }));

// confirmations (4)
router.get('/confirmations/list', (_req: Request, res: Response) => res.json({ section: 'confirmations', action: 'list' }));
router.get('/confirmations/create', (_req: Request, res: Response) => res.json({ section: 'confirmations', action: 'create' }));
router.get('/confirmations/update', (_req: Request, res: Response) => res.json({ section: 'confirmations', action: 'update' }));
router.get('/confirmations/delete', (_req: Request, res: Response) => res.json({ section: 'confirmations', action: 'delete' }));

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

