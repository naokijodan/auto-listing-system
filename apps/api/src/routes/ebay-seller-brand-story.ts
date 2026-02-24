import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/engagement', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'engagement' }));
router.get('/dashboard/reach', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'reach' }));
router.get('/dashboard/impact', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'impact' }));

// Sellers (6)
router.get('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'list' }));
router.get('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'detail' }));
router.post('/sellers', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'create' }));
router.put('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'update' }));
router.post('/sellers/:id/activate', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'activate' }));
router.delete('/sellers/:id', (_req: Request, res: Response) => res.json({ section: 'sellers', action: 'delete' }));

// Stories (4)
router.get('/stories', (_req: Request, res: Response) => res.json({ section: 'stories', action: 'list' }));
router.post('/stories', (_req: Request, res: Response) => res.json({ section: 'stories', action: 'create' }));
router.get('/stories/:id', (_req: Request, res: Response) => res.json({ section: 'stories', action: 'detail' }));
router.put('/stories/:id', (_req: Request, res: Response) => res.json({ section: 'stories', action: 'update' }));

// Branding (4)
router.get('/branding', (_req: Request, res: Response) => res.json({ section: 'branding', action: 'overview' }));
router.post('/branding/themes', (_req: Request, res: Response) => res.json({ section: 'branding', action: 'themes' }));
router.post('/branding/assets', (_req: Request, res: Response) => res.json({ section: 'branding', action: 'assets' }));
router.post('/branding/publish', (_req: Request, res: Response) => res.json({ section: 'branding', action: 'publish' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/engagement', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'engagement' }));
router.get('/analytics/conversion', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

