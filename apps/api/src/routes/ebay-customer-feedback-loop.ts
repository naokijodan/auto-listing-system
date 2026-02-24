import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/sentiment', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'sentiment' }));
router.get('/dashboard/action-items', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'action-items' }));

// Feedback (6)
router.get('/feedback/list', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'list' }));
router.get('/feedback/detail', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'detail' }));
router.post('/feedback/respond', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'respond' }));
router.post('/feedback/escalate', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'escalate' }));
router.post('/feedback/categorize', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'categorize' }));
router.post('/feedback/bulk-respond', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'bulk-respond' }));

// Surveys (4)
router.get('/surveys/list', (_req: Request, res: Response) => res.json({ section: 'surveys', action: 'list' }));
router.get('/surveys/detail', (_req: Request, res: Response) => res.json({ section: 'surveys', action: 'detail' }));
router.post('/surveys/create', (_req: Request, res: Response) => res.json({ section: 'surveys', action: 'create' }));
router.post('/surveys/send', (_req: Request, res: Response) => res.json({ section: 'surveys', action: 'send' }));

// Actions (4)
router.get('/actions/list', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'list' }));
router.get('/actions/detail', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'detail' }));
router.post('/actions/create', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'create' }));
router.post('/actions/resolve', (_req: Request, res: Response) => res.json({ section: 'actions', action: 'resolve' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/sentiment-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sentiment-trend' }));
router.get('/analytics/nps-score', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'nps-score' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

