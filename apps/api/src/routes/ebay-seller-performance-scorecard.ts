import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'score' }));
router.get('/dashboard/badges', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'badges' }));
router.get('/dashboard/history', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'history' }));

// Scores (6)
router.get('/scores', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'list' }));
router.get('/scores/detail', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'detail' }));
router.get('/scores/calculate', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'calculate' }));
router.get('/scores/compare', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'compare' }));
router.get('/scores/benchmark', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'benchmark' }));
router.get('/scores/history', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'history' }));

// Metrics (4)
router.get('/metrics', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'list' }));
router.get('/metrics/detail', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'detail' }));
router.get('/metrics/breakdown', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'breakdown' }));
router.get('/metrics/trends', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'trends' }));

// Goals (4)
router.get('/goals', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'list' }));
router.get('/goals/detail', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'detail' }));
router.get('/goals/create', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'create' }));
router.get('/goals/update', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/score-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'score-trend' }));
router.get('/analytics/peer-comparison', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'peer-comparison' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.get('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

