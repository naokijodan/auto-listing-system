import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Predictions (6)
router.get('/predictions', (_req: Request, res: Response) => res.json({ section: 'predictions', action: 'list' }));
router.get('/predictions/:id', (_req: Request, res: Response) => res.json({ section: 'predictions', action: 'detail' }));
router.post('/predictions', (_req: Request, res: Response) => res.json({ section: 'predictions', action: 'create' }));
router.put('/predictions/:id', (_req: Request, res: Response) => res.json({ section: 'predictions', action: 'update' }));
router.delete('/predictions/:id', (_req: Request, res: Response) => res.json({ section: 'predictions', action: 'delete' }));
router.post('/predictions/:id/process', (_req: Request, res: Response) => res.json({ section: 'predictions', action: 'process' }));

// Models (4)
router.get('/models', (_req: Request, res: Response) => res.json({ section: 'models', action: 'list' }));
router.get('/models/:id', (_req: Request, res: Response) => res.json({ section: 'models', action: 'detail' }));
router.post('/models', (_req: Request, res: Response) => res.json({ section: 'models', action: 'create' }));
router.put('/models/:id', (_req: Request, res: Response) => res.json({ section: 'models', action: 'update' }));

// Forecasts (4)
router.get('/forecasts', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'list' }));
router.get('/forecasts/:id', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'detail' }));
router.post('/forecasts', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'create' }));
router.put('/forecasts/:id', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'update' }));

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
