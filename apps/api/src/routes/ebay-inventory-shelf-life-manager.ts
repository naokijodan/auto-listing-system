import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/expiring-soon', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expiring-soon' }));
router.get('/dashboard/expired', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expired' }));
router.get('/dashboard/turnover', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'turnover' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'create' }));
router.put('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'update' }));
router.post('/inventory/:id/mark-expired', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'mark-expired' }));
router.post('/inventory/:id/extend', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'extend' }));

// Expirations (4)
router.get('/expirations', (_req: Request, res: Response) => res.json({ section: 'expirations', action: 'list' }));
router.get('/expirations/:id', (_req: Request, res: Response) => res.json({ section: 'expirations', action: 'detail' }));
router.post('/expirations', (_req: Request, res: Response) => res.json({ section: 'expirations', action: 'create' }));
router.put('/expirations/:id', (_req: Request, res: Response) => res.json({ section: 'expirations', action: 'update' }));

// Alerts (4)
router.get('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'detail' }));
router.post('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'create' }));
router.put('/alerts/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/age-distribution', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'age-distribution' }));
router.get('/analytics/waste-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'waste-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

