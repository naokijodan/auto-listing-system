import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/upcoming', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'upcoming' }));
router.get('/dashboard/active-promotions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'active-promotions' }));
router.get('/dashboard/calendar', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'calendar' }));

// Holidays (6)
router.get('/holidays', (_req: Request, res: Response) => res.json({ section: 'holidays', action: 'list' }));
router.get('/holidays/:id', (_req: Request, res: Response) => res.json({ section: 'holidays', action: 'detail' }));
router.post('/holidays', (_req: Request, res: Response) => res.json({ section: 'holidays', action: 'create' }));
router.put('/holidays/:id', (_req: Request, res: Response) => res.json({ section: 'holidays', action: 'update' }));
router.post('/holidays/:id/activate', (_req: Request, res: Response) => res.json({ section: 'holidays', action: 'activate' }));
router.post('/holidays/:id/deactivate', (_req: Request, res: Response) => res.json({ section: 'holidays', action: 'deactivate' }));

// Schedules (4)
router.get('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.get('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'detail' }));
router.post('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));

// Promotions (4)
router.get('/promotions', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'list' }));
router.get('/promotions/:id', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'detail' }));
router.post('/promotions', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'create' }));
router.put('/promotions/:id', (_req: Request, res: Response) => res.json({ section: 'promotions', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/seasonality', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'seasonality' }));
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

