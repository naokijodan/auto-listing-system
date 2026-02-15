import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 157: eBay Data Backup（データバックアップ）
// ============================================================

// バックアップタイプ
type BackupType = 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL' | 'SELECTIVE';
type BackupStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type BackupTarget = 'LISTINGS' | 'ORDERS' | 'MESSAGES' | 'SETTINGS' | 'TEMPLATES' | 'ALL';
type StorageType = 'LOCAL' | 'S3' | 'GCS' | 'AZURE_BLOB';

// モックデータ
const mockBackups = Array.from({ length: 30 }, (_, i) => {
  const types: BackupType[] = ['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SELECTIVE'];
  const statuses: BackupStatus[] = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'RUNNING', 'FAILED'];
  const targets: BackupTarget[] = ['ALL', 'LISTINGS', 'ORDERS', 'SETTINGS'];

  return {
    id: `backup_${30 - i}`,
    name: `Backup ${30 - i}`,
    type: types[Math.floor(Math.random() * types.length)],
    status: i === 0 ? 'RUNNING' : statuses[Math.floor(Math.random() * statuses.length)],
    target: targets[Math.floor(Math.random() * targets.length)],
    storageType: 'S3' as StorageType,
    storagePath: `backups/ebay/${new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}/`,
    sizeBytes: Math.floor(Math.random() * 500 * 1024 * 1024) + 50 * 1024 * 1024,
    recordCount: Math.floor(Math.random() * 10000) + 1000,
    compressed: true,
    encrypted: true,
    checksum: `sha256:${Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`,
    createdBy: 'system',
    startedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000 - Math.random() * 60 * 60 * 1000).toISOString(),
    completedAt: i === 0 ? null : new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    progress: i === 0 ? Math.floor(Math.random() * 80) + 10 : 100,
    errorMessage: statuses[Math.floor(Math.random() * statuses.length)] === 'FAILED' ? 'Storage quota exceeded' : null,
    metadata: {
      listingsCount: Math.floor(Math.random() * 5000),
      ordersCount: Math.floor(Math.random() * 1000),
      messagesCount: Math.floor(Math.random() * 500),
      templatesCount: Math.floor(Math.random() * 50),
    },
    expiresAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  };
});

