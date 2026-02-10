import { prisma, BackupType, BackupStatus, RestoreStatus, ConflictStrategy } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const log = logger.child({ module: 'backup-service' });

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/rakuda-backups';

interface BackupOptions {
  name: string;
  description?: string;
  backupType?: BackupType;
  includeProducts?: boolean;
  includeListings?: boolean;
  includeOrders?: boolean;
  includeSettings?: boolean;
  includeTemplates?: boolean;
  includeCredentials?: boolean;
  isEncrypted?: boolean;
  createdBy?: string;
}

interface BackupData {
  version: string;
  createdAt: string;
  backupType: BackupType;
  data: {
    products?: any[];
    listings?: any[];
    orders?: any[];
    settings?: any[];
    templates?: any[];
    credentials?: any[];
  };
  metadata: {
    productCount: number;
    listingCount: number;
    orderCount: number;
    settingCount: number;
  };
}

/**
 * バックアップを作成
 */
export async function createBackup(options: BackupOptions): Promise<{
  id: string;
  fileName: string;
  status: BackupStatus;
}> {
  const backup = await prisma.backup.create({
    data: {
      name: options.name,
      description: options.description,
      backupType: options.backupType || 'FULL',
      includeProducts: options.includeProducts ?? true,
      includeListings: options.includeListings ?? true,
      includeOrders: options.includeOrders ?? true,
      includeSettings: options.includeSettings ?? true,
      includeTemplates: options.includeTemplates ?? true,
      includeCredentials: options.includeCredentials ?? false,
      isEncrypted: options.isEncrypted ?? true,
      createdBy: options.createdBy,
      status: 'PENDING',
    },
  });

  // 非同期でバックアップ実行
  setImmediate(() => executeBackup(backup.id));

  return {
    id: backup.id,
    fileName: `backup_${backup.id}.json`,
    status: 'PENDING',
  };
}

/**
 * バックアップを実行
 */
