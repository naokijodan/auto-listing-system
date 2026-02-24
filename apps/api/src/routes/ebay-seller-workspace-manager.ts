import { Router } from 'express'; import type { Request, Response } from 'express';

const router = Router();

// Phase 614: セラーワークスペース管理 — Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'root' }));
router.get('/dashboard/overview', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'overview' }));
router.get('/dashboard/stats', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'stats' }));
router.get('/dashboard/recent-activity', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent-activity' }));
router.get('/dashboard/health', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'health' }));

// Workspaces (6)
router.get('/workspaces', (_req: Request, res: Response) => res.json({ section: 'workspaces', action: 'list' }));
router.post('/workspaces', (_req: Request, res: Response) => res.json({ section: 'workspaces', action: 'create' }));
router.put('/workspaces/:id', (_req: Request, res: Response) => res.json({ section: 'workspaces', action: 'update' }));
router.delete('/workspaces/:id', (_req: Request, res: Response) => res.json({ section: 'workspaces', action: 'delete' }));
router.post('/workspaces/:id/switch', (_req: Request, res: Response) => res.json({ section: 'workspaces', action: 'switch' }));
router.post('/workspaces/:id/archive', (_req: Request, res: Response) => res.json({ section: 'workspaces', action: 'archive' }));

// Teams (4)
router.get('/teams', (_req: Request, res: Response) => res.json({ section: 'teams', action: 'list' }));
router.post('/teams/invite', (_req: Request, res: Response) => res.json({ section: 'teams', action: 'invite' }));
router.post('/teams/roles', (_req: Request, res: Response) => res.json({ section: 'teams', action: 'roles' }));
router.delete('/teams/:id', (_req: Request, res: Response) => res.json({ section: 'teams', action: 'remove' }));

// Permissions (4)
router.get('/permissions', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'matrix' }));
router.post('/permissions/assign', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'assign' }));
router.post('/permissions/revoke', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'revoke' }));
router.get('/permissions/audit', (_req: Request, res: Response) => res.json({ section: 'permissions', action: 'audit' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/usage', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'usage' }));
router.get('/analytics/access', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'access' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.post('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;

