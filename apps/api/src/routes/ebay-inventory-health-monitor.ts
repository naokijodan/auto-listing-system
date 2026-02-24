import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/healthy', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'healthy' }));
router.get('/dashboard/at-risk', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'at-risk' }));
router.get('/dashboard/critical', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'critical' }));

// Products (6): list, detail, diagnose, treat, bulk-diagnose, history
router.get('/products', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/list', (_req: Request, res: Response) => res.json({ section: 'products', action: 'list' }));
router.get('/products/detail', (_req: Request, res: Response) => res.json({ section: 'products', action: 'detail' }));
router.post('/products/diagnose', (_req: Request, res: Response) => res.json({ section: 'products', action: 'diagnose' }));
router.post('/products/treat', (_req: Request, res: Response) => res.json({ section: 'products', action: 'treat' }));
router.post('/products/bulk-diagnose', (_req: Request, res: Response) => res.json({ section: 'products', action: 'bulk-diagnose' }));
router.get('/products/history', (_req: Request, res: Response) => res.json({ section: 'products', action: 'history' }));

// Metrics (4): list, detail, thresholds, update
router.get('/metrics', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'list' }));
router.get('/metrics/list', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'list' }));
router.get('/metrics/detail', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'detail' }));
router.get('/metrics/thresholds', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'thresholds' }));
router.put('/metrics/update', (_req: Request, res: Response) => res.json({ section: 'metrics', action: 'update' }));

// Alerts (4): list, detail, configure, dismiss
router.get('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/list', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/detail', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'detail' }));
router.post('/alerts/configure', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'configure' }));
router.post('/alerts/dismiss', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'dismiss' }));

// Analytics (3): analytics, analytics/health-trend, analytics/risk-distribution
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/health-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'health-trend' }));
router.get('/analytics/risk-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'risk-distribution' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
