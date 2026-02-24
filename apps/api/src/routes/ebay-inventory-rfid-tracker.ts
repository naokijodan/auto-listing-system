import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'create' }));
router.put('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'update' }));
router.delete('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'delete' }));
router.post('/inventory/:id/process', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'process' }));

// Rfid (4)
router.get('/rfid', (_req: Request, res: Response) => res.json({ section: 'rfid', action: 'list' }));
router.get('/rfid/:id', (_req: Request, res: Response) => res.json({ section: 'rfid', action: 'detail' }));
router.post('/rfid', (_req: Request, res: Response) => res.json({ section: 'rfid', action: 'create' }));
router.put('/rfid/:id', (_req: Request, res: Response) => res.json({ section: 'rfid', action: 'update' }));

// Scans (4)
router.get('/scans', (_req: Request, res: Response) => res.json({ section: 'scans', action: 'list' }));
router.get('/scans/:id', (_req: Request, res: Response) => res.json({ section: 'scans', action: 'detail' }));
router.post('/scans', (_req: Request, res: Response) => res.json({ section: 'scans', action: 'create' }));
router.put('/scans/:id', (_req: Request, res: Response) => res.json({ section: 'scans', action: 'update' }));

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
