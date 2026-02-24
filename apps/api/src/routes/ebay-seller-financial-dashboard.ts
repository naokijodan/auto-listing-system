import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/revenue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'revenue' }));
router.get('/dashboard/expenses', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expenses' }));
router.get('/dashboard/profit', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'profit' }));

// Transactions (6)
router.get('/transactions', (_req: Request, res: Response) => res.json({ section: 'transactions', action: 'list' }));
router.get('/transactions/:id', (_req: Request, res: Response) => res.json({ section: 'transactions', action: 'detail' }));
router.post('/transactions/:id/categorize', (_req: Request, res: Response) => res.json({ section: 'transactions', action: 'categorize' }));
router.post('/transactions/:id/reconcile', (_req: Request, res: Response) => res.json({ section: 'transactions', action: 'reconcile' }));
router.get('/transactions/export', (_req: Request, res: Response) => res.json({ section: 'transactions', action: 'export' }));
router.post('/transactions/bulk-categorize', (_req: Request, res: Response) => res.json({ section: 'transactions', action: 'bulk-categorize' }));

// Reports (4)
router.get('/reports', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'list' }));
router.get('/reports/:id', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'detail' }));
router.post('/reports/generate', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'generate' }));
router.post('/reports/:id/schedule', (_req: Request, res: Response) => res.json({ section: 'reports', action: 'schedule' }));

// Budgets (4)
router.get('/budgets', (_req: Request, res: Response) => res.json({ section: 'budgets', action: 'list' }));
router.get('/budgets/:id', (_req: Request, res: Response) => res.json({ section: 'budgets', action: 'detail' }));
router.post('/budgets', (_req: Request, res: Response) => res.json({ section: 'budgets', action: 'create' }));
router.put('/budgets/:id', (_req: Request, res: Response) => res.json({ section: 'budgets', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/cash-flow', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'cash-flow' }));
router.get('/analytics/profit-margin', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'profit-margin' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

