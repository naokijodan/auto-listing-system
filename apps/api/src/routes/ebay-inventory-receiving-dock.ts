import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/arrivals', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'arrivals' }));
router.get('/dashboard/processing', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'processing' }));
router.get('/dashboard/exceptions', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'exceptions' }));

// Inventory (6)
router.get('/inventory', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'list' }));
router.get('/inventory/:id', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'detail' }));
router.post('/inventory/receive', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'receive' }));
router.post('/inventory/putaway', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'putaway' }));
router.post('/inventory/adjust', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'adjust' }));
router.get('/inventory/:id/history', (_req: Request, res: Response) => res.json({ section: 'inventory', action: 'history' }));

// Receiving (4)
router.get('/receiving', (_req: Request, res: Response) => res.json({ section: 'receiving', action: 'list' }));
router.get('/receiving/:id', (_req: Request, res: Response) => res.json({ section: 'receiving', action: 'detail' }));
router.post('/receiving', (_req: Request, res: Response) => res.json({ section: 'receiving', action: 'create' }));
router.put('/receiving/:id', (_req: Request, res: Response) => res.json({ section: 'receiving', action: 'update' }));

// Inspections (4)
router.get('/inspections', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'list' }));
router.get('/inspections/:id', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'detail' }));
router.post('/inspections/:id/pass', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'pass' }));
router.post('/inspections/:id/fail', (_req: Request, res: Response) => res.json({ section: 'inspections', action: 'fail' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/throughput', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'throughput' }));
router.get('/analytics/defect-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'defect-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/cleanup', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'cleanup' }));

export default router;

