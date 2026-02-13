import { Hono } from 'hono';
import { prisma } from '@rakuda/database';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

// ========================================
// スキーマ定義
// ========================================

const createRetentionPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  dataType: z.string(),
  retentionDays: z.number().int().min(1),
  action: z.enum(['DELETE', 'ARCHIVE', 'ANONYMIZE']),
  isActive: z.boolean().default(true),
});

const createGdprRequestSchema = z.object({
  type: z.enum(['ACCESS', 'ERASURE', 'PORTABILITY', 'RECTIFICATION', 'RESTRICTION', 'OBJECTION']),
  userId: z.string(),
  requestedBy: z.string(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

const updateGdprRequestSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

const createMaskingRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fieldPattern: z.string(),
  maskingType: z.enum(['FULL', 'PARTIAL', 'HASH', 'TOKENIZE', 'REDACT']),
  maskingPattern: z.string().optional(),
  isActive: z.boolean().default(true),
});

const createConsentSchema = z.object({
  userId: z.string(),
  consentType: z.string(),
  purpose: z.string(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const createAuditLogSchema = z.object({
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  performedBy: z.string(),
  details: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

// ========================================
// 統計情報
// ========================================

app.get('/stats', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const [
    totalPolicies,
    activePolicies,
    pendingRequests,
    completedRequests,
    totalMaskingRules,
    activeMaskingRules,
    totalConsents,
    activeConsents,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.dataRetentionPolicy.count({ where: { organizationId } }),
    prisma.dataRetentionPolicy.count({ where: { organizationId, isActive: true } }),
    prisma.gdprRequest.count({ where: { organizationId, status: 'PENDING' } }),
    prisma.gdprRequest.count({ where: { organizationId, status: 'COMPLETED' } }),
    prisma.dataMaskingRule.count({ where: { organizationId } }),
    prisma.dataMaskingRule.count({ where: { organizationId, isActive: true } }),
    prisma.consentRecord.count({ where: { organizationId } }),
    prisma.consentRecord.count({
      where: {
        organizationId,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    }),
    prisma.complianceAuditLog.count({
      where: {
        organizationId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // GDPR対応状況
  const gdprStats = await prisma.gdprRequest.groupBy({
    by: ['type'],
    where: { organizationId },
    _count: true,
  });

  // コンプライアンススコア計算
  const complianceScore = calculateComplianceScore({
    activePolicies,
    activeMaskingRules,
    pendingRequests,
    activeConsents,
    totalConsents,
  });

  return c.json({
    retentionPolicies: {
      total: totalPolicies,
      active: activePolicies,
    },
    gdprRequests: {
      pending: pendingRequests,
      completed: completedRequests,
      byType: gdprStats,
    },
    maskingRules: {
      total: totalMaskingRules,
      active: activeMaskingRules,
    },
    consents: {
      total: totalConsents,
      active: activeConsents,
    },
    auditLogs: {
      last24Hours: recentAuditLogs,
    },
    complianceScore,
  });
});

function calculateComplianceScore(data: {
  activePolicies: number;
  activeMaskingRules: number;
  pendingRequests: number;
  activeConsents: number;
  totalConsents: number;
}): number {
  let score = 50; // ベーススコア

  // データ保持ポリシーがあれば加点
  if (data.activePolicies > 0) score += 15;

  // マスキングルールがあれば加点
  if (data.activeMaskingRules > 0) score += 15;

  // 未処理のGDPRリクエストがあれば減点
  score -= Math.min(data.pendingRequests * 5, 20);

  // 同意記録の管理状況
  if (data.totalConsents > 0) {
    const consentRate = data.activeConsents / data.totalConsents;
    score += Math.floor(consentRate * 20);
  }

  return Math.max(0, Math.min(100, score));
}

// ========================================
// データ保持ポリシー
// ========================================

app.get('/retention-policies', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { isActive, dataType } = c.req.query();

  const where: any = { organizationId };
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (dataType) where.dataType = dataType;

  const policies = await prisma.dataRetentionPolicy.findMany({
    where,
    include: {
      executions: {
        take: 5,
        orderBy: { executedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ policies });
});

app.post('/retention-policies', zValidator('json', createRetentionPolicySchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  const policy = await prisma.dataRetentionPolicy.create({
    data: {
      ...data,
      organizationId,
    },
  });

  // 監査ログ
  await prisma.complianceAuditLog.create({
    data: {
      organizationId,
      action: 'CREATE_RETENTION_POLICY',
      resource: 'DataRetentionPolicy',
      resourceId: policy.id,
      performedBy: 'system',
      details: { policyName: policy.name, dataType: policy.dataType },
    },
  });

  return c.json({ policy }, 201);
});

app.put('/retention-policies/:id', zValidator('json', createRetentionPolicySchema.partial()), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const policy = await prisma.dataRetentionPolicy.update({
    where: { id, organizationId },
    data,
  });

  await prisma.complianceAuditLog.create({
    data: {
      organizationId,
      action: 'UPDATE_RETENTION_POLICY',
      resource: 'DataRetentionPolicy',
      resourceId: policy.id,
      performedBy: 'system',
      details: { updates: data },
    },
  });

  return c.json({ policy });
});

app.delete('/retention-policies/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  await prisma.dataRetentionPolicy.delete({
    where: { id, organizationId },
  });

  await prisma.complianceAuditLog.create({
    data: {
      organizationId,
      action: 'DELETE_RETENTION_POLICY',
      resource: 'DataRetentionPolicy',
      resourceId: id,
      performedBy: 'system',
    },
  });

  return c.json({ success: true });
});

// 保持ポリシーの実行
app.post('/retention-policies/:id/execute', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const policy = await prisma.dataRetentionPolicy.findUnique({
    where: { id, organizationId },
  });

  if (!policy) {
    return c.json({ error: 'Policy not found' }, 404);
  }

  // 実行記録を作成
  const execution = await prisma.retentionExecution.create({
    data: {
      policyId: policy.id,
      status: 'RUNNING',
      recordsProcessed: 0,
    },
  });

  // 実際のデータ処理は非同期で実行（ここではシミュレーション）
  setTimeout(async () => {
    const recordsProcessed = Math.floor(Math.random() * 1000);
    await prisma.retentionExecution.update({
      where: { id: execution.id },
      data: {
        status: 'COMPLETED',
        recordsProcessed,
        completedAt: new Date(),
      },
    });

    await prisma.dataRetentionPolicy.update({
      where: { id: policy.id },
      data: { lastExecutedAt: new Date() },
    });
  }, 2000);

  return c.json({ execution, message: 'Execution started' });
});

// ========================================
// GDPRリクエスト
// ========================================

app.get('/gdpr-requests', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { status, type, page = '1', limit = '20' } = c.req.query();

  const where: any = { organizationId };
  if (status) where.status = status;
  if (type) where.type = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [requests, total] = await Promise.all([
    prisma.gdprRequest.findMany({
      where,
      include: {
        activities: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.gdprRequest.count({ where }),
  ]);

  return c.json({
    requests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

app.get('/gdpr-requests/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const request = await prisma.gdprRequest.findUnique({
    where: { id, organizationId },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!request) {
    return c.json({ error: 'Request not found' }, 404);
  }

  return c.json({ request });
});

app.post('/gdpr-requests', zValidator('json', createGdprRequestSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  const request = await prisma.gdprRequest.create({
    data: {
      ...data,
      organizationId,
      status: 'PENDING',
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // デフォルト30日
    },
  });

  // アクティビティ記録
  await prisma.gdprActivity.create({
    data: {
      requestId: request.id,
      action: 'REQUEST_CREATED',
      performedBy: data.requestedBy,
      details: { type: data.type, description: data.description },
    },
  });

  // 監査ログ
  await prisma.complianceAuditLog.create({
    data: {
      organizationId,
      action: 'CREATE_GDPR_REQUEST',
      resource: 'GdprRequest',
      resourceId: request.id,
      performedBy: data.requestedBy,
      details: { type: data.type, userId: data.userId },
    },
  });

  return c.json({ request }, 201);
});

app.put('/gdpr-requests/:id', zValidator('json', updateGdprRequestSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const existing = await prisma.gdprRequest.findUnique({
    where: { id, organizationId },
  });

  if (!existing) {
    return c.json({ error: 'Request not found' }, 404);
  }

  const updateData: any = { ...data };
  if (data.status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  const request = await prisma.gdprRequest.update({
    where: { id },
    data: updateData,
  });

  // アクティビティ記録
  await prisma.gdprActivity.create({
    data: {
      requestId: request.id,
      action: 'REQUEST_UPDATED',
      performedBy: 'system',
      details: { updates: data },
    },
  });

  return c.json({ request });
});

// GDPRリクエストの処理実行
app.post('/gdpr-requests/:id/process', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const request = await prisma.gdprRequest.findUnique({
    where: { id, organizationId },
  });

  if (!request) {
    return c.json({ error: 'Request not found' }, 404);
  }

  // ステータスを処理中に更新
  await prisma.gdprRequest.update({
    where: { id },
    data: { status: 'IN_PROGRESS' },
  });

  // アクティビティ記録
  await prisma.gdprActivity.create({
    data: {
      requestId: request.id,
      action: 'PROCESSING_STARTED',
      performedBy: 'system',
      details: { type: request.type },
    },
  });

  // 処理の種類に応じた対応（シミュレーション）
  let result: any = {};

  switch (request.type) {
    case 'ACCESS':
      result = { message: 'Data export prepared', downloadUrl: `/api/compliance/gdpr-requests/${id}/download` };
      break;
    case 'ERASURE':
      result = { message: 'Data erasure scheduled', scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
      break;
    case 'PORTABILITY':
      result = { message: 'Data portability export prepared', format: 'JSON' };
      break;
    default:
      result = { message: 'Request being processed' };
  }

  return c.json({ request, result });
});

// ========================================
// データマスキングルール
// ========================================

app.get('/masking-rules', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { isActive } = c.req.query();

  const where: any = { organizationId };
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const rules = await prisma.dataMaskingRule.findMany({
    where,
    orderBy: { priority: 'asc' },
  });

  return c.json({ rules });
});

app.post('/masking-rules', zValidator('json', createMaskingRuleSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  // 最大優先度を取得
  const maxPriority = await prisma.dataMaskingRule.aggregate({
    where: { organizationId },
    _max: { priority: true },
  });

  const rule = await prisma.dataMaskingRule.create({
    data: {
      ...data,
      organizationId,
      priority: (maxPriority._max.priority || 0) + 1,
    },
  });

  await prisma.complianceAuditLog.create({
    data: {
      organizationId,
      action: 'CREATE_MASKING_RULE',
      resource: 'DataMaskingRule',
      resourceId: rule.id,
      performedBy: 'system',
      details: { ruleName: rule.name, maskingType: rule.maskingType },
    },
  });

  return c.json({ rule }, 201);
});

app.put('/masking-rules/:id', zValidator('json', createMaskingRuleSchema.partial()), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const rule = await prisma.dataMaskingRule.update({
    where: { id, organizationId },
    data,
  });

  return c.json({ rule });
});

app.delete('/masking-rules/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  await prisma.dataMaskingRule.delete({
    where: { id, organizationId },
  });

  return c.json({ success: true });
});

// マスキングルールのテスト
app.post('/masking-rules/:id/test', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();
  const { testData } = await c.req.json();

  const rule = await prisma.dataMaskingRule.findUnique({
    where: { id, organizationId },
  });

  if (!rule) {
    return c.json({ error: 'Rule not found' }, 404);
  }

  // マスキング処理のシミュレーション
  let maskedData = testData;

  switch (rule.maskingType) {
    case 'FULL':
      maskedData = '********';
      break;
    case 'PARTIAL':
      if (typeof testData === 'string' && testData.length > 4) {
        maskedData = testData.slice(0, 2) + '****' + testData.slice(-2);
      }
      break;
    case 'HASH':
      maskedData = `[HASH:${Buffer.from(testData).toString('base64').slice(0, 8)}]`;
      break;
    case 'TOKENIZE':
      maskedData = `[TOKEN:${Math.random().toString(36).slice(2, 10)}]`;
      break;
    case 'REDACT':
      maskedData = '[REDACTED]';
      break;
  }

  return c.json({ original: testData, masked: maskedData, rule });
});

// ========================================
// 同意管理
// ========================================

app.get('/consents', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { userId, consentType, status, page = '1', limit = '20' } = c.req.query();

  const where: any = { organizationId };
  if (userId) where.userId = userId;
  if (consentType) where.consentType = consentType;
  if (status) where.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [consents, total] = await Promise.all([
    prisma.consentRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.consentRecord.count({ where }),
  ]);

  return c.json({
    consents,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

app.post('/consents', zValidator('json', createConsentSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  // 既存の同意を無効化
  await prisma.consentRecord.updateMany({
    where: {
      organizationId,
      userId: data.userId,
      consentType: data.consentType,
      status: 'ACTIVE',
    },
    data: { status: 'SUPERSEDED' },
  });

  const consent = await prisma.consentRecord.create({
    data: {
      ...data,
      organizationId,
      status: 'ACTIVE',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  await prisma.complianceAuditLog.create({
    data: {
      organizationId,
      action: 'CONSENT_GRANTED',
      resource: 'ConsentRecord',
      resourceId: consent.id,
      performedBy: data.userId,
      details: { consentType: data.consentType, purpose: data.purpose },
    },
  });

  return c.json({ consent }, 201);
});

app.put('/consents/:id/withdraw', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const consent = await prisma.consentRecord.update({
    where: { id, organizationId },
    data: {
      status: 'WITHDRAWN',
      withdrawnAt: new Date(),
    },
  });

  await prisma.complianceAuditLog.create({
    data: {
      organizationId,
      action: 'CONSENT_WITHDRAWN',
      resource: 'ConsentRecord',
      resourceId: consent.id,
      performedBy: consent.userId,
      details: { consentType: consent.consentType },
    },
  });

  return c.json({ consent });
});

// ユーザーの同意状況を確認
app.get('/consents/user/:userId', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { userId } = c.req.param();

  const consents = await prisma.consentRecord.findMany({
    where: {
      organizationId,
      userId,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  const consentMap = consents.reduce((acc: Record<string, any>, consent) => {
    acc[consent.consentType] = {
      granted: true,
      grantedAt: consent.createdAt,
      expiresAt: consent.expiresAt,
      purpose: consent.purpose,
    };
    return acc;
  }, {});

  return c.json({ userId, consents: consentMap });
});

// ========================================
// 監査ログ
// ========================================

app.get('/audit-logs', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { action, resource, performedBy, startDate, endDate, page = '1', limit = '50' } = c.req.query();

  const where: any = { organizationId };
  if (action) where.action = action;
  if (resource) where.resource = resource;
  if (performedBy) where.performedBy = performedBy;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.complianceAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.complianceAuditLog.count({ where }),
  ]);

  return c.json({
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

app.post('/audit-logs', zValidator('json', createAuditLogSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  const log = await prisma.complianceAuditLog.create({
    data: {
      ...data,
      organizationId,
    },
  });

  return c.json({ log }, 201);
});

// 監査ログのエクスポート
app.get('/audit-logs/export', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { startDate, endDate, format = 'json' } = c.req.query();

  const where: any = { organizationId };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const logs = await prisma.complianceAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'csv') {
    const csv = [
      'ID,Action,Resource,ResourceId,PerformedBy,IPAddress,UserAgent,CreatedAt',
      ...logs.map(log =>
        `${log.id},${log.action},${log.resource},${log.resourceId || ''},${log.performedBy},${log.ipAddress || ''},${log.userAgent || ''},${log.createdAt.toISOString()}`
      ),
    ].join('\n');

    return c.text(csv, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=audit-logs.csv',
    });
  }

  return c.json({ logs });
});

// ========================================
// コンプライアンスレポート
// ========================================

app.get('/reports/summary', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const [
    retentionPolicies,
    gdprRequests,
    maskingRules,
    consents,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.dataRetentionPolicy.findMany({
      where: { organizationId, isActive: true },
      include: {
        executions: {
          take: 1,
          orderBy: { executedAt: 'desc' },
        },
      },
    }),
    prisma.gdprRequest.groupBy({
      by: ['status', 'type'],
      where: { organizationId },
      _count: true,
    }),
    prisma.dataMaskingRule.findMany({
      where: { organizationId, isActive: true },
    }),
    prisma.consentRecord.groupBy({
      by: ['consentType', 'status'],
      where: { organizationId },
      _count: true,
    }),
    prisma.complianceAuditLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  // アクションの集計
  const actionSummary = recentAuditLogs.reduce((acc: Record<string, number>, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  return c.json({
    reportDate: new Date().toISOString(),
    retentionPolicies: {
      active: retentionPolicies.length,
      details: retentionPolicies.map(p => ({
        name: p.name,
        dataType: p.dataType,
        retentionDays: p.retentionDays,
        action: p.action,
        lastExecuted: p.executions[0]?.executedAt || null,
      })),
    },
    gdprRequests: {
      summary: gdprRequests,
    },
    dataMasking: {
      activeRules: maskingRules.length,
      rules: maskingRules.map(r => ({
        name: r.name,
        fieldPattern: r.fieldPattern,
        maskingType: r.maskingType,
      })),
    },
    consentManagement: {
      summary: consents,
    },
    auditActivity: {
      last7Days: recentAuditLogs.length,
      actionSummary,
    },
  });
});

// デフォルト設定のセットアップ
app.post('/setup-defaults', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  // デフォルトのデータ保持ポリシー
  const defaultPolicies = [
    { name: 'ログデータ保持', dataType: 'logs', retentionDays: 90, action: 'DELETE' as const },
    { name: 'セッションデータ保持', dataType: 'sessions', retentionDays: 30, action: 'DELETE' as const },
    { name: '注文データアーカイブ', dataType: 'orders', retentionDays: 365, action: 'ARCHIVE' as const },
    { name: '分析データ匿名化', dataType: 'analytics', retentionDays: 180, action: 'ANONYMIZE' as const },
  ];

  // デフォルトのマスキングルール
  const defaultMaskingRules = [
    { name: 'メールアドレス', fieldPattern: '*.email', maskingType: 'PARTIAL' as const, priority: 1 },
    { name: '電話番号', fieldPattern: '*.phone', maskingType: 'PARTIAL' as const, priority: 2 },
    { name: 'クレジットカード', fieldPattern: '*.card_number', maskingType: 'FULL' as const, priority: 3 },
    { name: 'パスワード', fieldPattern: '*.password', maskingType: 'REDACT' as const, priority: 4 },
  ];

  const createdPolicies = [];
  const createdRules = [];

  for (const policy of defaultPolicies) {
    const existing = await prisma.dataRetentionPolicy.findFirst({
      where: { organizationId, dataType: policy.dataType },
    });
    if (!existing) {
      const created = await prisma.dataRetentionPolicy.create({
        data: { ...policy, organizationId, isActive: true },
      });
      createdPolicies.push(created);
    }
  }

  for (const rule of defaultMaskingRules) {
    const existing = await prisma.dataMaskingRule.findFirst({
      where: { organizationId, fieldPattern: rule.fieldPattern },
    });
    if (!existing) {
      const created = await prisma.dataMaskingRule.create({
        data: { ...rule, organizationId, isActive: true },
      });
      createdRules.push(created);
    }
  }

  return c.json({
    success: true,
    created: {
      policies: createdPolicies.length,
      maskingRules: createdRules.length,
    },
  });
});

export const complianceRouter = app;
