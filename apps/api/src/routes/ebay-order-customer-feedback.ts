import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/pending-responses', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending-responses' }));
router.get('/dashboard/satisfaction', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'satisfaction' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/pending', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'pending' }));
router.get('/orders/late', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'late' }));
router.get('/orders/cancelled', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'cancelled' }));
router.get('/orders/with-issues', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'with-issues' }));
router.get('/orders/returns', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'returns' }));

// Feedback (4)
router.get('/feedback', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'list' }));
router.get('/feedback/recent', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'recent' }));
router.get('/feedback/negative', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'negative' }));
router.get('/feedback/positive', (_req: Request, res: Response) => res.json({ section: 'feedback', action: 'positive' }));

// Responses (4)
router.get('/responses', (_req: Request, res: Response) => res.json({ section: 'responses', action: 'list' }));
router.get('/responses/templates', (_req: Request, res: Response) => res.json({ section: 'responses', action: 'templates' }));
router.post('/responses/send', (_req: Request, res: Response) => res.json({ section: 'responses', action: 'send' }));
router.get('/responses/history', (_req: Request, res: Response) => res.json({ section: 'responses', action: 'history' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/ratings-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'ratings-trend' }));
router.get('/analytics/impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

