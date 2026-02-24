import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/top-performing', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'top-performing' }));
router.get('/dashboard/issues', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'issues' }));

// Listings (6)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings/create', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.post('/listings/:id/update', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));
router.post('/listings/:id/delete', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'delete' }));
router.post('/listings/bulk-update', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'bulk-update' }));

// Previews (4)
router.get('/previews', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'list' }));
router.get('/previews/:id', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'detail' }));
router.post('/previews/generate', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'generate' }));
router.get('/previews/history', (_req: Request, res: Response) => res.json({ section: 'previews', action: 'history' }));

// Devices (4)
router.get('/devices', (_req: Request, res: Response) => res.json({ section: 'devices', action: 'list' }));
router.get('/devices/:id', (_req: Request, res: Response) => res.json({ section: 'devices', action: 'detail' }));
router.post('/devices/emulate/:id', (_req: Request, res: Response) => res.json({ section: 'devices', action: 'emulate' }));
router.get('/devices/breakpoints', (_req: Request, res: Response) => res.json({ section: 'devices', action: 'breakpoints' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/engagement', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'engagement' }));
router.get('/analytics/conversion', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'conversion' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

