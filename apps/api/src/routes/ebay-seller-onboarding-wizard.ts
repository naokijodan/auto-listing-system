import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/progress, /dashboard/pending-steps, /dashboard/completed-steps
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/progress', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'progress' }));
router.get('/dashboard/pending-steps', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'pending-steps' }));
router.get('/dashboard/completed-steps', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'completed-steps' }));

// Steps (6): list, detail, create, update, complete, skip
router.get('/steps', (_req: Request, res: Response) => res.json({ section: 'steps', action: 'list' }));
router.get('/steps/:id', (_req: Request, res: Response) => res.json({ section: 'steps', action: 'detail' }));
router.post('/steps', (_req: Request, res: Response) => res.json({ section: 'steps', action: 'create' }));
router.put('/steps/:id', (_req: Request, res: Response) => res.json({ section: 'steps', action: 'update' }));
router.post('/steps/:id/complete', (_req: Request, res: Response) => res.json({ section: 'steps', action: 'complete' }));
router.post('/steps/:id/skip', (_req: Request, res: Response) => res.json({ section: 'steps', action: 'skip' }));

// Checklists (4): list, detail, create, update
router.get('/checklists', (_req: Request, res: Response) => res.json({ section: 'checklists', action: 'list' }));
router.get('/checklists/:id', (_req: Request, res: Response) => res.json({ section: 'checklists', action: 'detail' }));
router.post('/checklists', (_req: Request, res: Response) => res.json({ section: 'checklists', action: 'create' }));
router.put('/checklists/:id', (_req: Request, res: Response) => res.json({ section: 'checklists', action: 'update' }));

// Resources (4): list, detail, create, bookmark
router.get('/resources', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'list' }));
router.get('/resources/:id', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'detail' }));
router.post('/resources', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'create' }));
router.post('/resources/:id/bookmark', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'bookmark' }));

// Analytics (3): analytics, analytics/completion-rate, analytics/time-to-complete
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/completion-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'completion-rate' }));
router.get('/analytics/time-to-complete', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'time-to-complete' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, reset
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/reset', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'reset' }));

export default router;

