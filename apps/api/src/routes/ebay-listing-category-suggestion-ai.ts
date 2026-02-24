import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Categories (6)
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'detail' }));
router.post('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'create' }));
router.put('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'update' }));
router.delete('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'delete' }));
router.post('/categories/:id/process', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'process' }));

// Suggestions (4)
router.get('/suggestions', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'list' }));
router.get('/suggestions/:id', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'detail' }));
router.post('/suggestions', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'create' }));
router.put('/suggestions/:id', (_req: Request, res: Response) => res.json({ section: 'suggestions', action: 'update' }));

// AI (4)
router.get('/ai', (_req: Request, res: Response) => res.json({ section: 'ai', action: 'list' }));
router.get('/ai/:id', (_req: Request, res: Response) => res.json({ section: 'ai', action: 'detail' }));
router.post('/ai', (_req: Request, res: Response) => res.json({ section: 'ai', action: 'create' }));
router.put('/ai/:id', (_req: Request, res: Response) => res.json({ section: 'ai', action: 'update' }));

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
