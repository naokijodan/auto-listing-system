import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/ranking', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'ranking' }));
router.get('/dashboard/peers', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'peers' }));
router.get('/dashboard/gaps', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'gaps' }));

// Benchmarks (6)
router.get('/benchmarks/list', (_req: Request, res: Response) => res.json({ section: 'benchmarks', action: 'list' }));
router.get('/benchmarks/detail', (_req: Request, res: Response) => res.json({ section: 'benchmarks', action: 'detail' }));
router.post('/benchmarks/create', (_req: Request, res: Response) => res.json({ section: 'benchmarks', action: 'create' }));
router.put('/benchmarks/update', (_req: Request, res: Response) => res.json({ section: 'benchmarks', action: 'update' }));
router.post('/benchmarks/run', (_req: Request, res: Response) => res.json({ section: 'benchmarks', action: 'run' }));
router.post('/benchmarks/compare', (_req: Request, res: Response) => res.json({ section: 'benchmarks', action: 'compare' }));

// Peers (4)
router.get('/peers/list', (_req: Request, res: Response) => res.json({ section: 'peers', action: 'list' }));
router.get('/peers/detail', (_req: Request, res: Response) => res.json({ section: 'peers', action: 'detail' }));
router.post('/peers/add', (_req: Request, res: Response) => res.json({ section: 'peers', action: 'add' }));
router.post('/peers/remove', (_req: Request, res: Response) => res.json({ section: 'peers', action: 'remove' }));

// Metrics (4)
router.get('/metrics/list', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'list' }));
router.get('/metrics/detail', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'detail' }));
router.get('/metrics/history', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'history' }));
router.post('/metrics/targets', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'targets' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/ranking-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'ranking-trend' }));
router.get('/analytics/improvement-areas', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'improvement-areas' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

