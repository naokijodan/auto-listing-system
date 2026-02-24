import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/edited', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'edited' }));
router.get('/dashboard/pending', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending' }));
router.get('/dashboard/queue', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'queue' }));

// Photos (6): list, detail, upload, edit, bulk-edit, history
router.get('/photos', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'list' }));
router.get('/photos/list', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'list' }));
router.get('/photos/detail', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'detail' }));
router.post('/photos/upload', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'upload' }));
router.post('/photos/edit', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'edit' }));
router.post('/photos/bulk-edit', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'bulk-edit' }));
router.get('/photos/history', (_req: Request, res: Response) => res.json({ section: 'photos', action: 'history' }));

// Presets (4): list, detail, create, apply
router.get('/presets', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'list' }));
router.get('/presets/list', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'list' }));
router.get('/presets/detail', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'detail' }));
router.post('/presets/create', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'create' }));
router.post('/presets/apply', (_req: Request, res: Response) => res.json({ section: 'presets', action: 'apply' }));

// Templates (4): list, detail, create, update
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/list', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/detail', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates/create', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.put('/templates/update', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'update' }));

// Analytics (3): analytics, analytics/edit-performance, analytics/quality-improvement
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/edit-performance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'edit-performance' }));
router.get('/analytics/quality-improvement', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'quality-improvement' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
