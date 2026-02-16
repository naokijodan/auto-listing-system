import { Router, Request, Response } from 'express';

const router = Router();

const ok = (res: Response, data: Record<string, unknown> = {}) =>
  res.json({ ok: true, timestamp: new Date().toISOString(), ...data });

router.get('/theme', (_req: Request, res: Response) =>
  ok(res, { service: 'ebay-product-condition', theme: 'rose-600' })
);

// -------------------- Dashboard (5) --------------------
router.get('/dashboard', (_req: Request, res: Response) =>
  ok(res, { title: 'Condition Dashboard', returnsRate: 0.022, claimsRate: 0.011 })
);

router.get('/dashboard/summary', (_req: Request, res: Response) =>
  ok(res, {
    summary: {
      totalListings: 4321,
      byCondition: { new: 1200, used: 2800, forParts: 321 },
    },
  })
);

router.get('/dashboard/conditions', (_req: Request, res: Response) =>
  ok(res, { conditions: ['New', 'Used - Like New', 'Used - Good', 'For parts'] })
);

router.get('/dashboard/returns', (_req: Request, res: Response) =>
  ok(res, { returns: { total: 45, rate: 0.022, byCondition: { new: 10, used: 35 } } })
);

router.get('/dashboard/claims', (_req: Request, res: Response) =>
  ok(res, { claims: { total: 18, rate: 0.011 } })
);

// -------------------- Conditions (6) --------------------
router.get('/conditions', (_req: Request, res: Response) => ok(res, { items: [], count: 0 }));

router.post('/conditions', (req: Request, res: Response) => ok(res, { created: true, payload: req.body || null }));

router.get('/conditions/:id', (req: Request, res: Response) => ok(res, { id: req.params.id, name: 'Used - Good' }));

router.put('/conditions/:id', (req: Request, res: Response) => ok(res, { id: req.params.id, updated: true, payload: req.body || null }));

router.post('/conditions/:id/validate', (req: Request, res: Response) => ok(res, { id: req.params.id, valid: true }));

router.post('/conditions/:id/assign', (req: Request, res: Response) => ok(res, { id: req.params.id, assigned: true }));

// -------------------- Templates (4) --------------------
router.get('/templates', (_req: Request, res: Response) => ok(res, { items: [{ id: 't1', name: 'Default' }] }));

router.get('/templates/:id', (req: Request, res: Response) => ok(res, { id: req.params.id, name: 'Default', rules: [] }));

router.post('/templates/create', (req: Request, res: Response) => ok(res, { created: true, payload: req.body || null }));

router.post('/templates/update', (req: Request, res: Response) => ok(res, { updated: true, payload: req.body || null }));

// -------------------- Mappings (4) --------------------
router.get('/mappings', (_req: Request, res: Response) => ok(res, { items: [{ id: 'm1', source: 'internal', target: 'ebay' }] }));

router.get('/mappings/:id', (req: Request, res: Response) => ok(res, { id: req.params.id, source: 'internal', target: 'ebay' }));

router.post('/mappings/bulk', (req: Request, res: Response) => ok(res, { processed: (req.body?.items || []).length }));

router.post('/mappings/sync', (_req: Request, res: Response) => ok(res, { synced: true }));

// -------------------- Analytics (3) --------------------
router.get('/analytics', (_req: Request, res: Response) => ok(res, { overview: { hotspots: ['returns', 'claims'] } }));

router.get('/analytics/performance', (_req: Request, res: Response) => ok(res, { series: [{ condition: 'Used', returnsRate: 0.03 }] }));

router.get('/analytics/issues', (_req: Request, res: Response) => ok(res, { issues: [{ type: 'mislabel', count: 5 }] }));

// -------------------- Settings (2) --------------------
router.get('/settings', (_req: Request, res: Response) => ok(res, { settings: { defaultTemplate: 't1', autoValidate: true } }));

router.put('/settings', (req: Request, res: Response) => ok(res, { updated: true, settings: req.body || null }));

// -------------------- Utilities (4) --------------------
router.get('/health', (_req: Request, res: Response) => ok(res, { status: 'healthy' }));

router.post('/export', (req: Request, res: Response) => ok(res, { exportUrl: '/exports/product-condition.zip', payload: req.body || null }));

router.post('/import', (req: Request, res: Response) => ok(res, { imported: true }));

router.post('/reindex', (_req: Request, res: Response) => ok(res, { reindexed: true }));

export default router;

