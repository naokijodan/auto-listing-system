import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 170: Real-time Collaboration API
// リアルタイムコラボレーション機能
// ============================================

// --- セッション管理 ---

// アクティブセッション一覧
router.get('/sessions', async (_req, res) => {
  const sessions = [
    {
      id: 'sess_1',
      name: '在庫調整作業',
      type: 'inventory',
      status: 'active',
      participants: [
        { userId: 'user_1', name: '田中', role: 'owner', avatar: 'https://i.pravatar.cc/40?u=1', joinedAt: '2026-02-15T10:00:00Z', cursor: { listingId: 'lst_001', field: 'price' } },
        { userId: 'user_2', name: '佐藤', role: 'editor', avatar: 'https://i.pravatar.cc/40?u=2', joinedAt: '2026-02-15T10:05:00Z', cursor: { listingId: 'lst_003', field: 'title' } },
      ],
      targetIds: ['lst_001', 'lst_002', 'lst_003', 'lst_004', 'lst_005'],
      createdAt: '2026-02-15T10:00:00Z',
      lastActivity: '2026-02-15T10:30:00Z',
    },
    {
      id: 'sess_2',
      name: '新商品登録',
      type: 'listing',
      status: 'active',
      participants: [
        { userId: 'user_3', name: '鈴木', role: 'owner', avatar: 'https://i.pravatar.cc/40?u=3', joinedAt: '2026-02-15T09:00:00Z', cursor: null },
      ],
      targetIds: [],
      createdAt: '2026-02-15T09:00:00Z',
      lastActivity: '2026-02-15T10:25:00Z',
    },
    {
      id: 'sess_3',
      name: '価格一括更新',
      type: 'pricing',
      status: 'paused',
      participants: [
        { userId: 'user_1', name: '田中', role: 'owner', avatar: 'https://i.pravatar.cc/40?u=1', joinedAt: '2026-02-14T15:00:00Z', cursor: null },
        { userId: 'user_4', name: '山田', role: 'viewer', avatar: 'https://i.pravatar.cc/40?u=4', joinedAt: '2026-02-14T15:10:00Z', cursor: null },
      ],
      targetIds: ['lst_010', 'lst_011', 'lst_012'],
      createdAt: '2026-02-14T15:00:00Z',
      lastActivity: '2026-02-14T16:00:00Z',
    },
  ];

  res.json({ sessions, total: sessions.length });
});

// セッション詳細
router.get('/sessions/:id', async (req, res) => {
  const session = {
    id: req.params.id,
    name: '在庫調整作業',
    type: 'inventory',
    status: 'active',
    participants: [
      { userId: 'user_1', name: '田中', role: 'owner', avatar: 'https://i.pravatar.cc/40?u=1', joinedAt: '2026-02-15T10:00:00Z', cursor: { listingId: 'lst_001', field: 'price' }, isOnline: true },
      { userId: 'user_2', name: '佐藤', role: 'editor', avatar: 'https://i.pravatar.cc/40?u=2', joinedAt: '2026-02-15T10:05:00Z', cursor: { listingId: 'lst_003', field: 'title' }, isOnline: true },
    ],
    targetIds: ['lst_001', 'lst_002', 'lst_003', 'lst_004', 'lst_005'],
    settings: {
      allowEditing: true,
      allowChat: true,
      autoSave: true,
      conflictResolution: 'last-write-wins',
    },
    createdAt: '2026-02-15T10:00:00Z',
    lastActivity: '2026-02-15T10:30:00Z',
  };

  res.json(session);
});

