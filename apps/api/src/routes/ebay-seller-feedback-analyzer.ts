import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/positive', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'positive' }));
router.get('/dashboard/negative', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'negative' }));
router.get('/dashboard/neutral', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'neutral' }));

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.get('/sellers/:id/feedbacks', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'feedbacks' }));
router.get('/sellers/:id/score', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'score' }));
router.get('/sellers/:id/alerts', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'alerts' }));
router.get('/sellers/:id/history', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'history' }));

// Feedbacks (4)
router.get('/feedbacks', (_req: Request, res: Response) => res.json({ section: 'feedbacks', action: 'list' }));
router.get('/feedbacks/:id', (_req: Request, res: Response) => res.json({ section: 'feedbacks', action: 'detail' }));
router.post('/feedbacks/:id/analyze', (_req: Request, res: Response) => res.json({ section: 'feedbacks', action: 'analyze' }));
router.post('/feedbacks/:id/respond', (_req: Request, res: Response) => res.json({ section: 'feedbacks', action: 'respond' }));

// Trends (4)
router.get('/trends', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'list' }));
router.get('/trends/:id', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'detail' }));
router.post('/trends/analyze', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'analyze' }));
router.post('/trends/compare', (_req: Request, res: Response) => res.json({ section: 'trends', action: 'compare' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/sentiment-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sentiment-trend' }));
router.get('/analytics/response-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'response-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
