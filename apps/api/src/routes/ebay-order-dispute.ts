import { Router, Request, Response } from 'express';

// Phase 300: Order Dispute Manager（注文紛争管理）
// Theme color: red-600

const router = Router();

const ok = (res: Response, data: any = {}, extra: any = {}) =>
  res.json({ ok: true, phase: 300, feature: 'order-dispute', theme: 'red-600', ...extra, data });

// ----------------------
// Dashboard (5 endpoints)
// ----------------------
router.get('/dashboard', (_req: Request, res: Response) =>
  ok(res, { totalDisputes: 210, open: 34, resolved: 162, winRate: 0.67 }))
;

router.get('/dashboard/total', (_req: Request, res: Response) => ok(res, { totalDisputes: 210 }));
router.get('/dashboard/open', (_req: Request, res: Response) => ok(res, { open: 34 }));
router.get('/dashboard/resolved', (_req: Request, res: Response) => ok(res, { resolved: 162 }));
router.get('/dashboard/win-rate', (_req: Request, res: Response) => ok(res, { winRate: 0.67 }));

// ----------------------
// Disputes (6 endpoints) - CRUD + escalate + resolve
// ----------------------
router.get('/disputes', (_req: Request, res: Response) =>
  ok(res, [
    { id: 'D-1001', orderId: 'O-1', status: 'open' },
    { id: 'D-1002', orderId: 'O-2', status: 'resolved' },
  ]))
;

router.post('/disputes', (req: Request, res: Response) =>
  ok(res, { id: 'D-NEW', ...req.body }, { message: 'Dispute created' }))
;

router.put('/disputes/:id', (req: Request, res: Response) =>
  ok(res, { id: req.params.id, ...req.body }, { message: 'Dispute updated' }))
;

router.delete('/disputes/:id', (req: Request, res: Response) =>
  ok(res, { id: req.params.id }, { message: 'Dispute deleted' }))
;

router.post('/disputes/:id/escalate', (req: Request, res: Response) =>
  ok(res, { id: req.params.id, escalated: true }, { message: 'Dispute escalated' }))
;

router.post('/disputes/:id/resolve', (req: Request, res: Response) =>
  ok(res, { id: req.params.id, resolved: true }, { message: 'Dispute resolved' }))
;

// ----------------------
// Evidence (4 endpoints)
// ----------------------
router.get('/evidence', (_req: Request, res: Response) =>
  ok(res, [
    { id: 'E-1', disputeId: 'D-1001', type: 'image' },
    { id: 'E-2', disputeId: 'D-1001', type: 'message' },
  ]))
;

router.get('/evidence/:id', (req: Request, res: Response) =>
  ok(res, { id: req.params.id, detail: 'Evidence detail' }))
;

router.post('/evidence/upload', (req: Request, res: Response) =>
  ok(res, { uploaded: true, meta: req.body || {} }, { message: 'Evidence uploaded' }))
;

router.delete('/evidence/delete', (_req: Request, res: Response) =>
  ok(res, { deleted: true }, { message: 'Evidence deleted' }))
;

// ----------------------
// Responses (4 endpoints)
// ----------------------
router.get('/responses', (_req: Request, res: Response) =>
  ok(res, [
    { id: 'R-1', disputeId: 'D-1001', message: 'We shipped on time.' },
  ]))
;

router.get('/responses/:disputeId', (req: Request, res: Response) =>
  ok(res, [
    { id: 'R-2', disputeId: req.params.disputeId, message: 'Customer confirmed delivery.' },
  ]))
;

router.get('/responses/templates', (_req: Request, res: Response) =>
  ok(res, [
    { key: 'late-delivery', text: 'Apologies for the delay...' },
    { key: 'proof-of-shipment', text: 'Attached are shipping documents...' },
  ]))
;

router.post('/responses/send', (req: Request, res: Response) =>
  ok(res, { sent: true, payload: req.body }, { message: 'Response sent' }))
;

// ----------------------
// Analytics (3 endpoints)
// ----------------------
router.get('/analytics', (_req: Request, res: Response) =>
  ok(res, { total: 210, open: 34, resolved: 162, winRate: 0.67 }))
;

router.get('/analytics/trends', (_req: Request, res: Response) =>
  ok(res, [
    { metric: 'winRate', points: [0.62, 0.65, 0.67] },
  ]))
;

router.get('/analytics/win-rate', (_req: Request, res: Response) =>
  ok(res, { current: 0.67, lastMonth: 0.65 }))
;

// ----------------------
// Settings (2 endpoints)
// ----------------------
router.get('/settings', (_req: Request, res: Response) =>
  ok(res, { autoEscalate: false, notifyOnUpdate: true }))
;

router.put('/settings', (req: Request, res: Response) =>
  ok(res, { ...req.body }, { message: 'Settings updated' }))
;

// ----------------------
// Utilities (4 endpoints)
// ----------------------
router.get('/health', (_req: Request, res: Response) => ok(res, { status: 'ok' }));
router.get('/export', (_req: Request, res: Response) => ok(res, { url: '/downloads/order-dispute-export.json' }));
router.post('/import', (req: Request, res: Response) => ok(res, { imported: true, items: (req.body?.items || 0) }));
router.post('/reindex', (_req: Request, res: Response) => ok(res, { started: true }, { message: 'Reindex started' }));

export default router;