// スケジュールモック
const mockSchedules = [
  {
    id: 'schedule_1',
    name: '毎日フルバックアップ',
    type: 'FULL' as BackupType,
    target: 'ALL' as BackupTarget,
    cronExpression: '0 3 * * *',
    timezone: 'Asia/Tokyo',
    enabled: true,
    retentionDays: 30,
    storageType: 'S3' as StorageType,
    storagePath: 'backups/ebay/daily/',
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    nextRunAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'schedule_2',
    name: '毎時増分バックアップ',
    type: 'INCREMENTAL' as BackupType,
    target: 'LISTINGS' as BackupTarget,
    cronExpression: '0 * * * *',
    timezone: 'Asia/Tokyo',
    enabled: true,
    retentionDays: 7,
    storageType: 'S3' as StorageType,
    storagePath: 'backups/ebay/hourly/',
    lastRunAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    nextRunAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'schedule_3',
    name: '週次設定バックアップ',
    type: 'SELECTIVE' as BackupType,
    target: 'SETTINGS' as BackupTarget,
    cronExpression: '0 0 * * 0',
    timezone: 'Asia/Tokyo',
    enabled: false,
    retentionDays: 90,
    storageType: 'S3' as StorageType,
    storagePath: 'backups/ebay/weekly/',
    lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    nextRunAt: null,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// リストアジョブモック
const mockRestoreJobs = Array.from({ length: 10 }, (_, i) => ({
  id: `restore_${10 - i}`,
  backupId: `backup_${Math.floor(Math.random() * 20) + 1}`,
  status: i === 0 ? 'RUNNING' : ['COMPLETED', 'COMPLETED', 'FAILED'][Math.floor(Math.random() * 3)],
  targetEnvironment: 'PRODUCTION',
  includeListings: true,
  includeOrders: true,
  includeMessages: false,
  includeSettings: true,
  includeTemplates: true,
  overwriteExisting: false,
  progress: i === 0 ? Math.floor(Math.random() * 80) + 10 : 100,
  restoredRecords: Math.floor(Math.random() * 5000),
  skippedRecords: Math.floor(Math.random() * 100),
  failedRecords: i === 0 ? 0 : Math.floor(Math.random() * 10),
  startedAt: new Date(Date.now() - i * 3 * 60 * 60 * 1000).toISOString(),
  completedAt: i === 0 ? null : new Date(Date.now() - i * 3 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
  initiatedBy: 'admin@example.com',
  errorMessage: null,
}));

// ストレージ設定モック
const mockStorageConfigs = [
  {
    id: 'storage_1',
    name: 'Primary S3 Bucket',
    type: 'S3' as StorageType,
    endpoint: 's3.ap-northeast-1.amazonaws.com',
    bucket: 'rakuda-backups',
    region: 'ap-northeast-1',
    accessKey: '***hidden***',
    isDefault: true,
    totalSize: 50 * 1024 * 1024 * 1024, // 50GB
    usedSize: 15 * 1024 * 1024 * 1024, // 15GB
    backupCount: 30,
    lastSyncAt: new Date().toISOString(),
  },
  {
    id: 'storage_2',
    name: 'Archive GCS',
    type: 'GCS' as StorageType,
    endpoint: 'storage.googleapis.com',
    bucket: 'rakuda-archive',
    region: 'asia-northeast1',
    accessKey: '***hidden***',
    isDefault: false,
    totalSize: 100 * 1024 * 1024 * 1024,
    usedSize: 45 * 1024 * 1024 * 1024,
    backupCount: 120,
    lastSyncAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================
// エンドポイント
// ============================================================

// 1. バックアップ統計
router.get('/stats', async (_req: Request, res: Response) => {
  const completedBackups = mockBackups.filter(b => b.status === 'COMPLETED');
  const totalSize = completedBackups.reduce((sum, b) => sum + b.sizeBytes, 0);

  res.json({
    success: true,
    data: {
      totalBackups: mockBackups.length,
      completedBackups: completedBackups.length,
      failedBackups: mockBackups.filter(b => b.status === 'FAILED').length,
      runningBackups: mockBackups.filter(b => b.status === 'RUNNING').length,
      totalSizeBytes: totalSize,
      totalSizeFormatted: `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      lastBackupAt: mockBackups.find(b => b.status === 'COMPLETED')?.completedAt,
      schedulesCount: mockSchedules.length,
      activeSchedules: mockSchedules.filter(s => s.enabled).length,
      pendingRestores: mockRestoreJobs.filter(r => r.status === 'RUNNING').length,
      storageUsage: mockStorageConfigs.map(s => ({
        name: s.name,
        usedPercent: ((s.usedSize / s.totalSize) * 100).toFixed(1),
      })),
    },
  });
});

// 2. バックアップ一覧
router.get('/backups', async (req: Request, res: Response) => {
  const { page = '1', limit = '20', type, status, target, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  let filtered = [...mockBackups];

  if (type) {
    filtered = filtered.filter(b => b.type === type);
  }
  if (status) {
    filtered = filtered.filter(b => b.status === status);
  }
  if (target) {
    filtered = filtered.filter(b => b.target === target);
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortBy as keyof typeof a];
    const bVal = b[sortBy as keyof typeof b];
    const order = sortOrder === 'desc' ? -1 : 1;
    return aVal > bVal ? order : -order;
  });

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      backups: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 3. バックアップ詳細
router.get('/backups/:id', async (req: Request, res: Response) => {
  const backup = mockBackups.find(b => b.id === req.params.id);

  if (!backup) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }

  res.json({ success: true, data: backup });
});

// 4. バックアップ作成
router.post('/backups', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    type: z.enum(['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SELECTIVE']),
    target: z.enum(['LISTINGS', 'ORDERS', 'MESSAGES', 'SETTINGS', 'TEMPLATES', 'ALL']),
    storageType: z.enum(['LOCAL', 'S3', 'GCS', 'AZURE_BLOB']).optional(),
    storagePath: z.string().optional(),
    compress: z.boolean().optional(),
    encrypt: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const newBackup = {
    id: `backup_${Date.now()}`,
    name: parsed.data.name || `Backup ${new Date().toISOString()}`,
    type: parsed.data.type,
    status: 'RUNNING' as BackupStatus,
    target: parsed.data.target,
    storageType: parsed.data.storageType || 'S3',
    storagePath: parsed.data.storagePath || `backups/ebay/${new Date().toISOString().split('T')[0]}/`,
    sizeBytes: 0,
    recordCount: 0,
    compressed: parsed.data.compress ?? true,
    encrypted: parsed.data.encrypt ?? true,
    checksum: null,
    createdBy: 'user',
    startedAt: new Date().toISOString(),
    completedAt: null,
    progress: 0,
    errorMessage: null,
    metadata: {},
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  mockBackups.unshift(newBackup);

  res.json({
    success: true,
    message: 'バックアップジョブを開始しました',
    data: newBackup,
  });
});

// 5. バックアップ削除
router.delete('/backups/:id', async (req: Request, res: Response) => {
  const index = mockBackups.findIndex(b => b.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }

  const backup = mockBackups[index];
  if (backup.status === 'RUNNING') {
    return res.status(400).json({ success: false, error: 'Cannot delete running backup' });
  }

  mockBackups.splice(index, 1);

  res.json({
    success: true,
    message: 'バックアップを削除しました',
  });
});

// 6. バックアップキャンセル
router.post('/backups/:id/cancel', async (req: Request, res: Response) => {
  const backup = mockBackups.find(b => b.id === req.params.id);

  if (!backup) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }

  if (backup.status !== 'RUNNING') {
    return res.status(400).json({ success: false, error: 'Backup is not running' });
  }

  backup.status = 'CANCELLED';

  res.json({
    success: true,
    message: 'バックアップをキャンセルしました',
    data: backup,
  });
});

// 7. バックアップ検証
router.post('/backups/:id/verify', async (req: Request, res: Response) => {
  const backup = mockBackups.find(b => b.id === req.params.id);

  if (!backup) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }

  res.json({
    success: true,
    message: 'バックアップの整合性を検証しました',
    data: {
      backupId: backup.id,
      isValid: true,
      checksumMatch: true,
      recordsVerified: backup.recordCount,
      verifiedAt: new Date().toISOString(),
    },
  });
});

// 8. バックアップダウンロード
router.get('/backups/:id/download', async (req: Request, res: Response) => {
  const backup = mockBackups.find(b => b.id === req.params.id);

  if (!backup) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }

  if (backup.status !== 'COMPLETED') {
    return res.status(400).json({ success: false, error: 'Backup is not completed' });
  }

  res.json({
    success: true,
    data: {
      downloadUrl: `https://example.com/downloads/${backup.id}.zip`,
      expiresIn: 3600,
      fileName: `${backup.name.replace(/\s+/g, '_')}.zip`,
      sizeBytes: backup.sizeBytes,
    },
  });
});

// 9. スケジュール一覧
router.get('/schedules', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockSchedules,
  });
});

// 10. スケジュール作成
router.post('/schedules', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    type: z.enum(['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SELECTIVE']),
    target: z.enum(['LISTINGS', 'ORDERS', 'MESSAGES', 'SETTINGS', 'TEMPLATES', 'ALL']),
    cronExpression: z.string(),
    timezone: z.string().optional(),
    retentionDays: z.number().optional(),
    storageType: z.enum(['LOCAL', 'S3', 'GCS', 'AZURE_BLOB']).optional(),
    storagePath: z.string().optional(),
    enabled: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const newSchedule = {
    id: `schedule_${Date.now()}`,
    ...parsed.data,
    timezone: parsed.data.timezone || 'Asia/Tokyo',
    retentionDays: parsed.data.retentionDays || 30,
    storageType: parsed.data.storageType || 'S3',
    storagePath: parsed.data.storagePath || 'backups/ebay/',
    enabled: parsed.data.enabled ?? true,
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  mockSchedules.push(newSchedule);

  res.json({
    success: true,
    message: 'スケジュールを作成しました',
    data: newSchedule,
  });
});

// 11. スケジュール更新
router.put('/schedules/:id', async (req: Request, res: Response) => {
  const schedule = mockSchedules.find(s => s.id === req.params.id);

  if (!schedule) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  const schema = z.object({
    name: z.string().optional(),
    type: z.enum(['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SELECTIVE']).optional(),
    target: z.enum(['LISTINGS', 'ORDERS', 'MESSAGES', 'SETTINGS', 'TEMPLATES', 'ALL']).optional(),
    cronExpression: z.string().optional(),
    timezone: z.string().optional(),
    retentionDays: z.number().optional(),
    storageType: z.enum(['LOCAL', 'S3', 'GCS', 'AZURE_BLOB']).optional(),
    storagePath: z.string().optional(),
    enabled: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  Object.assign(schedule, parsed.data);

  res.json({
    success: true,
    message: 'スケジュールを更新しました',
    data: schedule,
  });
});

// 12. スケジュール削除
router.delete('/schedules/:id', async (req: Request, res: Response) => {
  const index = mockSchedules.findIndex(s => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  mockSchedules.splice(index, 1);

  res.json({
    success: true,
    message: 'スケジュールを削除しました',
  });
});

// 13. スケジュール有効/無効切り替え
router.patch('/schedules/:id/toggle', async (req: Request, res: Response) => {
  const schedule = mockSchedules.find(s => s.id === req.params.id);

  if (!schedule) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  schedule.enabled = !schedule.enabled;
  if (schedule.enabled) {
    schedule.nextRunAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else {
    schedule.nextRunAt = null;
  }

  res.json({
    success: true,
    message: `スケジュールを${schedule.enabled ? '有効' : '無効'}にしました`,
    data: schedule,
  });
});

// 14. 今すぐ実行
router.post('/schedules/:id/run-now', async (req: Request, res: Response) => {
  const schedule = mockSchedules.find(s => s.id === req.params.id);

  if (!schedule) {
    return res.status(404).json({ success: false, error: 'Schedule not found' });
  }

  const newBackup = {
    id: `backup_${Date.now()}`,
    name: `${schedule.name} (手動実行)`,
    type: schedule.type,
    status: 'RUNNING' as BackupStatus,
    target: schedule.target,
    storageType: schedule.storageType,
    storagePath: schedule.storagePath,
    sizeBytes: 0,
    recordCount: 0,
    compressed: true,
    encrypted: true,
    checksum: null,
    createdBy: 'user',
    startedAt: new Date().toISOString(),
    completedAt: null,
    progress: 0,
    errorMessage: null,
    metadata: {},
    expiresAt: new Date(Date.now() + schedule.retentionDays * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  mockBackups.unshift(newBackup);
  schedule.lastRunAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'バックアップを開始しました',
    data: newBackup,
  });
});

// 15. リストアジョブ一覧
router.get('/restore-jobs', async (req: Request, res: Response) => {
  const { page = '1', limit = '10', status } = req.query;

  let filtered = [...mockRestoreJobs];

  if (status) {
    filtered = filtered.filter(r => r.status === status);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    success: true,
    data: {
      restoreJobs: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limitNum),
      },
    },
  });
});

// 16. リストア開始
router.post('/restore', async (req: Request, res: Response) => {
  const schema = z.object({
    backupId: z.string(),
    targetEnvironment: z.enum(['PRODUCTION', 'STAGING', 'DEVELOPMENT']).optional(),
    includeListings: z.boolean().optional(),
    includeOrders: z.boolean().optional(),
    includeMessages: z.boolean().optional(),
    includeSettings: z.boolean().optional(),
    includeTemplates: z.boolean().optional(),
    overwriteExisting: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const backup = mockBackups.find(b => b.id === parsed.data.backupId);
  if (!backup) {
    return res.status(404).json({ success: false, error: 'Backup not found' });
  }

  const newRestore = {
    id: `restore_${Date.now()}`,
    backupId: parsed.data.backupId,
    status: 'RUNNING',
    targetEnvironment: parsed.data.targetEnvironment || 'PRODUCTION',
    includeListings: parsed.data.includeListings ?? true,
    includeOrders: parsed.data.includeOrders ?? true,
    includeMessages: parsed.data.includeMessages ?? false,
    includeSettings: parsed.data.includeSettings ?? true,
    includeTemplates: parsed.data.includeTemplates ?? true,
    overwriteExisting: parsed.data.overwriteExisting ?? false,
    progress: 0,
    restoredRecords: 0,
    skippedRecords: 0,
    failedRecords: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    initiatedBy: 'admin@example.com',
    errorMessage: null,
  };

  mockRestoreJobs.unshift(newRestore);

  res.json({
    success: true,
    message: 'リストアを開始しました',
    data: newRestore,
  });
});

// 17. リストアジョブ詳細
router.get('/restore-jobs/:id', async (req: Request, res: Response) => {
  const restore = mockRestoreJobs.find(r => r.id === req.params.id);

  if (!restore) {
    return res.status(404).json({ success: false, error: 'Restore job not found' });
  }

  res.json({ success: true, data: restore });
});

// 18. リストアキャンセル
router.post('/restore-jobs/:id/cancel', async (req: Request, res: Response) => {
  const restore = mockRestoreJobs.find(r => r.id === req.params.id);

  if (!restore) {
    return res.status(404).json({ success: false, error: 'Restore job not found' });
  }

  if (restore.status !== 'RUNNING') {
    return res.status(400).json({ success: false, error: 'Restore job is not running' });
  }

  restore.status = 'CANCELLED';

  res.json({
    success: true,
    message: 'リストアをキャンセルしました',
    data: restore,
  });
});

// 19. ストレージ設定一覧
router.get('/storage-configs', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockStorageConfigs,
  });
});

// 20. ストレージ設定作成
router.post('/storage-configs', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    type: z.enum(['LOCAL', 'S3', 'GCS', 'AZURE_BLOB']),
    endpoint: z.string(),
    bucket: z.string(),
    region: z.string(),
    accessKey: z.string(),
    secretKey: z.string(),
    isDefault: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const newConfig = {
    id: `storage_${Date.now()}`,
    name: parsed.data.name,
    type: parsed.data.type,
    endpoint: parsed.data.endpoint,
    bucket: parsed.data.bucket,
    region: parsed.data.region,
    accessKey: '***hidden***',
    isDefault: parsed.data.isDefault ?? false,
    totalSize: 0,
    usedSize: 0,
    backupCount: 0,
    lastSyncAt: null,
  };

  if (newConfig.isDefault) {
    mockStorageConfigs.forEach(s => { s.isDefault = false; });
  }

  mockStorageConfigs.push(newConfig);

  res.json({
    success: true,
    message: 'ストレージ設定を作成しました',
    data: newConfig,
  });
});

// 21. ストレージ設定削除
router.delete('/storage-configs/:id', async (req: Request, res: Response) => {
  const index = mockStorageConfigs.findIndex(s => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Storage config not found' });
  }

  if (mockStorageConfigs[index].isDefault) {
    return res.status(400).json({ success: false, error: 'Cannot delete default storage' });
  }

  mockStorageConfigs.splice(index, 1);

  res.json({
    success: true,
    message: 'ストレージ設定を削除しました',
  });
});

// 22. ストレージ接続テスト
router.post('/storage-configs/:id/test', async (req: Request, res: Response) => {
  const config = mockStorageConfigs.find(s => s.id === req.params.id);

  if (!config) {
    return res.status(404).json({ success: false, error: 'Storage config not found' });
  }

  res.json({
    success: true,
    message: '接続テストに成功しました',
    data: {
      connected: true,
      latency: Math.floor(Math.random() * 100) + 50,
      permissions: { read: true, write: true, delete: true },
    },
  });
});

// 23. クイックエクスポート
router.post('/quick-export', async (req: Request, res: Response) => {
  const schema = z.object({
    target: z.enum(['LISTINGS', 'ORDERS', 'MESSAGES', 'SETTINGS', 'TEMPLATES']),
    format: z.enum(['JSON', 'CSV', 'ZIP']),
    filters: z.record(z.string()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  res.json({
    success: true,
    message: 'エクスポートを開始しました',
    data: {
      exportId: `export_${Date.now()}`,
      target: parsed.data.target,
      format: parsed.data.format,
      status: 'PROCESSING',
      estimatedRecords: Math.floor(Math.random() * 5000) + 100,
    },
  });
});

// 24. バックアップ比較
router.post('/compare', async (req: Request, res: Response) => {
  const schema = z.object({
    backupId1: z.string(),
    backupId2: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  res.json({
    success: true,
    data: {
      backup1: parsed.data.backupId1,
      backup2: parsed.data.backupId2,
      differences: {
        addedRecords: Math.floor(Math.random() * 100),
        modifiedRecords: Math.floor(Math.random() * 50),
        deletedRecords: Math.floor(Math.random() * 20),
        unchangedRecords: Math.floor(Math.random() * 5000),
      },
      comparedAt: new Date().toISOString(),
    },
  });
});

// 25. クリーンアップ（古いバックアップ削除）
router.post('/cleanup', async (req: Request, res: Response) => {
  const schema = z.object({
    olderThanDays: z.number().min(1),
    dryRun: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const cutoffDate = new Date(Date.now() - parsed.data.olderThanDays * 24 * 60 * 60 * 1000);
  const toDelete = mockBackups.filter(b => new Date(b.createdAt) < cutoffDate);

  res.json({
    success: true,
    message: parsed.data.dryRun
      ? `${toDelete.length}件のバックアップが削除対象です（ドライラン）`
      : `${toDelete.length}件のバックアップを削除しました`,
    data: {
      deletedCount: toDelete.length,
      freedBytes: toDelete.reduce((sum, b) => sum + b.sizeBytes, 0),
      dryRun: parsed.data.dryRun ?? false,
    },
  });
});

export const ebayDataBackupRouter = router;
