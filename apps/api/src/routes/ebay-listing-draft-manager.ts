import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/drafts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'drafts' }));
router.get('/dashboard/ready', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'ready' }));
router.get('/dashboard/expired', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'expired' }));

// Drafts (6)
router.get('/drafts', (_req: Request, res: Response) => res.json({ section: 'drafts', action: 'list' }));
router.get('/drafts/:id', (_req: Request, res: Response) => res.json({ section: 'drafts', action: 'detail' }));
router.post('/drafts', (_req: Request, res: Response) => res.json({ section: 'drafts', action: 'create' }));
router.put('/drafts/:id', (_req: Request, res: Response) => res.json({ section: 'drafts', action: 'update' }));
router.post('/drafts/:id/publish', (_req: Request, res: Response) => res.json({ section: 'drafts', action: 'publish' }));
router.post('/drafts/bulk-publish', (_req: Request, res: Response) => res.json({ section: 'drafts', action: 'bulk-publish' }));

// Templates (4)
router.get('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'list' }));
router.get('/templates/:id', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'detail' }));
router.post('/templates', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'create' }));
router.post('/templates/:id/apply', (_req: Request, res: Response) => res.json({ section: 'templates', action: 'apply' }));

// Validation (4)
router.post('/validate', (_req: Request, res: Response) => res.json({ section: 'validation', action: 'validate' }));
router.post('/bulk-validate', (_req: Request, res: Response) => res.json({ section: 'validation', action: 'bulk-validate' }));
router.get('/issues', (_req: Request, res: Response) => res.json({ section: 'validation', action: 'issues' }));
router.post('/fix', (_req: Request, res: Response) => res.json({ section: 'validation', action: 'fix' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/draft-to-live-rate', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'draft-to-live-rate' }));
router.get('/analytics/time-to-publish', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'time-to-publish' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/cleanup', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'cleanup' }));

export default router;

