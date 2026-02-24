import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/scheduled', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'scheduled' }));
router.get('/dashboard/favorites', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'favorites' }));

// Reports (6): list, detail, create, update, generate, delete
router.get('/reports', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'list' }));
router.get('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'detail' }));
router.post('/reports', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'create' }));
router.put('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'update' }));
router.post('/reports/:id/generate', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'generate' }));
router.delete('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'delete' }));

// Templates (4): list, detail, create, update
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Schedules (4): list, detail, create, update
router.get('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.get('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'detail' }));
router.post('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));

// Analytics (3): analytics, analytics/usage, analytics/popular-metrics
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/usage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'usage' }));
router.get('/analytics/popular-metrics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'popular-metrics' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, share
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/share', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'share' }));

export default router;

