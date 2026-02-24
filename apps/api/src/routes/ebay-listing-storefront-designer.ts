import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Views (6)
router.get('/views', (_req: Request, res: Response) => res.json({ section: 'views', action: 'list' }));
router.get('/views/:id', (_req: Request, res: Response) => res.json({ section: 'views', action: 'detail' }));
router.post('/views', (_req: Request, res: Response) => res.json({ section: 'views', action: 'create' }));
router.put('/views/:id', (_req: Request, res: Response) => res.json({ section: 'views', action: 'update' }));
router.delete('/views/:id', (_req: Request, res: Response) => res.json({ section: 'views', action: 'delete' }));
router.post('/views/:id/process', (_req: Request, res: Response) => res.json({ section: 'views', action: 'process' }));

// Media (4)
router.get('/media', (_req: Request, res: Response) => res.json({ section: 'media', action: 'list' }));
router.get('/media/:id', (_req: Request, res: Response) => res.json({ section: 'media', action: 'detail' }));
router.post('/media', (_req: Request, res: Response) => res.json({ section: 'media', action: 'create' }));
router.put('/media/:id', (_req: Request, res: Response) => res.json({ section: 'media', action: 'update' }));

// Renders (4)
router.get('/renders', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'list' }));
router.get('/renders/:id', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'detail' }));
router.post('/renders', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'create' }));
router.put('/renders/:id', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'update' }));

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
