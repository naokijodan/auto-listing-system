import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// Phase 163: Audit Compliance（監査コンプライアンス）
// ============================================

// --- コンプライアンスルール ---
const complianceRules = [
  {
    id: 'rule_001',
    name: 'データ保持ポリシー',
    category: 'DATA_RETENTION',
    description: '個人情報は3年以上保持しない',
    severity: 'HIGH',
    enabled: true,
    autoRemediate: false,
    checkFrequency: 'DAILY',
    lastCheck: '2026-02-15T08:00:00Z',
    status: 'COMPLIANT',
    violations: 0,
  },
  {
    id: 'rule_002',
    name: 'アクセス制御',
    category: 'ACCESS_CONTROL',
    description: '管理者権限は最小限に制限',
    severity: 'CRITICAL',
    enabled: true,
    autoRemediate: true,
    checkFrequency: 'HOURLY',
    lastCheck: '2026-02-15T09:30:00Z',
    status: 'COMPLIANT',
    violations: 0,
  },
  {
    id: 'rule_003',
    name: '暗号化要件',
    category: 'ENCRYPTION',
    description: 'すべての機密データは暗号化が必要',
    severity: 'CRITICAL',
    enabled: true,
    autoRemediate: false,
    checkFrequency: 'DAILY',
    lastCheck: '2026-02-15T06:00:00Z',
    status: 'NON_COMPLIANT',
    violations: 2,
  },
  {
    id: 'rule_004',
    name: '監査ログ保持',
    category: 'AUDIT_LOG',
    description: '監査ログは最低1年間保持',
    severity: 'HIGH',
    enabled: true,
    autoRemediate: false,
    checkFrequency: 'WEEKLY',
    lastCheck: '2026-02-10T00:00:00Z',
    status: 'COMPLIANT',
    violations: 0,
  },
  {
    id: 'rule_005',
    name: 'パスワードポリシー',
    category: 'AUTHENTICATION',
    description: 'パスワードは12文字以上、複雑性要件あり',
    severity: 'HIGH',
    enabled: true,
    autoRemediate: true,
    checkFrequency: 'DAILY',
    lastCheck: '2026-02-15T07:00:00Z',
    status: 'WARNING',
    violations: 5,
  },
];

// ルール一覧取得
router.get('/rules', (req, res) => {
  const { category, status, enabled } = req.query;

  let filtered = [...complianceRules];

  if (category) {
    filtered = filtered.filter(r => r.category === category);
  }
  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }
  if (enabled !== undefined) {
    filtered = filtered.filter(r => r.enabled === (enabled === 'true'));
  }

  res.json({
    rules: filtered,
    total: filtered.length,
    summary: {
      compliant: filtered.filter(r => r.status === 'COMPLIANT').length,
      nonCompliant: filtered.filter(r => r.status === 'NON_COMPLIANT').length,
      warning: filtered.filter(r => r.status === 'WARNING').length,
    },
  });
});