async function executeBackup(backupId: string): Promise<void> {
  const backup = await prisma.backup.findUnique({
    where: { id: backupId },
  });

  if (!backup) {
    log.error({ backupId }, 'Backup not found');
    return;
  }

  await prisma.backup.update({
    where: { id: backupId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  try {
    const backupData: BackupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      backupType: backup.backupType,
      data: {},
      metadata: {
        productCount: 0,
        listingCount: 0,
        orderCount: 0,
        settingCount: 0,
      },
    };

    let progress = 0;
    const totalSteps = 5;

    // 商品データ
    if (backup.includeProducts) {
      const products = await prisma.product.findMany({
        include: { source: true },
      });
      backupData.data.products = products;
      backupData.metadata.productCount = products.length;
      progress++;
      await updateProgress(backupId, Math.floor((progress / totalSteps) * 100));
    }

    // 出品データ
    if (backup.includeListings) {
      const listings = await prisma.listing.findMany();
      backupData.data.listings = listings;
      backupData.metadata.listingCount = listings.length;
      progress++;
      await updateProgress(backupId, Math.floor((progress / totalSteps) * 100));
    }

    // 注文データ
    if (backup.includeOrders) {
      const orders = await prisma.order.findMany({
        include: { sales: true },
      });
      backupData.data.orders = orders;
      backupData.metadata.orderCount = orders.length;
      progress++;
      await updateProgress(backupId, Math.floor((progress / totalSteps) * 100));
    }

    // 設定データ
    if (backup.includeSettings) {
      const settings = await prisma.systemSetting.findMany();
      backupData.data.settings = settings.map(s => ({
        ...s,
        value: s.isSecret ? '[ENCRYPTED]' : s.value,
      }));
      backupData.metadata.settingCount = settings.length;
      progress++;
      await updateProgress(backupId, Math.floor((progress / totalSteps) * 100));
    }

    // テンプレートデータ
    if (backup.includeTemplates) {
      const templates = await prisma.listingTemplate.findMany();
      const prompts = await prisma.translationPrompt.findMany();
      const messageTemplates = await prisma.messageTemplate.findMany();
      backupData.data.templates = { templates, prompts, messageTemplates } as any;
      progress++;
      await updateProgress(backupId, Math.floor((progress / totalSteps) * 100));
    }

    // ファイル保存
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const fileName = `backup_${backupId}_${Date.now()}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    let content = JSON.stringify(backupData, null, 2);

    // 暗号化
    if (backup.isEncrypted) {
      content = encryptData(content);
    }

    await fs.writeFile(filePath, content);

    const stats = await fs.stat(filePath);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    await prisma.backup.update({
      where: { id: backupId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        fileName,
        filePath,
        fileSize: BigInt(stats.size),
        checksum,
        productCount: backupData.metadata.productCount,
        listingCount: backupData.metadata.listingCount,
        orderCount: backupData.metadata.orderCount,
        settingCount: backupData.metadata.settingCount,
        completedAt: new Date(),
      },
    });

    log.info({
      backupId,
      fileName,
      productCount: backupData.metadata.productCount,
      listingCount: backupData.metadata.listingCount,
    }, 'Backup completed');

  } catch (error: any) {
    log.error({ backupId, error: error.message }, 'Backup failed');

    await prisma.backup.update({
      where: { id: backupId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });
  }
}

/**
 * リストアを開始
 */
export async function startRestore(options: {
  backupId?: string;
  uploadedFile?: string;
  restoreProducts?: boolean;
  restoreListings?: boolean;
  restoreOrders?: boolean;
  restoreSettings?: boolean;
  restoreTemplates?: boolean;
  conflictStrategy?: ConflictStrategy;
  createdBy?: string;
}): Promise<{ id: string; status: RestoreStatus }> {
  const restore = await prisma.restoreJob.create({
    data: {
      backupId: options.backupId,
      uploadedFile: options.uploadedFile,
      restoreProducts: options.restoreProducts ?? true,
      restoreListings: options.restoreListings ?? true,
      restoreOrders: options.restoreOrders ?? false,
      restoreSettings: options.restoreSettings ?? true,
      restoreTemplates: options.restoreTemplates ?? true,
      conflictStrategy: options.conflictStrategy || 'SKIP',
      createdBy: options.createdBy,
      status: 'PENDING',
    },
  });

  // 非同期でリストア実行
  setImmediate(() => executeRestore(restore.id));

  return { id: restore.id, status: 'PENDING' };
}

/**
 * リストアを実行
 */
async function executeRestore(restoreId: string): Promise<void> {
  const restore = await prisma.restoreJob.findUnique({
    where: { id: restoreId },
  });

  if (!restore) {
    log.error({ restoreId }, 'Restore job not found');
    return;
  }

  await prisma.restoreJob.update({
    where: { id: restoreId },
    data: { status: 'VALIDATING', startedAt: new Date() },
  });

  try {
    // バックアップファイルを読み込み
    let filePath: string;

    if (restore.backupId) {
      const backup = await prisma.backup.findUnique({
        where: { id: restore.backupId },
      });
      if (!backup || !backup.filePath) {
        throw new Error('Backup file not found');
      }
      filePath = backup.filePath;
    } else if (restore.uploadedFile) {
      filePath = restore.uploadedFile;
    } else {
      throw new Error('No backup source specified');
    }

    let content = await fs.readFile(filePath, 'utf-8');

    // 復号化を試行
    try {
      content = decryptData(content);
    } catch {
      // 暗号化されていない場合はそのまま
    }

    const backupData: BackupData = JSON.parse(content);

    // バリデーション
    if (!backupData.version || !backupData.data) {
      throw new Error('Invalid backup file format');
    }

    await prisma.restoreJob.update({
      where: { id: restoreId },
      data: { status: 'IN_PROGRESS' },
    });

    let totalItems = 0;
    let processedItems = 0;
    let skippedItems = 0;
    let failedItems = 0;
    const errorDetails: any[] = [];

    // 設定のリストア
    if (restore.restoreSettings && backupData.data.settings) {
      for (const setting of backupData.data.settings) {
        totalItems++;
        try {
          if (setting.value === '[ENCRYPTED]') {
            skippedItems++;
            continue;
          }

          const existing = await prisma.systemSetting.findUnique({
            where: { key: setting.key },
          });

          if (existing) {
            if (restore.conflictStrategy === 'SKIP') {
              skippedItems++;
              continue;
            } else if (restore.conflictStrategy === 'OVERWRITE') {
              await prisma.systemSetting.update({
                where: { key: setting.key },
                data: { value: setting.value },
              });
            }
          } else {
            await prisma.systemSetting.create({
              data: {
                key: setting.key,
                category: setting.category,
                value: setting.value,
                valueType: setting.valueType,
                defaultValue: setting.defaultValue,
                label: setting.label,
                description: setting.description,
              },
            });
          }
          processedItems++;
        } catch (error: any) {
          failedItems++;
          errorDetails.push({ type: 'setting', key: setting.key, error: error.message });
        }
      }
    }

    await prisma.restoreJob.update({
      where: { id: restoreId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        totalItems,
        processedItems,
        skippedItems,
        failedItems,
        errorDetails: errorDetails as any,
        completedAt: new Date(),
      },
    });

    log.info({
      restoreId,
      totalItems,
      processedItems,
      skippedItems,
      failedItems,
    }, 'Restore completed');

  } catch (error: any) {
    log.error({ restoreId, error: error.message }, 'Restore failed');

    await prisma.restoreJob.update({
      where: { id: restoreId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });
  }
}

/**
 * バックアップスケジュールを作成
 */
export async function createBackupSchedule(options: {
  name: string;
  description?: string;
  cronExpression: string;
  backupType?: BackupType;
  retentionDays?: number;
  maxBackups?: number;
}): Promise<{ id: string }> {
  const nextRunAt = calculateNextRun(options.cronExpression);

  const schedule = await prisma.backupSchedule.create({
    data: {
      name: options.name,
      description: options.description,
      cronExpression: options.cronExpression,
      backupType: options.backupType || 'INCREMENTAL',
      retentionDays: options.retentionDays || 30,
      maxBackups: options.maxBackups || 10,
      nextRunAt,
    },
  });

  log.info({ scheduleId: schedule.id, name: options.name }, 'Backup schedule created');

  return { id: schedule.id };
}

/**
 * 期限切れバックアップを削除
 */
export async function cleanupExpiredBackups(): Promise<number> {
  const now = new Date();

  const expired = await prisma.backup.findMany({
    where: {
      expiresAt: { lt: now },
      status: 'COMPLETED',
    },
  });

  for (const backup of expired) {
    if (backup.filePath) {
      try {
        await fs.unlink(backup.filePath);
      } catch {
        // ファイルが既に削除されている場合は無視
      }
    }

    await prisma.backup.update({
      where: { id: backup.id },
      data: { status: 'EXPIRED' },
    });
  }

  log.info({ count: expired.length }, 'Expired backups cleaned up');

  return expired.length;
}

/**
 * バックアップ統計を取得
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  completedBackups: number;
  failedBackups: number;
  totalSize: bigint;
  lastBackupAt: Date | null;
}> {
  const [total, completed, failed, sizeAgg, lastBackup] = await Promise.all([
    prisma.backup.count(),
    prisma.backup.count({ where: { status: 'COMPLETED' } }),
    prisma.backup.count({ where: { status: 'FAILED' } }),
    prisma.backup.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { fileSize: true },
    }),
    prisma.backup.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    }),
  ]);

  return {
    totalBackups: total,
    completedBackups: completed,
    failedBackups: failed,
    totalSize: sizeAgg._sum.fileSize || BigInt(0),
    lastBackupAt: lastBackup?.completedAt || null,
  };
}

// ヘルパー関数

async function updateProgress(backupId: string, progress: number): Promise<void> {
  await prisma.backup.update({
    where: { id: backupId },
    data: { progress },
  });
}

function encryptData(data: string): string {
  const key = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(key, 'salt', 32), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptData(data: string): string {
  const key = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';
  const [ivHex, encrypted] = data.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(key, 'salt', 32), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function calculateNextRun(cronExpression: string): Date {
  // 簡易実装: 次の実行時刻を計算
  // 実際のプロダクションではnode-cronやcron-parserを使用
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  now.setSeconds(0);
  return now;
}
