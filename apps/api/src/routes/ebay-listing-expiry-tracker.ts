import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/expiring-soon', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expiring-soon' }));
router.get('/dashboard/expired', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expired' }));
router.get('/dashboard/auto-renewed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'auto-renewed' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/:id/renew', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'renew' }));
router.post('/listings/bulk-renew', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-renew' }));
router.post('/listings/:id/archive', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'archive' }));
router.post('/listings/:id/set-auto-renew', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'set-auto-renew' }));

// Schedules (4)
router.get('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.get('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'detail' }));
router.post('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));

// Alerts (4)
router.get('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'detail' }));
router.post('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'create' }));
router.post('/alerts/:id/dismiss', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'dismiss' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/renewal-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'renewal-rate' }));
router.get('/analytics/revenue-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

