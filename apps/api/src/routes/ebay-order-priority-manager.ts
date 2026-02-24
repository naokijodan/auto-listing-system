import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/urgent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'urgent' }));
router.get('/dashboard/high', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'high' }));
router.get('/dashboard/normal', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'normal' }));

// Orders (6)
router.get('/orders/list', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/detail', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders/set-priority', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'set-priority' }));
router.post('/orders/bulk-set-priority', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'bulk-set-priority' }));
router.post('/orders/escalate', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'escalate' }));
router.post('/orders/de-escalate', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'de-escalate' }));

// Rules (4)
router.get('/rules/list', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/detail', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules/create', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/update', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Queue (4)
router.get('/queue/list', (_req: Request, res: Response) => res.json({ section: 'queue', action: 'list' }));
router.get('/queue/detail', (_req: Request, res: Response) => res.json({ section: 'queue', action: 'detail' }));
router.post('/queue/process', (_req: Request, res: Response) => res.json({ section: 'queue', action: 'process' }));
router.post('/queue/skip', (_req: Request, res: Response) => res.json({ section: 'queue', action: 'skip' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/processing-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'processing-time' }));
router.get('/analytics/sla-compliance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'sla-compliance' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