// 新規セッション作成
router.post('/sessions', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.enum(['inventory', 'listing', 'pricing', 'general']),
    targetIds: z.array(z.string()).optional(),
    settings: z.object({
      allowEditing: z.boolean().optional(),
      allowChat: z.boolean().optional(),
      autoSave: z.boolean().optional(),
    }).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `sess_${Date.now()}`,
    ...data,
    status: 'active',
    participants: [],
    joinUrl: `https://rakuda.app/collab/sess_${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
});

// セッション参加
router.post('/sessions/:id/join', async (req, res) => {
  const schema = z.object({
    role: z.enum(['editor', 'viewer']).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    sessionId: req.params.id,
    userId: 'user_current',
    role: data.role || 'editor',
    joinedAt: new Date().toISOString(),
    token: `collab_token_${Date.now()}`,
  });
});

// セッション退出
router.post('/sessions/:id/leave', async (req, res) => {
  res.json({ success: true, sessionId: req.params.id });
});

// セッション終了
router.delete('/sessions/:id', async (req, res) => {
  res.json({ success: true, sessionId: req.params.id, endedAt: new Date().toISOString() });
});

// --- リアルタイム編集 ---

// カーソル位置更新
router.post('/sessions/:id/cursor', async (req, res) => {
  const schema = z.object({
    listingId: z.string(),
    field: z.string().nullable(),
  });

  const data = schema.parse(req.body);

  res.json({
    sessionId: req.params.id,
    cursor: data,
    timestamp: new Date().toISOString(),
  });
});

// 変更ブロードキャスト
router.post('/sessions/:id/changes', async (req, res) => {
  const schema = z.object({
    changes: z.array(z.object({
      listingId: z.string(),
      field: z.string(),
      oldValue: z.any(),
      newValue: z.any(),
    })),
  });

  const data = schema.parse(req.body);

  res.json({
    sessionId: req.params.id,
    changeId: `chg_${Date.now()}`,
    appliedChanges: data.changes.length,
    timestamp: new Date().toISOString(),
  });
});

// ロック取得
router.post('/sessions/:id/lock', async (req, res) => {
  const schema = z.object({
    listingId: z.string(),
    field: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    sessionId: req.params.id,
    lockId: `lock_${Date.now()}`,
    target: data,
    acquired: true,
    expiresAt: new Date(Date.now() + 30000).toISOString(),
  });
});

// ロック解放
router.post('/sessions/:id/unlock', async (req, res) => {
  const schema = z.object({
    lockId: z.string(),
  });

  const data = schema.parse(req.body);

  res.json({
    sessionId: req.params.id,
    lockId: data.lockId,
    released: true,
  });
});

// 現在のロック一覧
router.get('/sessions/:id/locks', async (req, res) => {
  const locks = [
    { lockId: 'lock_1', userId: 'user_1', listingId: 'lst_001', field: 'price', acquiredAt: '2026-02-15T10:28:00Z', expiresAt: '2026-02-15T10:28:30Z' },
    { lockId: 'lock_2', userId: 'user_2', listingId: 'lst_003', field: 'title', acquiredAt: '2026-02-15T10:29:00Z', expiresAt: '2026-02-15T10:29:30Z' },
  ];

  res.json({ sessionId: req.params.id, locks });
});

// --- チャット・コミュニケーション ---

// チャットメッセージ一覧
router.get('/sessions/:id/messages', async (req, res) => {
  const messages = [
    { id: 'msg_1', userId: 'user_1', userName: '田中', content: 'lst_001の価格を確認してください', type: 'text', createdAt: '2026-02-15T10:15:00Z' },
    { id: 'msg_2', userId: 'user_2', userName: '佐藤', content: '確認しました。$29.99でOKです', type: 'text', createdAt: '2026-02-15T10:16:00Z' },
    { id: 'msg_3', userId: 'system', userName: 'System', content: '田中さんがlst_001の価格を$29.99に更新しました', type: 'system', createdAt: '2026-02-15T10:17:00Z' },
    { id: 'msg_4', userId: 'user_1', userName: '田中', content: '次はlst_003に移りましょう', type: 'text', createdAt: '2026-02-15T10:20:00Z' },
  ];

  res.json({ sessionId: req.params.id, messages, total: messages.length });
});

// メッセージ送信
router.post('/sessions/:id/messages', async (req, res) => {
  const schema = z.object({
    content: z.string().min(1),
    type: z.enum(['text', 'mention', 'link']).optional(),
    mentionedUsers: z.array(z.string()).optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    id: `msg_${Date.now()}`,
    sessionId: req.params.id,
    userId: 'user_current',
    ...data,
    createdAt: new Date().toISOString(),
  });
});

// --- プレゼンス ---

// オンラインユーザー一覧
router.get('/presence', async (_req, res) => {
  const users = [
    { userId: 'user_1', name: '田中', avatar: 'https://i.pravatar.cc/40?u=1', status: 'online', currentSession: 'sess_1', lastSeen: '2026-02-15T10:30:00Z' },
    { userId: 'user_2', name: '佐藤', avatar: 'https://i.pravatar.cc/40?u=2', status: 'online', currentSession: 'sess_1', lastSeen: '2026-02-15T10:30:00Z' },
    { userId: 'user_3', name: '鈴木', avatar: 'https://i.pravatar.cc/40?u=3', status: 'away', currentSession: 'sess_2', lastSeen: '2026-02-15T10:25:00Z' },
    { userId: 'user_4', name: '山田', avatar: 'https://i.pravatar.cc/40?u=4', status: 'offline', currentSession: null, lastSeen: '2026-02-14T16:00:00Z' },
  ];

  res.json({ users, onlineCount: 3 });
});

// プレゼンス更新
router.post('/presence', async (req, res) => {
  const schema = z.object({
    status: z.enum(['online', 'away', 'busy', 'offline']),
  });

  const data = schema.parse(req.body);

  res.json({
    userId: 'user_current',
    status: data.status,
    updatedAt: new Date().toISOString(),
  });
});

// --- コンフリクト解決 ---

// コンフリクト一覧
router.get('/sessions/:id/conflicts', async (req, res) => {
  const conflicts = [
    {
      id: 'conf_1',
      listingId: 'lst_002',
      field: 'price',
      versions: [
        { userId: 'user_1', userName: '田中', value: 29.99, timestamp: '2026-02-15T10:25:00Z' },
        { userId: 'user_2', userName: '佐藤', value: 34.99, timestamp: '2026-02-15T10:25:01Z' },
      ],
      status: 'pending',
      createdAt: '2026-02-15T10:25:01Z',
    },
  ];

  res.json({ sessionId: req.params.id, conflicts, total: conflicts.length });
});

// コンフリクト解決
router.post('/sessions/:id/conflicts/:conflictId/resolve', async (req, res) => {
  const schema = z.object({
    resolution: z.enum(['keep-mine', 'keep-theirs', 'merge', 'custom']),
    customValue: z.any().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    conflictId: req.params.conflictId,
    resolution: data.resolution,
    resolvedValue: data.customValue || 34.99,
    resolvedAt: new Date().toISOString(),
  });
});

// --- 変更履歴 ---

// セッション変更履歴
router.get('/sessions/:id/history', async (req, res) => {
  const history = [
    { id: 'hist_1', userId: 'user_1', userName: '田中', action: 'update', listingId: 'lst_001', field: 'price', oldValue: 24.99, newValue: 29.99, timestamp: '2026-02-15T10:17:00Z' },
    { id: 'hist_2', userId: 'user_2', userName: '佐藤', action: 'update', listingId: 'lst_003', field: 'title', oldValue: 'Old Title', newValue: 'New Title', timestamp: '2026-02-15T10:20:00Z' },
    { id: 'hist_3', userId: 'user_1', userName: '田中', action: 'update', listingId: 'lst_001', field: 'quantity', oldValue: 5, newValue: 10, timestamp: '2026-02-15T10:22:00Z' },
  ];

  res.json({ sessionId: req.params.id, history, total: history.length });
});

// 変更を元に戻す
router.post('/sessions/:id/history/:historyId/revert', async (req, res) => {
  res.json({
    historyId: req.params.historyId,
    reverted: true,
    revertedAt: new Date().toISOString(),
  });
});

// --- 招待・権限管理 ---

// セッション招待
router.post('/sessions/:id/invite', async (req, res) => {
  const schema = z.object({
    email: z.string().email().optional(),
    userId: z.string().optional(),
    role: z.enum(['editor', 'viewer']),
    message: z.string().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    inviteId: `inv_${Date.now()}`,
    sessionId: req.params.id,
    ...data,
    inviteUrl: `https://rakuda.app/collab/invite/${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
});

