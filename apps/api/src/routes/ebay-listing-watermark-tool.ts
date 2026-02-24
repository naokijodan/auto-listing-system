import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/watermarked, /dashboard/pending, /dashboard/templates
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/watermarked', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'watermarked' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/templates', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'templates' }));

// Watermarks (6): list, detail, create, update, apply, bulk-apply
router.get('/watermarks', (_req: Request, res: Response) => res.json({ section: 'watermarks', action: 'list' }));
router.get('/watermarks/:id', (_req: Request, res: Response) => res.json({ section: 'watermarks', action: 'detail' }));
router.post('/watermarks', (_req: Request, res: Response) => res.json({ section: 'watermarks', action: 'create' }));
router.put('/watermarks/:id', (_req: Request, res: Response) => res.json({ section: 'watermarks', action: 'update' }));
router.post('/watermarks/:id/apply', (_req: Request, res: Response) => res.json({ section: 'watermarks', action: 'apply' }));
router.post('/watermarks/bulk-apply', (_req: Request, res: Response) => res.json({ section: 'watermarks', action: 'bulk-apply' }));

// Templates (4): list, detail, create, update
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Images (4): list, detail, preview, download
router.get('/images', (_req: Request, res: Response) => res.json({ section: 'images', action: 'list' }));
router.get('/images/:id', (_req: Request, res: Response) => res.json({ section: 'images', action: 'detail' }));
router.get('/images/:id/preview', (_req: Request, res: Response) => res.json({ section: 'images', action: 'preview' }));
router.get('/images/:id/download', (_req: Request, res: Response) => res.json({ section: 'images', action: 'download' }));

// Analytics (3): analytics, analytics/usage, analytics/protection-rate
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/usage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'usage' }));
router.get('/analytics/protection-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'protection-rate' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

