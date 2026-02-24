import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/queue-health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'queue-health' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/throughput', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'throughput' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.put('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.post('/orders/:id/enqueue', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'enqueue' }));
router.post('/orders/:id/dequeue', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'dequeue' }));

// Queues (4)
router.get('/queues', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'list' }));
router.get('/queues/:id', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'detail' }));
router.post('/queues', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'create' }));
router.put('/queues/:id', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'update' }));

// Rules (4)
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/throughput', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'throughput' }));
router.get('/analytics/latency', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'latency' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

