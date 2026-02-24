import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/widgets', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'widgets' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));
router.get('/dashboard/insights', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'insights' }));

// Inventory (6)
router.get('/inventory/overview', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'overview' }));
router.get('/inventory/list', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/detail', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory/create', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'create' }));
router.put('/inventory/update', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'update' }));
router.delete('/inventory/delete', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'delete' }));

// Damages (4)
router.get('/damages/overview', (_req: Request, res: Response) => res.json({ section: 'damages', action: 'overview' }));
router.get('/damages/list', (_req: Request, res: Response) => res.json({ section: 'damages', action: 'list' }));
router.post('/damages/report', (_req: Request, res: Response) => res.json({ section: 'damages', action: 'report' }));
router.put('/damages/update', (_req: Request, res: Response) => res.json({ section: 'damages', action: 'update' }));

// Claims (4)
router.get('/claims/overview', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'overview' }));
router.get('/claims/list', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'list' }));
router.post('/claims/create', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'create' }));
router.put('/claims/update', (_req: Request, res: Response) => res.json({ section: 'claims', action: 'update' }));

// Analytics (3)
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance' }));
router.get('/analytics/summary', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'summary' }));

// Settings (2)
router.get('/settings/get', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings/put', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

