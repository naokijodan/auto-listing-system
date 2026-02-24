import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5): /dashboard, /dashboard/summary, /dashboard/upcoming, /dashboard/in-progress, /dashboard/completed
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/upcoming', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'upcoming' }));
router.get('/dashboard/in-progress', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'in-progress' }));
router.get('/dashboard/completed', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'completed' }));

// Counts (6): list, detail, create, start, submit, approve
router.get('/counts', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'list' }));
router.get('/counts/:id', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'detail' }));
router.post('/counts', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'create' }));
router.post('/counts/:id/start', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'start' }));
router.post('/counts/:id/submit', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'submit' }));
router.post('/counts/:id/approve', (_req: Request, res: Response) => res.json({ section: 'counts', action: 'approve' }));

// Schedules (4): list, detail, create, update
router.get('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'list' }));
router.get('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'detail' }));
router.post('/schedules', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'create' }));
router.put('/schedules/:id', (_req: Request, res: Response) => res.json({ section: 'schedules', action: 'update' }));

// Discrepancies (4): list, detail, resolve, adjust
router.get('/discrepancies', (_req: Request, res: Response) => res.json({ section: 'discrepancies', action: 'list' }));
router.get('/discrepancies/:id', (_req: Request, res: Response) => res.json({ section: 'discrepancies', action: 'detail' }));
router.post('/discrepancies/:id/resolve', (_req: Request, res: Response) => res.json({ section: 'discrepancies', action: 'resolve' }));
router.post('/discrepancies/:id/adjust', (_req: Request, res: Response) => res.json({ section: 'discrepancies', action: 'adjust' }));

// Analytics (3): analytics, analytics/accuracy, analytics/variance
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/accuracy', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'accuracy' }));
router.get('/analytics/variance', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'variance' }));

// Settings (2): GET/PUT
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4): health, export, import, sync
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

