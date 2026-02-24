import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/total-fees', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'total-fees' }));
router.get('/dashboard/savings', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'savings' }));
router.get('/dashboard/recommendations', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recommendations' }));

// Fees (6): list, detail, calculate, compare, breakdown, history
router.get('/fees', (_req: Request, res: Response) => res.json({ section: 'fees', action: 'list' }));
router.get('/fees/:id', (_req: Request, res: Response) => res.json({ section: 'fees', action: 'detail' }));
router.post('/fees/calculate', (_req: Request, res: Response) => res.json({ section: 'fees', action: 'calculate' }));
router.post('/fees/compare', (_req: Request, res: Response) => res.json({ section: 'fees', action: 'compare' }));
router.get('/fees/:id/breakdown', (_req: Request, res: Response) => res.json({ section: 'fees', action: 'breakdown' }));
router.get('/fees/:id/history', (_req: Request, res: Response) => res.json({ section: 'fees', action: 'history' }));

// Optimization (4): list, detail, apply, simulate
router.get('/optimization', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'list' }));
router.get('/optimization/:id', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'detail' }));
router.post('/optimization/:id/apply', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'apply' }));
router.post('/optimization/simulate', (_req: Request, res: Response) => res.json({ section: 'optimization', action: 'simulate' }));

// Categories (4): list, detail, fee-schedule, comparison
router.get('/categories', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'list' }));
router.get('/categories/:id', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'detail' }));
router.get('/categories/:id/fee-schedule', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'fee-schedule' }));
router.get('/categories/comparison', (_req: Request, res: Response) => res.json({ section: 'categories', action: 'comparison' }));

// Analytics (3): analytics, analytics/fee-trends, analytics/savings-potential
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/fee-trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'fee-trends' }));
router.get('/analytics/savings-potential', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'savings-potential' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, refresh
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/refresh', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'refresh' }));

export default router;

