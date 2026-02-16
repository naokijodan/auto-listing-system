import { Router, Request, Response } from 'express';

const router = Router();
const scope = 'ebay-inventory-sync';
const themeColor = 'emerald-600';

function respond(req: Request, res: Response, extra: Record<string, unknown> = {}) {
  res.json({
    status: 'ok',
    scope,
    themeColor,
    path: req.path,
    method: req.method,
    ...extra,
  });
}

// Dashboard (5)
router.get('/dashboard', (req, res) => respond(req, res, { section: 'dashboard' }));
router.get('/dashboard/summary', (req, res) => respond(req, res, { section: 'dashboard:summary' }));
router.get('/dashboard/sync-status', (req, res) => respond(req, res, { section: 'dashboard:sync-status' }));
router.get('/dashboard/errors', (req, res) => respond(req, res, { section: 'dashboard:errors' }));
router.get('/dashboard/activity', (req, res) => respond(req, res, { section: 'dashboard:activity' }));

// 在庫同期 Syncs (6): CRUD + start + stop
router.get('/syncs', (req, res) => respond(req, res, { section: 'syncs:list' }));
router.post('/syncs', (req, res) => respond(req, res, { section: 'syncs:create' }));
router.put('/syncs/:id', (req, res) => respond(req, res, { section: 'syncs:update', id: req.params.id }));
router.delete('/syncs/:id', (req, res) => respond(req, res, { section: 'syncs:delete', id: req.params.id }));
router.post('/syncs/:id/start', (req, res) => respond(req, res, { section: 'syncs:start', id: req.params.id }));
router.post('/syncs/:id/stop', (req, res) => respond(req, res, { section: 'syncs:stop', id: req.params.id }));

// チャンネル Channels (4)
router.get('/channels', (req, res) => respond(req, res, { section: 'channels:list' }));
router.get('/channels/:id', (req, res) => respond(req, res, { section: 'channels:detail', id: req.params.id }));
router.post('/channels/connect', (req, res) => respond(req, res, { section: 'channels:connect' }));
router.post('/channels/test', (req, res) => respond(req, res, { section: 'channels:test' }));

// マッピング Mappings (4)
router.get('/mappings', (req, res) => respond(req, res, { section: 'mappings:list' }));
router.get('/mappings/:id', (req, res) => respond(req, res, { section: 'mappings:detail', id: req.params.id }));
router.post('/mappings/create', (req, res) => respond(req, res, { section: 'mappings:create' }));
router.post('/mappings/auto-match', (req, res) => respond(req, res, { section: 'mappings:auto-match' }));

// 分析 Analytics (3)
router.get('/analytics', (req, res) => respond(req, res, { section: 'analytics:overview' }));
router.get('/analytics/accuracy', (req, res) => respond(req, res, { section: 'analytics:accuracy' }));
router.get('/analytics/performance', (req, res) => respond(req, res, { section: 'analytics:performance' }));

// 設定 Settings (2)
router.get('/settings', (req, res) => respond(req, res, { section: 'settings:get' }));
router.put('/settings', (req, res) => respond(req, res, { section: 'settings:update' }));

// ユーティリティ Utilities (4)
router.get('/health', (req, res) => respond(req, res, { section: 'util:health' }));
router.post('/export', (req, res) => respond(req, res, { section: 'util:export' }));
router.post('/import', (req, res) => respond(req, res, { section: 'util:import' }));
router.post('/force-sync', (req, res) => respond(req, res, { section: 'util:force-sync' }));

export default router;

