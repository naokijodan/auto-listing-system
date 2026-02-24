import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.post('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'create' }));
router.put('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'update' }));
router.delete('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'delete' }));
router.post('/sellers/:id/process', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'process' }));

// Reports (4)
router.get('/reports', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'list' }));
router.get('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'detail' }));
router.post('/reports', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'create' }));
router.put('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'update' }));

// Visualizations (4)
router.get('/visualizations', (_req: Request, res: Response) => res.json({ section: 'visualizations', action: 'list' }));
router.get('/visualizations/:id', (_req: Request, res: Response) => res.json({ section: 'visualizations', action: 'detail' }));
router.post('/visualizations', (_req: Request, res: Response) => res.json({ section: 'visualizations', action: 'create' }));
router.put('/visualizations/:id', (_req: Request, res: Response) => res.json({ section: 'visualizations', action: 'update' }));

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