// ルール詳細取得
router.get('/rules/:id', (req, res) => {
  const rule = complianceRules.find(r => r.id === req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  res.json(rule);
});

// ルール作成
router.post('/rules', (req, res) => {
  const schema = z.object({
    name: z.string(),
    category: z.enum(['DATA_RETENTION', 'ACCESS_CONTROL', 'ENCRYPTION', 'AUDIT_LOG', 'AUTHENTICATION', 'CUSTOM']),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    checkFrequency: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']),
    autoRemediate: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  const newRule = {
    id: `rule_${Date.now()}`,
    ...parsed.data,
    enabled: true,
    autoRemediate: parsed.data.autoRemediate ?? false,
    lastCheck: null,
    status: 'PENDING',
    violations: 0,
  };

  res.status(201).json(newRule);
});

// ルール更新
router.put('/rules/:id', (req, res) => {
  const rule = complianceRules.find(r => r.id === req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({ ...rule, ...req.body, id: rule.id });
});

// ルール削除
router.delete('/rules/:id', (req, res) => {
  res.json({ success: true, message: 'Rule deleted' });
});

// ルール有効/無効切替
router.post('/rules/:id/toggle', (req, res) => {
  const rule = complianceRules.find(r => r.id === req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({ ...rule, enabled: !rule.enabled });
});

// 手動チェック実行
router.post('/rules/:id/check', (req, res) => {
  const rule = complianceRules.find(r => r.id === req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  res.json({
    ruleId: rule.id,
    checkId: `check_${Date.now()}`,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    message: 'Compliance check started',
  });
});

// --- 違反（Violations）---
const violations = [
  {
    id: 'vio_001',
    ruleId: 'rule_003',
    ruleName: '暗号化要件',
    resource: 'database.customers.email',
    resourceType: 'DATABASE_FIELD',
    severity: 'CRITICAL',
    status: 'OPEN',
    detectedAt: '2026-02-15T06:00:00Z',
    description: '顧客メールアドレスが平文で保存されています',
    remediation: 'AES-256暗号化を適用してください',
    assignee: null,
  },
  {
    id: 'vio_002',
    ruleId: 'rule_003',
    ruleName: '暗号化要件',
    resource: 'storage.backups.2026-02-14',
    resourceType: 'STORAGE',
    severity: 'CRITICAL',
    status: 'IN_PROGRESS',
    detectedAt: '2026-02-15T06:00:00Z',
    description: 'バックアップファイルが暗号化されていません',
    remediation: 'バックアップ時に暗号化を有効にしてください',
    assignee: 'admin@example.com',
  },
  {
    id: 'vio_003',
    ruleId: 'rule_005',
    ruleName: 'パスワードポリシー',
    resource: 'user.user_123',
    resourceType: 'USER',
    severity: 'HIGH',
    status: 'OPEN',
    detectedAt: '2026-02-15T07:00:00Z',
    description: 'ユーザーのパスワードが要件を満たしていません',
    remediation: 'パスワードの変更を要求してください',
    assignee: null,
  },
];

// 違反一覧取得
router.get('/violations', (req, res) => {
  const { status, severity, ruleId, page = '1', limit = '20' } = req.query;

  let filtered = [...violations];

  if (status) {
    filtered = filtered.filter(v => v.status === status);
  }
  if (severity) {
    filtered = filtered.filter(v => v.severity === severity);
  }
  if (ruleId) {
    filtered = filtered.filter(v => v.ruleId === ruleId);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  res.json({
    violations: filtered.slice(offset, offset + limitNum),
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
    summary: {
      open: filtered.filter(v => v.status === 'OPEN').length,
      inProgress: filtered.filter(v => v.status === 'IN_PROGRESS').length,
      resolved: filtered.filter(v => v.status === 'RESOLVED').length,
      bySeverity: {
        critical: filtered.filter(v => v.severity === 'CRITICAL').length,
        high: filtered.filter(v => v.severity === 'HIGH').length,
        medium: filtered.filter(v => v.severity === 'MEDIUM').length,
        low: filtered.filter(v => v.severity === 'LOW').length,
      },
    },
  });
});

// 違反詳細取得
router.get('/violations/:id', (req, res) => {
  const violation = violations.find(v => v.id === req.params.id);
  if (!violation) {
    return res.status(404).json({ error: 'Violation not found' });
  }
  res.json(violation);
});

// 違反ステータス更新
router.put('/violations/:id/status', (req, res) => {
  const violation = violations.find(v => v.id === req.params.id);
  if (!violation) {
    return res.status(404).json({ error: 'Violation not found' });
  }

  const schema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK', 'FALSE_POSITIVE']),
    comment: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({ ...violation, status: parsed.data.status });
});

// 違反担当者割当
router.put('/violations/:id/assign', (req, res) => {
  const violation = violations.find(v => v.id === req.params.id);
  if (!violation) {
    return res.status(404).json({ error: 'Violation not found' });
  }

  const schema = z.object({
    assignee: z.string().email(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.json({ ...violation, assignee: parsed.data.assignee });
});

// --- 監査レポート ---
const auditReports = [
  {
    id: 'report_001',
    name: 'Q1 2026 コンプライアンスレポート',
    type: 'QUARTERLY',
    period: { start: '2026-01-01', end: '2026-03-31' },
    status: 'DRAFT',
    createdAt: '2026-02-15T10:00:00Z',
    generatedBy: 'admin@example.com',
    summary: {
      totalRules: 5,
      compliant: 3,
      nonCompliant: 1,
      warning: 1,
      score: 75,
    },
  },
  {
    id: 'report_002',
    name: '2025年度 年次監査レポート',
    type: 'ANNUAL',
    period: { start: '2025-01-01', end: '2025-12-31' },
    status: 'PUBLISHED',
    createdAt: '2026-01-15T10:00:00Z',
    generatedBy: 'compliance@example.com',
    summary: {
      totalRules: 5,
      compliant: 4,
      nonCompliant: 0,
      warning: 1,
      score: 92,
    },
  },
];

// レポート一覧取得
router.get('/reports', (req, res) => {
  const { type, status } = req.query;

  let filtered = [...auditReports];

  if (type) {
    filtered = filtered.filter(r => r.type === type);
  }
  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }

  res.json({
    reports: filtered,
    total: filtered.length,
  });
});

// レポート詳細取得
router.get('/reports/:id', (req, res) => {
  const report = auditReports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

// レポート生成
router.post('/reports/generate', (req, res) => {
  const schema = z.object({
    name: z.string(),
    type: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']),
    period: z.object({
      start: z.string(),
      end: z.string(),
    }),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `report_${Date.now()}`,
    ...parsed.data,
    status: 'GENERATING',
    createdAt: new Date().toISOString(),
    generatedBy: 'current_user@example.com',
    message: 'Report generation started',
  });
});

// レポート公開
router.post('/reports/:id/publish', (req, res) => {
  const report = auditReports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.json({ ...report, status: 'PUBLISHED', publishedAt: new Date().toISOString() });
});

// レポートエクスポート
router.get('/reports/:id/export', (req, res) => {
  const { format = 'PDF' } = req.query;

  res.json({
    reportId: req.params.id,
    format,
    downloadUrl: `https://example.com/reports/${req.params.id}.${(format as string).toLowerCase()}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
});

// --- コンプライアンスダッシュボード ---
router.get('/dashboard', (req, res) => {
  res.json({
    overallScore: 78,
    trend: 'IMPROVING',
    rulesSummary: {
      total: 5,
      enabled: 5,
      disabled: 0,
    },
    complianceSummary: {
      compliant: 3,
      nonCompliant: 1,
      warning: 1,
    },
    violationsSummary: {
      total: 7,
      open: 4,
      inProgress: 2,
      resolved: 1,
    },
    recentActivity: [
      { type: 'VIOLATION_DETECTED', message: '新しい違反が検出されました', timestamp: '2026-02-15T09:00:00Z' },
      { type: 'RULE_CHECK_COMPLETED', message: 'アクセス制御チェックが完了', timestamp: '2026-02-15T09:30:00Z' },
      { type: 'VIOLATION_RESOLVED', message: '違反が解決されました', timestamp: '2026-02-15T08:00:00Z' },
    ],
    upcomingChecks: [
      { ruleId: 'rule_001', ruleName: 'データ保持ポリシー', scheduledAt: '2026-02-16T08:00:00Z' },
      { ruleId: 'rule_004', ruleName: '監査ログ保持', scheduledAt: '2026-02-17T00:00:00Z' },
    ],
  });
});

// --- 規制フレームワーク ---
const frameworks = [
  { id: 'gdpr', name: 'GDPR', description: 'EU一般データ保護規則', enabled: true, mappedRules: 3 },
  { id: 'pci_dss', name: 'PCI DSS', description: 'クレジットカード業界データセキュリティ基準', enabled: true, mappedRules: 2 },
  { id: 'hipaa', name: 'HIPAA', description: '医療保険の携行性と責任に関する法律', enabled: false, mappedRules: 0 },
  { id: 'soc2', name: 'SOC 2', description: 'サービス組織統制2', enabled: true, mappedRules: 4 },
];

router.get('/frameworks', (req, res) => {
  res.json({
    frameworks,
    total: frameworks.length,
  });
});

router.get('/frameworks/:id', (req, res) => {
  const framework = frameworks.find(f => f.id === req.params.id);
  if (!framework) {
    return res.status(404).json({ error: 'Framework not found' });
  }
  res.json(framework);
});

router.post('/frameworks/:id/toggle', (req, res) => {
  const framework = frameworks.find(f => f.id === req.params.id);
  if (!framework) {
    return res.status(404).json({ error: 'Framework not found' });
  }
  res.json({ ...framework, enabled: !framework.enabled });
});

// --- 証跡（Evidence）管理 ---
router.get('/evidence', (req, res) => {
  res.json({
    evidence: [
      {
        id: 'ev_001',
        type: 'SCREENSHOT',
        description: 'アクセス制御設定のスクリーンショット',
        ruleId: 'rule_002',
        uploadedBy: 'admin@example.com',
        uploadedAt: '2026-02-15T10:00:00Z',
        fileUrl: 'https://example.com/evidence/ev_001.png',
      },
      {
        id: 'ev_002',
        type: 'DOCUMENT',
        description: '暗号化ポリシー文書',
        ruleId: 'rule_003',
        uploadedBy: 'security@example.com',
        uploadedAt: '2026-02-14T14:00:00Z',
        fileUrl: 'https://example.com/evidence/ev_002.pdf',
      },
    ],
    total: 2,
  });
});

router.post('/evidence', (req, res) => {
  const schema = z.object({
    type: z.enum(['SCREENSHOT', 'DOCUMENT', 'LOG', 'REPORT', 'OTHER']),
    description: z.string(),
    ruleId: z.string().optional(),
    violationId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  res.status(201).json({
    id: `ev_${Date.now()}`,
    ...parsed.data,
    uploadedBy: 'current_user@example.com',
    uploadedAt: new Date().toISOString(),
    uploadUrl: `https://example.com/upload/${Date.now()}`,
  });
});

export { router as ebayAuditComplianceRouter };
