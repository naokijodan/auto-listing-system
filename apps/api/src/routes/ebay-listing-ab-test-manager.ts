import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-tests', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-tests' }));
router.get('/dashboard/results', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'results' }));
router.get('/dashboard/winners', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'winners' }));

// Tests (6)
router.get('/tests', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'list' }));
router.get('/tests/:id', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'detail' }));
router.post('/tests', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'create' }));
router.put('/tests/:id', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'update' }));
router.post('/tests/:id/start', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'start' }));
router.post('/tests/:id/stop', (_req: Request, res: Response) => res.json({ section: 'tests', action: 'stop' }));

// Variants (4)
router.get('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'list' }));
router.get('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'detail' }));
router.post('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'create' }));
router.put('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'update' }));

// Results (4)
router.get('/results', (_req: Request, res: Response) => res.json({ section: 'results', action: 'list' }));
router.get('/results/:id', (_req: Request, res: Response) => res.json({ section: 'results', action: 'detail' }));
router.post('/results/compare', (_req: Request, res: Response) => res.json({ section: 'results', action: 'compare' }));
router.get('/results/export', (_req: Request, res: Response) => res.json({ section: 'results', action: 'export' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/conversion-lift', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion-lift' }));
router.get('/analytics/statistical-significance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'statistical-significance' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/archive', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'archive' }));

export default router;

