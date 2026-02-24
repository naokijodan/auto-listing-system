import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Commissions (6)
router.get('/commissions', (_req: Request, res: Response) => res.json({ section: 'commissions', action: 'list' }));
router.get('/commissions/:id', (_req: Request, res: Response) => res.json({ section: 'commissions', action: 'detail' }));
router.post('/commissions', (_req: Request, res: Response) => res.json({ section: 'commissions', action: 'create' }));
router.put('/commissions/:id', (_req: Request, res: Response) => res.json({ section: 'commissions', action: 'update' }));
router.delete('/commissions/:id', (_req: Request, res: Response) => res.json({ section: 'commissions', action: 'delete' }));
router.post('/commissions/:id/process', (_req: Request, res: Response) => res.json({ section: 'commissions', action: 'process' }));

// Payments (4)
router.get('/payments', (_req: Request, res: Response) => res.json({ section: 'payments', action: 'list' }));
router.get('/payments/:id', (_req: Request, res: Response) => res.json({ section: 'payments', action: 'detail' }));
router.post('/payments', (_req: Request, res: Response) => res.json({ section: 'payments', action: 'create' }));
router.put('/payments/:id', (_req: Request, res: Response) => res.json({ section: 'payments', action: 'update' }));

// Rates (4)
router.get('/rates', (_req: Request, res: Response) => res.json({ section: 'rates', action: 'list' }));
router.get('/rates/:id', (_req: Request, res: Response) => res.json({ section: 'rates', action: 'detail' }));
router.post('/rates', (_req: Request, res: Response) => res.json({ section: 'rates', action: 'create' }));
router.put('/rates/:id', (_req: Request, res: Response) => res.json({ section: 'rates', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
