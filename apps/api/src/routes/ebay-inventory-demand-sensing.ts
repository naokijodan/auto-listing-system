import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'create' }));
router.put('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'update' }));
router.delete('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'delete' }));
router.post('/inventory/:id/adjust', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'adjust' }));

// Demands (4)
router.get('/demands', (_req: Request, res: Response) => res.json({ section: 'demands', action: 'list' }));
router.get('/demands/:id', (_req: Request, res: Response) => res.json({ section: 'demands', action: 'detail' }));
router.post('/demands', (_req: Request, res: Response) => res.json({ section: 'demands', action: 'create' }));
router.put('/demands/:id', (_req: Request, res: Response) => res.json({ section: 'demands', action: 'update' }));

// Signals (4)
router.get('/signals', (_req: Request, res: Response) => res.json({ section: 'signals', action: 'list' }));
router.get('/signals/:id', (_req: Request, res: Response) => res.json({ section: 'signals', action: 'detail' }));
router.post('/signals', (_req: Request, res: Response) => res.json({ section: 'signals', action: 'create' }));
router.put('/signals/:id', (_req: Request, res: Response) => res.json({ section: 'signals', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/demand-forecast', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'demand-forecast' }));
router.get('/analytics/signal-accuracy', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'signal-accuracy' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
