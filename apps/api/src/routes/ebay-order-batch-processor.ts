import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/queued, /dashboard/processing, /dashboard/completed
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/queued', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'queued' }));
router.get('/dashboard/processing', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'processing' }));
router.get('/dashboard/completed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'completed' }));

// Batches (6): list, detail, create, process, pause, cancel
router.get('/batches', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'list' }));
router.get('/batches/:id', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'detail' }));
router.post('/batches', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'create' }));
router.post('/batches/:id/process', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'process' }));
router.post('/batches/:id/pause', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'pause' }));
router.post('/batches/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'batches', action: 'cancel' }));

// Orders (4): list, detail, assign-batch, remove-batch
router.get('/orders', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'list' }));
router.get('/orders/:id', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'detail' }));
router.post('/orders/:id/assign-batch', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'assign-batch' }));
router.post('/orders/:id/remove-batch', (_req: Request, res: Response) => res.json({ section: 'orders', action: 'remove-batch' }));

// Rules (4): list, detail, create, update
router.get('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'list' }));
router.get('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'detail' }));
router.post('/rules', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'create' }));
router.put('/rules/:id', (_req: Request, res: Response) => res.json({ section: 'rules', action: 'update' }));

// Analytics (3): analytics, analytics/throughput, analytics/error-rate
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/throughput', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'throughput' }));
router.get('/analytics/error-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'error-rate' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, retry
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/retry', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'retry' }));

export default router;

