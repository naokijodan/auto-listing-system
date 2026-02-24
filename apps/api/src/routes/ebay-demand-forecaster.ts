import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/forecasts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'forecasts' }));
router.get('/dashboard/accuracy', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'accuracy' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Forecasts (6)
router.get('/forecasts', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'list' }));
router.get('/forecasts/:id', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'detail' }));
router.post('/forecasts', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'create' }));
router.put('/forecasts/:id', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'update' }));
router.post('/forecasts/:id/run', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'run' }));
router.post('/forecasts/compare', (_req: Request, res: Response) => res.json({ section: 'forecasts', action: 'compare' }));

// Products (4)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/:id/demand-history', (_req: Request, res: Response) => res.json({ section: 'products', action: 'demand-history' }));
router.get('/products/:id/seasonality', (_req: Request, res: Response) => res.json({ section: 'products', action: 'seasonality' }));

// Models (4)
router.get('/models', (_req: Request, res: Response) => res.json({ section: 'models', action: 'list' }));
router.get('/models/:id', (_req: Request, res: Response) => res.json({ section: 'models', action: 'detail' }));
router.post('/models/:id/train', (_req: Request, res: Response) => res.json({ section: 'models', action: 'train' }));
router.post('/models/:id/evaluate', (_req: Request, res: Response) => res.json({ section: 'models', action: 'evaluate' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/accuracy', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'accuracy' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

