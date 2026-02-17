import { Router, Request, Response } from 'express';

const router = Router();
const THEME = 'green-600';

function send(res: Response, info: Record<string, any> = {}, status = 200) {
  res.status(status).json({ theme: THEME, ...info });
}

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => send(res, { route: 'dashboard' }));
router.get('/dashboard/summary', (req: Request, res: Response) => send(res, { route: 'dashboard/summary' }));
router.get('/dashboard/scores', (req: Request, res: Response) => send(res, { route: 'dashboard/scores' }));
router.get('/dashboard/opportunities', (req: Request, res: Response) => send(res, { route: 'dashboard/opportunities' }));
router.get('/dashboard/trends', (req: Request, res: Response) => send(res, { route: 'dashboard/trends' }));

// Optimizations (6): CRUD + apply + preview
router.get('/optimizations', (req: Request, res: Response) => send(res, { route: 'optimizations:list' }));
router.post('/optimizations', (req: Request, res: Response) => send(res, { route: 'optimizations:create', payload: req.body }, 201));
router.put('/optimizations/:id', (req: Request, res: Response) => send(res, { route: 'optimizations:update', id: req.params.id, payload: req.body }));
router.delete('/optimizations/:id', (req: Request, res: Response) => send(res, { route: 'optimizations:delete', id: req.params.id }));
router.post('/optimizations/:id/apply', (req: Request, res: Response) => send(res, { route: 'optimizations:apply', id: req.params.id }));
router.get('/optimizations/:id/preview', (req: Request, res: Response) => send(res, { route: 'optimizations:preview', id: req.params.id }));

// Keywords (4)
router.get('/keywords', (req: Request, res: Response) => send(res, { route: 'keywords:list' }));
router.get('/keywords/:id', (req: Request, res: Response) => send(res, { route: 'keywords:get', id: req.params.id }));
router.post('/keywords/research', (req: Request, res: Response) => send(res, { route: 'keywords:research', payload: req.body }));
router.post('/keywords/track', (req: Request, res: Response) => send(res, { route: 'keywords:track', payload: req.body }));

// Suggestions (4)
router.get('/suggestions', (req: Request, res: Response) => send(res, { route: 'suggestions:list' }));
router.get('/suggestions/:id', (req: Request, res: Response) => send(res, { route: 'suggestions:get', id: req.params.id }));
router.post('/suggestions/generate', (req: Request, res: Response) => send(res, { route: 'suggestions:generate', payload: req.body }));
router.post('/suggestions/bulk-apply', (req: Request, res: Response) => send(res, { route: 'suggestions:bulk-apply', payload: req.body }));

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => send(res, { route: 'analytics' }));
router.get('/analytics/rankings', (req: Request, res: Response) => send(res, { route: 'analytics:rankings' }));
router.get('/analytics/traffic', (req: Request, res: Response) => send(res, { route: 'analytics:traffic' }));

// Settings (2)
router.get('/settings', (req: Request, res: Response) => send(res, { route: 'settings:get' }));
router.put('/settings', (req: Request, res: Response) => send(res, { route: 'settings:update', payload: req.body }));

// Utilities (4)
router.get('/health', (req: Request, res: Response) => send(res, { route: 'health', ok: true }));
router.post('/export', (req: Request, res: Response) => send(res, { route: 'export', format: req.body?.format || 'json' }));
router.post('/import', (req: Request, res: Response) => send(res, { route: 'import', source: 'upload' }));
router.post('/scan', (req: Request, res: Response) => send(res, { route: 'scan', scope: req.body?.scope || 'site' }));

export default router;

