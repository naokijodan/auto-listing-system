import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/soon-to-expire', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'soon-to-expire' }));
router.get('/dashboard/expired', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expired' }));
router.get('/dashboard/actions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'actions' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'create' }));
router.put('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'update' }));
router.delete('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'delete' }));
router.post('/inventory/:id/relabel', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'relabel' }));

// Expiry (4)
router.get('/expiry', (_req: Request, res: Response) => res.json({ section: 'expiry', action: 'list' }));
router.get('/expiry/:id', (_req: Request, res: Response) => res.json({ section: 'expiry', action: 'detail' }));
router.post('/expiry/:id/extend', (_req: Request, res: Response) => res.json({ section: 'expiry', action: 'extend' }));
router.post('/expiry/:id/mark-disposed', (_req: Request, res: Response) => res.json({ section: 'expiry', action: 'mark-disposed' }));

// Alerts (4)
router.get('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'list' }));
router.get('/alerts/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'detail' }));
router.post('/alerts', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'create' }));
router.put('/alerts/:id', (_req: Request, res: Response) => res.json({ section: 'alerts', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/expiry-trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'expiry-trends' }));
router.get('/analytics/sku-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sku-impact' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

