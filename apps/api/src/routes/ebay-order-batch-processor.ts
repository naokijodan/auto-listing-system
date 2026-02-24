import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/throughput', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'throughput' }));
router.get('/dashboard/failures', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'failures' }));
router.get('/dashboard/latency', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'latency' }));

// Orders (6)
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'create' }));
router.put('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'update' }));
router.post('/orders/:id/ack', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'ack' }));
router.delete('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'delete' }));

// Batches (4)
router.get('/batches', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'list' }));
router.post('/batches', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'create' }));
router.get('/batches/:id', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'detail' }));
router.post('/batches/:id/run', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'run' }));

// Queues (4)
router.get('/queues', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'list' }));
router.get('/queues/:name', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'detail' }));
router.post('/queues/:name/pause', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'pause' }));
router.post('/queues/:name/resume', (_req: Request, res: Response) => res.json({ section: 'queues', action: 'resume' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/processing-time', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'processing-time' }));
router.get('/analytics/error-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'error-rate' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

