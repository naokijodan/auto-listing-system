import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/active-goals', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-goals' }));
router.get('/dashboard/progress', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'progress' }));
router.get('/dashboard/achievements', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'achievements' }));

// Goals (6)
router.get('/goals', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'list' }));
router.get('/goals/:id', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'detail' }));
router.post('/goals', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'create' }));
router.put('/goals/:id', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'update' }));
router.post('/goals/:id/complete', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'complete' }));
router.post('/goals/:id/archive', (_req: Request, res: Response) => res.json({ section: 'goals', action: 'archive' }));

// Milestones (4)
router.get('/milestones', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'list' }));
router.get('/milestones/:id', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'detail' }));
router.post('/milestones', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'create' }));
router.put('/milestones/:id', (_req: Request, res: Response) => res.json({ section: 'milestones', action: 'update' }));

// Progress (4)
router.get('/progress', (_req: Request, res: Response) => res.json({ section: 'progress', action: 'list' }));
router.get('/progress/:id', (_req: Request, res: Response) => res.json({ section: 'progress', action: 'detail' }));
router.put('/progress/:id', (_req: Request, res: Response) => res.json({ section: 'progress', action: 'update' }));
router.get('/progress/:id/history', (_req: Request, res: Response) => res.json({ section: 'progress', action: 'history' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/goal-completion-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'goal-completion-rate' }));
router.get('/analytics/performance-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'performance-trend' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

