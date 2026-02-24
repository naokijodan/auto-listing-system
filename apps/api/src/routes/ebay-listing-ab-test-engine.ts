import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-experiments', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-experiments' }));
router.get('/dashboard/results', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'results' }));
router.get('/dashboard/winners', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'winners' }));

// Experiments (6)
router.get('/experiments', (_req: Request, res: Response) => res.json({ section: 'experiments', action: 'list' }));
router.get('/experiments/:id', (_req: Request, res: Response) => res.json({ section: 'experiments', action: 'detail' }));
router.post('/experiments', (_req: Request, res: Response) => res.json({ section: 'experiments', action: 'create' }));
router.put('/experiments/:id', (_req: Request, res: Response) => res.json({ section: 'experiments', action: 'update' }));
router.post('/experiments/:id/start', (_req: Request, res: Response) => res.json({ section: 'experiments', action: 'start' }));
router.post('/experiments/:id/stop', (_req: Request, res: Response) => res.json({ section: 'experiments', action: 'stop' }));

// Variants (4)
router.get('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'list' }));
router.get('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'detail' }));
router.post('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'create' }));
router.put('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'update' }));

// Metrics (4)
router.get('/metrics', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'list' }));
router.get('/metrics/:id', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'detail' }));
router.post('/metrics', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'create' }));
router.put('/metrics/:id', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/conversion-lift', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion-lift' }));
router.get('/analytics/significance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'significance' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/archive', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'archive' }));

export default router;

