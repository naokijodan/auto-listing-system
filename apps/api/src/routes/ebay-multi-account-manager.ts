import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/accounts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'accounts' }));
router.get('/dashboard/performance', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'performance' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Accounts (6)
router.get('/accounts', (_req: Request, res: Response) => res.json({ section: 'accounts', action: 'list' }));
router.get('/accounts/:id', (_req: Request, res: Response) => res.json({ section: 'accounts', action: 'detail' }));
router.post('/accounts', (_req: Request, res: Response) => res.json({ section: 'accounts', action: 'add' }));
router.put('/accounts/:id', (_req: Request, res: Response) => res.json({ section: 'accounts', action: 'update' }));
router.post('/accounts/:id/switch', (_req: Request, res: Response) => res.json({ section: 'accounts', action: 'switch' }));
router.delete('/accounts/:id', (_req: Request, res: Response) => res.json({ section: 'accounts', action: 'remove' }));

// Sync (4)
router.get('/sync', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'list' }));
router.get('/sync/:id', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'detail' }));
router.post('/sync/run', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'run' }));
router.post('/sync/schedule', (_req: Request, res: Response) => res.json({ section: 'sync', action: 'schedule' }));

// Permissions (4)
router.get('/permissions', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'list' }));
router.get('/permissions/:id', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'detail' }));
router.post('/permissions/:id/grant', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'grant' }));
router.post('/permissions/:id/revoke', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'revoke' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/account-comparison', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'account-comparison' }));
router.get('/analytics/consolidated-revenue', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'consolidated-revenue' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

