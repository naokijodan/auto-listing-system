import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/pending, /dashboard/wrapped, /dashboard/revenue
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/wrapped', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'wrapped' }));
router.get('/dashboard/revenue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'revenue' }));

// GiftOrders (6): list, detail, create, update, wrap, bulk-wrap
router.get('/gift-orders', (_req: Request, res: Response) => res.json({ section: 'gift-orders', action: 'list' }));
router.get('/gift-orders/:id', (_req: Request, res: Response) => res.json({ section: 'gift-orders', action: 'detail' }));
router.post('/gift-orders', (_req: Request, res: Response) => res.json({ section: 'gift-orders', action: 'create' }));
router.put('/gift-orders/:id', (_req: Request, res: Response) => res.json({ section: 'gift-orders', action: 'update' }));
router.post('/gift-orders/:id/wrap', (_req: Request, res: Response) => res.json({ section: 'gift-orders', action: 'wrap' }));
router.post('/gift-orders/bulk-wrap', (_req: Request, res: Response) => res.json({ section: 'gift-orders', action: 'bulk-wrap' }));

// Options (4): list, detail, create, update
router.get('/options', (_req: Request, res: Response) => res.json({ section: 'options', action: 'list' }));
router.get('/options/:id', (_req: Request, res: Response) => res.json({ section: 'options', action: 'detail' }));
router.post('/options', (_req: Request, res: Response) => res.json({ section: 'options', action: 'create' }));
router.put('/options/:id', (_req: Request, res: Response) => res.json({ section: 'options', action: 'update' }));

// Messages (4): list, detail, create, update
router.get('/messages', (_req: Request, res: Response) => res.json({ section: 'messages', action: 'list' }));
router.get('/messages/:id', (_req: Request, res: Response) => res.json({ section: 'messages', action: 'detail' }));
router.post('/messages', (_req: Request, res: Response) => res.json({ section: 'messages', action: 'create' }));
router.put('/messages/:id', (_req: Request, res: Response) => res.json({ section: 'messages', action: 'update' }));

// Analytics (3): analytics, analytics/gift-rate, analytics/revenue-impact
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/gift-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'gift-rate' }));
router.get('/analytics/revenue-impact', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'revenue-impact' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

