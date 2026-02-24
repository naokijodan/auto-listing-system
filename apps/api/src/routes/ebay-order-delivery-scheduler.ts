import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/widgets', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'widgets' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));
router.get('/dashboard/insights', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'insights' }));

// Orders (6)
router.get('/orders/overview', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'overview' }));
router.get('/orders/list', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/detail', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders/create', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.put('/orders/update', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.delete('/orders/delete', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'delete' }));

// Schedules (4)
router.get('/schedules/overview', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'overview' }));
router.get('/schedules/list', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.post('/schedules/create', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/update', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));

// Routes (4)
router.get('/routes/overview', (_req: Request, res: Response) => res.json({ section: 'routes', action: 'overview' }));
router.get('/routes/list', (_req: Request, res: Response) => res.json({ section: 'routes', action: 'list' }));
router.post('/routes/create', (_req: Request, res: Response) => res.json({ section: 'routes', action: 'create' }));
router.put('/routes/update', (_req: Request, res: Response) => res.json({ section: 'routes', action: 'update' }));

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

