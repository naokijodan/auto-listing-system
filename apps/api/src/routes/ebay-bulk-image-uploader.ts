import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/queue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'queue' }));
router.get('/dashboard/completed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'completed' }));
router.get('/dashboard/failed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'failed' }));

// Uploads (6): list, detail, create, bulk-create, retry, cancel
router.get('/uploads', (_req: Request, res: Response) => res.json({ section: 'uploads', action: 'list' }));
router.get('/uploads/:id', (_req: Request, res: Response) => res.json({ section: 'uploads', action: 'detail' }));
router.post('/uploads', (_req: Request, res: Response) => res.json({ section: 'uploads', action: 'create' }));
router.post('/uploads/bulk', (_req: Request, res: Response) => res.json({ section: 'uploads', action: 'bulk-create' }));
router.post('/uploads/:id/retry', (_req: Request, res: Response) => res.json({ section: 'uploads', action: 'retry' }));
router.post('/uploads/:id/cancel', (_req: Request, res: Response) => res.json({ section: 'uploads', action: 'cancel' }));

// Gallery (4): list, detail, organize, search
router.get('/gallery', (_req: Request, res: Response) => res.json({ section: 'gallery', action: 'list' }));
router.get('/gallery/:id', (_req: Request, res: Response) => res.json({ section: 'gallery', action: 'detail' }));
router.post('/gallery/organize', (_req: Request, res: Response) => res.json({ section: 'gallery', action: 'organize' }));
router.get('/gallery/search', (_req: Request, res: Response) => res.json({ section: 'gallery', action: 'search' }));

// Presets (4): list, detail, create, update
router.get('/presets', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'list' }));
router.get('/presets/:id', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'detail' }));
router.post('/presets', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'create' }));
router.put('/presets/:id', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'update' }));

// Analytics (3): analytics, analytics/storage-usage, analytics/upload-speed
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/storage-usage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'storage-usage' }));
router.get('/analytics/upload-speed', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'upload-speed' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, cleanup
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/cleanup', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'cleanup' }));

export default router;

