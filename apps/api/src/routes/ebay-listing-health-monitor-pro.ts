import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/critical', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'critical' }));
router.get('/dashboard/warnings', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'warnings' }));
router.get('/dashboard/healthy', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'healthy' }));

// Listings (6)
router.get('/listings/list', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/detail/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/diagnose/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'diagnose' }));
router.post('/listings/fix/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'fix' }));
router.post('/listings/bulk-fix', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-fix' }));
router.get('/listings/history/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'history' }));

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/detail/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/update/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Alerts (4)
router.get('/alerts/list', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/detail/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'detail' }));
router.post('/alerts/acknowledge/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'acknowledge' }));
router.post('/alerts/snooze/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'snooze' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/health-trend', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'health-trend' }));
router.get('/analytics/fix-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'fix-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/scan', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'scan' }));

export default router;

