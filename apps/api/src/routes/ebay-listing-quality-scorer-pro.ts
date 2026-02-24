import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/top-scored', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-scored' }));
router.get('/dashboard/low-scored', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'low-scored' }));
router.get('/dashboard/improvement-queue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'improvement-queue' }));

// Scores (6)
router.get('/scores', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'list' }));
router.get('/scores/:id', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'detail' }));
router.post('/scores/calculate', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'calculate' }));
router.post('/scores/bulk-calculate', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'bulk-calculate' }));
router.get('/scores/:id/history', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'history' }));
router.post('/scores/compare', (_req: Request, res: Response) => res.json({ section: 'scores', action: 'compare' }));

// Criteria (4)
router.get('/criteria', (_req: Request, res: Response) => res.json({ section: 'criteria', action: 'list' }));
router.get('/criteria/:id', (_req: Request, res: Response) => res.json({ section: 'criteria', action: 'detail' }));
router.post('/criteria', (_req: Request, res: Response) => res.json({ section: 'criteria', action: 'create' }));
router.put('/criteria/:id', (_req: Request, res: Response) => res.json({ section: 'criteria', action: 'update' }));

// Improvements (4)
router.get('/improvements', (_req: Request, res: Response) => res.json({ section: 'improvements', action: 'list' }));
router.get('/improvements/:id', (_req: Request, res: Response) => res.json({ section: 'improvements', action: 'detail' }));
router.post('/improvements/:id/apply', (_req: Request, res: Response) => res.json({ section: 'improvements', action: 'apply' }));
router.post('/improvements/bulk-apply', (_req: Request, res: Response) => res.json({ section: 'improvements', action: 'bulk-apply' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/score-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'score-distribution' }));
router.get('/analytics/improvement-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'improvement-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

