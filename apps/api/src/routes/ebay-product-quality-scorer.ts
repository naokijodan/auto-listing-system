import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/dashboard/trends', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'trends' }));
router.get('/dashboard/top-products', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-products' }));

// Products (6)
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/:id', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.get('/products/low-score', (_req: Request, res: Response) => res.json({ section: 'products', action: 'low-score' }));
router.get('/products/high-score', (_req: Request, res: Response) => res.json({ section: 'products', action: 'high-score' }));
router.get('/products/reviews', (_req: Request, res: Response) => res.json({ section: 'products', action: 'reviews' }));
router.get('/products/images', (_req: Request, res: Response) => res.json({ section: 'products', action: 'images' }));

// Quality (4)
router.get('/quality/criteria', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'criteria' }));
router.get('/quality/checklist', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'checklist' }));
router.post('/quality/assess', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'assess' }));
router.get('/quality/history', (_req: Request, res: Response) => res.json({ section: 'quality', action: 'history' }));

// Scoring (4)
router.get('/scoring/model', (_req: Request, res: Response) => res.json({ section: 'scoring', action: 'model' }));
router.post('/scoring/run', (_req: Request, res: Response) => res.json({ section: 'scoring', action: 'run' }));
router.post('/scoring/retrain', (_req: Request, res: Response) => res.json({ section: 'scoring', action: 'retrain' }));
router.get('/scoring/explanations', (_req: Request, res: Response) => res.json({ section: 'scoring', action: 'explanations' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/score-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'score-trend' }));
router.get('/analytics/impact-on-sales', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'impact-on-sales' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

