import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'main' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/score', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'score' }));
router.get('/dashboard/risks', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'risks' }));
router.get('/dashboard/recommendations', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recommendations' }));

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.get('/sellers/:id/score', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'score' }));
router.post('/sellers/:id/review', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'review' }));
router.get('/sellers/benchmarks', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'benchmarks' }));
router.get('/sellers/alerts', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'alerts' }));

// Health (4)
router.get('/health-status', (_req: Request, res: Response) => res.json({ section: 'health', action: 'status' }));
router.get('/health-issues', (_req: Request, res: Response) => res.json({ section: 'health', action: 'issues' }));
router.post('/health-remediation', (_req: Request, res: Response) => res.json({ section: 'health', action: 'remediation' }));
router.get('/health-history', (_req: Request, res: Response) => res.json({ section: 'health', action: 'history' }));

// Metrics (4)
router.get('/metrics', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'list' }));
router.get('/metrics/trends', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'trends' }));
router.get('/metrics/distribution', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'distribution' }));
router.get('/metrics/benchmarks', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'benchmarks' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'main' }));
router.get('/analytics/health-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'health-trend' }));
router.get('/analytics/risk-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'risk-distribution' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
