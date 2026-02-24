import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/progress', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'progress' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));
router.get('/dashboard/recommendations', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recommendations' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/pending', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'pending' }));
router.get('/orders/eligible', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'eligible' }));
router.get('/orders/history', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'history' }));
router.get('/orders/detail', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.get('/orders/refresh', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'refresh' }));

// Consolidations (4)
router.get('/consolidations', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'list' }));
router.get('/consolidations/preview', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'preview' }));
router.get('/consolidations/apply', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'apply' }));
router.get('/consolidations/history', (_req: Request, res: Response) => res.json({ section: 'consolidations', action: 'history' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/preview', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'preview' }));
router.get('/rules/apply', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'apply' }));
router.get('/rules/simulate', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'simulate' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/metrics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'metrics' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.get('/settings/update', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.get('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

