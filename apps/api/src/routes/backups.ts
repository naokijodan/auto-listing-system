import { Router } from 'express';
import { prisma, BackupType, ConflictStrategy } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'backups' });

/**
 * バックアップ一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, backupType, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (backupType) where.backupType = backupType;

    const [backups, total] = await Promise.all([
      prisma.backup.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          backupType: true,
          status: true,
          progress: true,
          fileName: true,
          fileSize: true,
          productCount: true,
          listingCount: true,
          orderCount: true,
          isEncrypted: true,
          createdBy: true,
          startedAt: true,
          completedAt: true,
          expiresAt: true,
          createdAt: true,
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.backup.count({ where }),
    ]);

    res.json({
      success: true,
      data: backups.map(b => ({
        ...b,
        fileSize: b.fileSize ? Number(b.fileSize) : null,
      })),
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップ詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup) {
      throw new AppError(404, 'Backup not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        ...backup,
        fileSize: backup.fileSize ? Number(backup.fileSize) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップ作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      backupType = 'FULL',
      includeProducts = true,
      includeListings = true,
      includeOrders = true,
      includeSettings = true,
      includeTemplates = true,
      includeCredentials = false,
      isEncrypted = true,
      expiresInDays,
    } = req.body;

    if (!name) {
      throw new AppError(400, 'name is required', 'INVALID_INPUT');
    }

    // バックアップタイプを検証
    const validTypes = Object.values(BackupType);
    if (!validTypes.includes(backupType)) {
      throw new AppError(400, `Invalid backup type: ${backupType}`, 'INVALID_INPUT');
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const backup = await prisma.backup.create({
      data: {
        name,
        description,
        backupType,
        includeProducts,
        includeListings,
        includeOrders,
        includeSettings,
        includeTemplates,
        includeCredentials,
        isEncrypted,
        expiresAt,
        createdBy: req.headers['x-api-key'] as string,
        status: 'PENDING',
      },
    });

    log.info({ backupId: backup.id, name, backupType }, 'Backup created');

    res.status(201).json({
      success: true,
      data: {
        id: backup.id,
        name: backup.name,
        backupType: backup.backupType,
        status: backup.status,
      },
      message: 'Backup started. Use GET /api/backups/:id to check progress.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップ削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup) {
      throw new AppError(404, 'Backup not found', 'NOT_FOUND');
    }

    await prisma.backup.delete({
      where: { id: req.params.id },
    });

    log.info({ backupId: req.params.id }, 'Backup deleted');

    res.json({
      success: true,
      message: 'Backup deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップダウンロードURL取得
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: req.params.id },
    });

    if (!backup) {
      throw new AppError(404, 'Backup not found', 'NOT_FOUND');
    }

    if (backup.status !== 'COMPLETED') {
      throw new AppError(400, 'Backup is not completed', 'INVALID_OPERATION');
    }

    if (!backup.filePath) {
      throw new AppError(404, 'Backup file not found', 'NOT_FOUND');
    }

    // 実際のプロダクションではS3署名付きURLを生成
    res.json({
      success: true,
      data: {
        fileName: backup.fileName,
        filePath: backup.filePath,
        fileSize: backup.fileSize ? Number(backup.fileSize) : null,
        checksum: backup.checksum,
        isEncrypted: backup.isEncrypted,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * リストアジョブ一覧取得
 */
router.get('/restore/jobs', async (req, res, next) => {
  try {
    const { status, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.restoreJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.restoreJob.count({ where }),
    ]);

    res.json({
      success: true,
      data: jobs,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * リストアジョブ詳細取得
 */
router.get('/restore/jobs/:id', async (req, res, next) => {
  try {
    const job = await prisma.restoreJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      throw new AppError(404, 'Restore job not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * リストア開始
 */
router.post('/restore', async (req, res, next) => {
  try {
    const {
      backupId,
      restoreProducts = true,
      restoreListings = true,
      restoreOrders = false,
      restoreSettings = true,
      restoreTemplates = true,
      conflictStrategy = 'SKIP',
    } = req.body;

    if (!backupId) {
      throw new AppError(400, 'backupId is required', 'INVALID_INPUT');
    }

    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new AppError(404, 'Backup not found', 'NOT_FOUND');
    }

    if (backup.status !== 'COMPLETED') {
      throw new AppError(400, 'Backup is not completed', 'INVALID_OPERATION');
    }

    // 競合解決戦略を検証
    const validStrategies = Object.values(ConflictStrategy);
    if (!validStrategies.includes(conflictStrategy)) {
      throw new AppError(400, `Invalid conflict strategy: ${conflictStrategy}`, 'INVALID_INPUT');
    }

    const job = await prisma.restoreJob.create({
      data: {
        backupId,
        restoreProducts,
        restoreListings,
        restoreOrders,
        restoreSettings,
        restoreTemplates,
        conflictStrategy,
        createdBy: req.headers['x-api-key'] as string,
        status: 'PENDING',
      },
    });

    log.info({ jobId: job.id, backupId }, 'Restore job created');

    res.status(201).json({
      success: true,
      data: {
        id: job.id,
        backupId: job.backupId,
        status: job.status,
      },
      message: 'Restore started. Use GET /api/backups/restore/jobs/:id to check progress.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップスケジュール一覧取得
 */
router.get('/schedules', async (req, res, next) => {
  try {
    const schedules = await prisma.backupSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップスケジュール作成
 */
router.post('/schedules', async (req, res, next) => {
  try {
    const {
      name,
      description,
      cronExpression,
      backupType = 'INCREMENTAL',
      retentionDays = 30,
      maxBackups = 10,
      isEncrypted = true,
    } = req.body;

    if (!name || !cronExpression) {
      throw new AppError(400, 'name and cronExpression are required', 'INVALID_INPUT');
    }

    const schedule = await prisma.backupSchedule.create({
      data: {
        name,
        description,
        cronExpression,
        backupType,
        retentionDays,
        maxBackups,
        isEncrypted,
      },
    });

    log.info({ scheduleId: schedule.id, name }, 'Backup schedule created');

    res.status(201).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップスケジュール更新
 */
router.patch('/schedules/:id', async (req, res, next) => {
  try {
    const { isActive, cronExpression, retentionDays, maxBackups } = req.body;

    const schedule = await prisma.backupSchedule.update({
      where: { id: req.params.id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(cronExpression !== undefined && { cronExpression }),
        ...(retentionDays !== undefined && { retentionDays }),
        ...(maxBackups !== undefined && { maxBackups }),
      },
    });

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップスケジュール削除
 */
router.delete('/schedules/:id', async (req, res, next) => {
  try {
    await prisma.backupSchedule.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Schedule deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バックアップ統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
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

    res.json({
      success: true,
      data: {
        totalBackups: total,
        completedBackups: completed,
        failedBackups: failed,
        totalSize: sizeAgg._sum.fileSize ? Number(sizeAgg._sum.fileSize) : 0,
        lastBackupAt: lastBackup?.completedAt || null,
        successRate: total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0%',
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as backupsRouter };
