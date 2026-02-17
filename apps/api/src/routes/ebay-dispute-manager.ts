import { Router, Request, Response } from 'express';

const router = Router();
const THEME = 'red-600';

function send(res: Response, info: Record<string, any> = {}, status = 200) {
  res.status(status).json({ theme: THEME, ...info });
}

// Dashboard (5)
router.get('/dashboard', (req: Request, res: Response) => send(res, { route: 'dashboard', status: 'ok' }));
router.get('/dashboard/summary', (req: Request, res: Response) => send(res, { route: 'dashboard/summary' }));
router.get('/dashboard/open', (req: Request, res: Response) => send(res, { route: 'dashboard/open' }));
router.get('/dashboard/resolved', (req: Request, res: Response) => send(res, { route: 'dashboard/resolved' }));
router.get('/dashboard/stats', (req: Request, res: Response) => send(res, { route: 'dashboard/stats' }));

// Disputes (6): CRUD + respond + escalate
router.get('/disputes', (req: Request, res: Response) => send(res, { route: 'disputes:list' }));
router.post('/disputes', (req: Request, res: Response) => send(res, { route: 'disputes:create', payload: req.body }, 201));
router.put('/disputes/:id', (req: Request, res: Response) => send(res, { route: 'disputes:update', id: req.params.id, payload: req.body }));
router.delete('/disputes/:id', (req: Request, res: Response) => send(res, { route: 'disputes:delete', id: req.params.id }));
router.post('/disputes/:id/respond', (req: Request, res: Response) => send(res, { route: 'disputes:respond', id: req.params.id, payload: req.body }));
router.post('/disputes/:id/escalate', (req: Request, res: Response) => send(res, { route: 'disputes:escalate', id: req.params.id }));

// Evidence (4)
router.get('/evidence', (req: Request, res: Response) => send(res, { route: 'evidence:list' }));
router.get('/evidence/:id', (req: Request, res: Response) => send(res, { route: 'evidence:get', id: req.params.id }));
router.post('/evidence/upload', (req: Request, res: Response) => send(res, { route: 'evidence:upload' }, 201));
router.post('/evidence/organize', (req: Request, res: Response) => send(res, { route: 'evidence:organize', payload: req.body }));

// Templates (4)
router.get('/templates', (req: Request, res: Response) => send(res, { route: 'templates:list' }));
router.get('/templates/:id', (req: Request, res: Response) => send(res, { route: 'templates:get', id: req.params.id }));
router.post('/templates/create', (req: Request, res: Response) => send(res, { route: 'templates:create', payload: req.body }, 201));
router.post('/templates/apply', (req: Request, res: Response) => send(res, { route: 'templates:apply', payload: req.body }));

// Analytics (3)
router.get('/analytics', (req: Request, res: Response) => send(res, { route: 'analytics' }));
router.get('/analytics/trends', (req: Request, res: Response) => send(res, { route: 'analytics:trends' }));
router.get('/analytics/outcomes', (req: Request, res: Response) => send(res, { route: 'analytics:outcomes' }));

// Settings (2) GET/PUT
router.get('/settings', (req: Request, res: Response) => send(res, { route: 'settings:get' }));
router.put('/settings', (req: Request, res: Response) => send(res, { route: 'settings:update', payload: req.body }));

// Utilities (4)
router.get('/health', (req: Request, res: Response) => send(res, { route: 'health', ok: true }));
router.post('/export', (req: Request, res: Response) => send(res, { route: 'export', format: req.body?.format || 'json' }));
router.post('/import', (req: Request, res: Response) => send(res, { route: 'import', source: 'upload' }));
router.post('/bulk-respond', (req: Request, res: Response) => send(res, { route: 'bulk-respond', items: req.body?.ids || [] }));

export default router;

