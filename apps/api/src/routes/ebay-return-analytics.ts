import { Router, Request, Response } from 'express';

const router = Router();

// Helper to send stub JSON responses
const ok = (res: Response, data: unknown = {}) => res.json({ ok: true, ...data });

// Theme: red-600

// Dashboard (5)
router.get('/dashboard', (_: Request, res: Response) => ok(res, { route: 'dashboard' }));
router.get('/dashboard/summary', (_: Request, res: Response) => ok(res, { route: 'dashboard/summary' }));
router.get('/dashboard/rate', (_: Request, res: Response) => ok(res, { route: 'dashboard/rate' }));
router.get('/dashboard/reasons', (_: Request, res: Response) => ok(res, { route: 'dashboard/reasons' }));
router.get('/dashboard/trends', (_: Request, res: Response) => ok(res, { route: 'dashboard/trends' }));

// Returns (6): list + detail + analyze + compare + export + refresh
router.get('/returns', (_: Request, res: Response) => ok(res, { route: 'returns' }));
router.get('/returns/:id', (req: Request, res: Response) => ok(res, { route: 'returns/:id', id: req.params.id }));
router.post('/returns/:id/analyze', (req: Request, res: Response) => ok(res, { route: 'returns/:id/analyze', id: req.params.id }));
router.post('/returns/compare', (req: Request, res: Response) => ok(res, { route: 'returns/compare', body: req.body }));
router.get('/returns/export', (_: Request, res: Response) => ok(res, { route: 'returns/export' }));
router.post('/returns/refresh', (_: Request, res: Response) => ok(res, { route: 'returns/refresh' }));

// Patterns (4)
router.get('/patterns', (_: Request, res: Response) => ok(res, { route: 'patterns' }));
router.get('/patterns/:id', (req: Request, res: Response) => ok(res, { route: 'patterns/:id', id: req.params.id }));
router.post('/patterns/detect', (req: Request, res: Response) => ok(res, { route: 'patterns/detect', body: req.body }));
router.get('/patterns/products', (_: Request, res: Response) => ok(res, { route: 'patterns/products' }));

// Prevention (4)
router.get('/prevention', (_: Request, res: Response) => ok(res, { route: 'prevention' }));
router.get('/prevention/:id', (req: Request, res: Response) => ok(res, { route: 'prevention/:id', id: req.params.id }));
router.get('/prevention/recommendations', (_: Request, res: Response) => ok(res, { route: 'prevention/recommendations' }));
router.post('/prevention/apply', (req: Request, res: Response) => ok(res, { route: 'prevention/apply', body: req.body }));

// Analytics (3)
router.get('/analytics', (_: Request, res: Response) => ok(res, { route: 'analytics' }));
router.get('/analytics/costs', (_: Request, res: Response) => ok(res, { route: 'analytics/costs' }));
router.get('/analytics/buyers', (_: Request, res: Response) => ok(res, { route: 'analytics/buyers' }));

// Settings (2): GET/PUT
router.get('/settings', (_: Request, res: Response) => ok(res, { route: 'settings' }));
router.put('/settings', (req: Request, res: Response) => ok(res, { route: 'settings', updated: true, body: req.body }));

// Utilities (4)
router.get('/health', (_: Request, res: Response) => ok(res, { status: 'healthy' }));
router.get('/export', (_: Request, res: Response) => ok(res, { route: 'export' }));
router.post('/import', (req: Request, res: Response) => ok(res, { route: 'import', body: req.body }));
router.post('/recalculate', (_: Request, res: Response) => ok(res, { route: 'recalculate' }));

export default router;

