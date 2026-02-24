import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.delete('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'delete' }));
router.post('/listings/:id/process', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'process' }));

// Sales (4)
router.get('/sales', (_req: Request, res: Response) => res.json({ section: 'sales', action: 'list' }));
router.get('/sales/:id', (_req: Request, res: Response) => res.json({ section: 'sales', action: 'detail' }));
router.post('/sales', (_req: Request, res: Response) => res.json({ section: 'sales', action: 'create' }));
router.put('/sales/:id', (_req: Request, res: Response) => res.json({ section: 'sales', action: 'update' }));

// Schedules (4)
router.get('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.get('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'detail' }));
router.post('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
