import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 164: Multi-User Management（マルチユーザー管理）
// ============================================

// --- ユーザー管理 ---
const users = [
  {
    id: 'user_001',
    email: 'admin@example.com',
    name: '管理者 太郎',
    role: 'ADMIN',
    status: 'ACTIVE',
    avatar: null,
    department: '管理部',
    createdAt: '2025-01-01T00:00:00Z',
    lastLoginAt: '2026-02-15T09:00:00Z',
    mfaEnabled: true,
    permissions: ['*'],
  },
  {
    id: 'user_002',
    email: 'manager@example.com',
    name: '店長 花子',
    role: 'MANAGER',
    status: 'ACTIVE',
    avatar: null,
    department: '販売部',
    createdAt: '2025-03-15T00:00:00Z',
    lastLoginAt: '2026-02-15T08:30:00Z',
    mfaEnabled: true,
    permissions: ['listings:*', 'orders:*', 'reports:read'],
  },
  {
    id: 'user_003',
    email: 'staff1@example.com',
    name: '出品 次郎',
    role: 'STAFF',
    status: 'ACTIVE',
    avatar: null,
    department: '販売部',
    createdAt: '2025-06-01T00:00:00Z',
    lastLoginAt: '2026-02-14T17:00:00Z',
    mfaEnabled: false,
    permissions: ['listings:read', 'listings:create', 'listings:update'],
  },
  {
    id: 'user_004',
    email: 'viewer@example.com',
    name: '閲覧 三郎',
    role: 'VIEWER',
    status: 'INACTIVE',
    avatar: null,
    department: '経理部',
    createdAt: '2025-09-01T00:00:00Z',
    lastLoginAt: '2026-01-15T10:00:00Z',
    mfaEnabled: false,
    permissions: ['listings:read', 'reports:read'],
  },
];

// ユーザー一覧取得
router.get('/users', (req, res) => {
  const { role, status, search, page = '1', limit = '20' } = req.query;

  let filtered = [...users];

  if (role) {
    filtered = filtered.filter(u => u.role === role);
  }
  if (status) {
    filtered = filtered.filter(u => u.status === status);
  }
  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s)
    );
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    users: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
    summary: {
      byRole: {
        admin: users.filter(u => u.role === 'ADMIN').length,
        manager: users.filter(u => u.role === 'MANAGER').length,
        staff: users.filter(u => u.role === 'STAFF').length,
        viewer: users.filter(u => u.role === 'VIEWER').length,
      },
      byStatus: {
        active: users.filter(u => u.status === 'ACTIVE').length,
        inactive: users.filter(u => u.status === 'INACTIVE').length,
        pending: users.filter(u => u.status === 'PENDING').length,
      },
    },
  });
});

// ユーザー詳細取得
router.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// ユーザー作成
router.post('/users', (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']),
    department: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  const newUser = {
    id: `user_${Date.now()}`,
    ...parsed.data,
    status: 'PENDING',
    avatar: null,
    department: parsed.data.department ?? null,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    mfaEnabled: false,
    permissions: [],
  };

  res.status(201).json({
    user: newUser,
    inviteUrl: `https://example.com/invite/${newUser.id}`,
    message: '招待メールを送信しました',
  });
});

// ユーザー更新
router.put('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ ...user, ...req.body, id: user.id, email: user.email });
});

// ユーザー削除
router.delete('/users/:id', (req, res) => {
  res.json({ success: true, message: 'User deleted' });
});

// ユーザーステータス変更
router.post('/users/:id/status', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const schema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
    reason: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({ ...user, status: parsed.data.status });
});

// パスワードリセット
router.post('/users/:id/reset-password', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    success: true,
    message: 'パスワードリセットメールを送信しました',
    email: user.email,
  });
});