// 参加者権限更新
router.put('/sessions/:id/participants/:userId', async (req, res) => {
  const schema = z.object({
    role: z.enum(['owner', 'editor', 'viewer']),
  });

  const data = schema.parse(req.body);

  res.json({
    sessionId: req.params.id,
    userId: req.params.userId,
    role: data.role,
    updatedAt: new Date().toISOString(),
  });
});

// 参加者削除
router.delete('/sessions/:id/participants/:userId', async (req, res) => {
  res.json({
    sessionId: req.params.id,
    userId: req.params.userId,
    removed: true,
  });
});

// --- 設定 ---

// コラボレーション設定取得
router.get('/settings', async (_req, res) => {
  res.json({
    defaultSessionType: 'general',
    autoJoinEnabled: true,
    notificationsEnabled: true,
    conflictResolution: 'last-write-wins',
    cursorTrackingEnabled: true,
    chatEnabled: true,
    presenceTimeout: 300,
  });
});

// コラボレーション設定更新
router.put('/settings', async (req, res) => {
  const schema = z.object({
    defaultSessionType: z.enum(['inventory', 'listing', 'pricing', 'general']).optional(),
    autoJoinEnabled: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    conflictResolution: z.enum(['last-write-wins', 'first-write-wins', 'manual']).optional(),
    cursorTrackingEnabled: z.boolean().optional(),
    chatEnabled: z.boolean().optional(),
    presenceTimeout: z.number().optional(),
  });

  const data = schema.parse(req.body);

  res.json({
    ...data,
    updatedAt: new Date().toISOString(),
  });
});

export const ebayRealtimeCollabRouter = router;