// MFA設定
router.post('/users/:id/mfa', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const schema = z.object({
    enabled: z.boolean(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({ ...user, mfaEnabled: parsed.data.enabled });
});

// --- ロール管理 ---
const roles = [
  {
    id: 'role_admin',
    name: 'ADMIN',
    displayName: '管理者',
    description: 'システム全体へのフルアクセス',
    permissions: ['*'],
    userCount: 1,
    isSystem: true,
  },
  {
    id: 'role_manager',
    name: 'MANAGER',
    displayName: 'マネージャー',
    description: '出品・注文管理とレポート閲覧',
    permissions: ['listings:*', 'orders:*', 'reports:read', 'users:read'],
    userCount: 1,
    isSystem: true,
  },
  {
    id: 'role_staff',
    name: 'STAFF',
    displayName: 'スタッフ',
    description: '出品の作成・編集',
    permissions: ['listings:read', 'listings:create', 'listings:update'],
    userCount: 1,
    isSystem: true,
  },
  {
    id: 'role_viewer',
    name: 'VIEWER',
    displayName: '閲覧者',
    description: '閲覧のみ',
    permissions: ['listings:read', 'orders:read', 'reports:read'],
    userCount: 1,
    isSystem: true,
  },
  {
    id: 'role_custom_1',
    name: 'CUSTOM_PRICING',
    displayName: '価格管理者',
    description: '価格設定の管理',
    permissions: ['listings:read', 'listings:update:price', 'pricing:*'],
    userCount: 0,
    isSystem: false,
  },
];

// ロール一覧取得
router.get('/roles', (req, res) => {
  res.json({
    roles,
    total: roles.length,
  });
});

// ロール詳細取得
router.get('/roles/:id', (req, res) => {
  const role = roles.find(r => r.id === req.params.id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }
  res.json(role);
});

// カスタムロール作成
router.post('/roles', (req, res) => {
  const schema = z.object({
    name: z.string(),
    displayName: z.string(),
    description: z.string().optional(),
    permissions: z.array(z.string()),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  const newRole = {
    id: `role_${Date.now()}`,
    ...parsed.data,
    description: parsed.data.description ?? '',
    userCount: 0,
    isSystem: false,
  };

  res.status(201).json(newRole);
});

// ロール更新
router.put('/roles/:id', (req, res) => {
  const role = roles.find(r => r.id === req.params.id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  if (role.isSystem) {
    return res.status(400).json({ error: 'System roles cannot be modified' });
  }

  res.json({ ...role, ...req.body, id: role.id, isSystem: role.isSystem });
});

// ロール削除
router.delete('/roles/:id', (req, res) => {
  const role = roles.find(r => r.id === req.params.id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  if (role.isSystem) {
    return res.status(400).json({ error: 'System roles cannot be deleted' });
  }

  res.json({ success: true, message: 'Role deleted' });
});

// --- 権限管理 ---
const permissions = [
  { id: 'listings:read', name: '出品閲覧', category: 'LISTINGS' },
  { id: 'listings:create', name: '出品作成', category: 'LISTINGS' },
  { id: 'listings:update', name: '出品更新', category: 'LISTINGS' },
  { id: 'listings:delete', name: '出品削除', category: 'LISTINGS' },
  { id: 'listings:*', name: '出品全権限', category: 'LISTINGS' },
  { id: 'orders:read', name: '注文閲覧', category: 'ORDERS' },
  { id: 'orders:update', name: '注文更新', category: 'ORDERS' },
  { id: 'orders:*', name: '注文全権限', category: 'ORDERS' },
  { id: 'reports:read', name: 'レポート閲覧', category: 'REPORTS' },
  { id: 'reports:create', name: 'レポート作成', category: 'REPORTS' },
  { id: 'users:read', name: 'ユーザー閲覧', category: 'USERS' },
  { id: 'users:create', name: 'ユーザー作成', category: 'USERS' },
  { id: 'users:update', name: 'ユーザー更新', category: 'USERS' },
  { id: 'users:delete', name: 'ユーザー削除', category: 'USERS' },
  { id: 'users:*', name: 'ユーザー全権限', category: 'USERS' },
  { id: 'settings:read', name: '設定閲覧', category: 'SETTINGS' },
  { id: 'settings:update', name: '設定更新', category: 'SETTINGS' },
  { id: 'pricing:read', name: '価格閲覧', category: 'PRICING' },
  { id: 'pricing:update', name: '価格更新', category: 'PRICING' },
  { id: 'pricing:*', name: '価格全権限', category: 'PRICING' },
  { id: '*', name: '全権限', category: 'SYSTEM' },
];

router.get('/permissions', (req, res) => {
  const { category } = req.query;

  let filtered = [...permissions];
  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }

  const categories = [...new Set(permissions.map(p => p.category))];

  res.json({
    permissions: filtered,
    total: filtered.length,
    categories,
  });
});

// --- チーム管理 ---
const teams = [
  {
    id: 'team_001',
    name: '販売チーム',
    description: 'eBay出品・注文管理担当',
    members: ['user_002', 'user_003'],
    leaderId: 'user_002',
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'team_002',
    name: '分析チーム',
    description: 'データ分析・レポート担当',
    members: ['user_004'],
    leaderId: null,
    createdAt: '2025-09-01T00:00:00Z',
  },
];

router.get('/teams', (req, res) => {
  res.json({
    teams: teams.map(team => ({
      ...team,
      memberCount: team.members.length,
    })),
    total: teams.length,
  });
});

router.get('/teams/:id', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const memberDetails = team.members.map(userId => {
    const user = users.find(u => u.id === userId);
    return user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null;
  }).filter(Boolean);

  res.json({ ...team, memberDetails });
});

router.post('/teams', (req, res) => {
  const schema = z.object({
    name: z.string(),
    description: z.string().optional(),
    members: z.array(z.string()).optional(),
    leaderId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `team_${Date.now()}`,
    ...parsed.data,
    members: parsed.data.members ?? [],
    createdAt: new Date().toISOString(),
  });
});

router.put('/teams/:id', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  res.json({ ...team, ...req.body, id: team.id });
});

router.delete('/teams/:id', (req, res) => {
  res.json({ success: true, message: 'Team deleted' });
});

router.post('/teams/:id/members', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const schema = z.object({
    userId: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({ ...team, members: [...team.members, parsed.data.userId] });
});

router.delete('/teams/:id/members/:userId', (req, res) => {
  const team = teams.find(t => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  res.json({ ...team, members: team.members.filter(m => m !== req.params.userId) });
});

// --- アクティビティログ ---
router.get('/activity', (req, res) => {
  const { userId, action, page = '1', limit = '50' } = req.query;

  const activities = [
    { id: 'act_001', userId: 'user_001', userName: '管理者 太郎', action: 'USER_CREATED', target: 'user_003', timestamp: '2026-02-15T10:00:00Z' },
    { id: 'act_002', userId: 'user_002', userName: '店長 花子', action: 'LOGIN', target: null, timestamp: '2026-02-15T08:30:00Z' },
    { id: 'act_003', userId: 'user_003', userName: '出品 次郎', action: 'LISTING_CREATED', target: 'listing_123', timestamp: '2026-02-14T15:00:00Z' },
    { id: 'act_004', userId: 'user_001', userName: '管理者 太郎', action: 'ROLE_UPDATED', target: 'role_custom_1', timestamp: '2026-02-14T10:00:00Z' },
  ];

  let filtered = [...activities];
  if (userId) {
    filtered = filtered.filter(a => a.userId === userId);
  }
  if (action) {
    filtered = filtered.filter(a => a.action === action);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    activities: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
  });
});

// --- ダッシュボード ---
router.get('/dashboard', (req, res) => {
  res.json({
    userStats: {
      total: users.length,
      active: users.filter(u => u.status === 'ACTIVE').length,
      newThisMonth: 1,
      mfaEnabled: users.filter(u => u.mfaEnabled).length,
    },
    roleStats: {
      total: roles.length,
      custom: roles.filter(r => !r.isSystem).length,
    },
    teamStats: {
      total: teams.length,
      avgMembers: teams.reduce((sum, t) => sum + t.members.length, 0) / teams.length,
    },
    recentActivity: [
      { type: 'USER_LOGIN', message: '店長 花子がログインしました', timestamp: '2026-02-15T08:30:00Z' },
      { type: 'USER_CREATED', message: '新しいユーザーが追加されました', timestamp: '2026-02-15T10:00:00Z' },
    ],
    securityAlerts: [
      { type: 'MFA_DISABLED', message: '2ユーザーがMFA未設定です', severity: 'WARNING' },
    ],
  });
});

export { router as ebayMultiUserRouter };
