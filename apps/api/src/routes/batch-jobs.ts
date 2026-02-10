import { Router } from 'express';
import { prisma, BatchJobType, BatchExecutionStatus } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'batch-jobs' });

/**
 * バッチジョブ一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { jobType, isActive, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (jobType) where.jobType = jobType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [jobs, total] = await Promise.all([
      prisma.batchJob.findMany({
        where,
        include: {
          _count: { select: { executions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.batchJob.count({ where }),
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
 * バッチジョブ詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.batchJob.findUnique({
      where: { id: req.params.id },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            progressPercent: true,
            processedItems: true,
            errorItems: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!job) {
      throw new AppError(404, 'Batch job not found', 'NOT_FOUND');
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
 * バッチジョブ作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      jobType,
      config,
      concurrency = 1,
      stepSize = 100,
      timeout = 3600,
      retryPolicy,
      isScheduled = false,
      cronExpression,
    } = req.body;

    if (!name || !jobType) {
      throw new AppError(400, 'name and jobType are required', 'INVALID_INPUT');
    }

    const validJobTypes = Object.values(BatchJobType);
    if (!validJobTypes.includes(jobType)) {
      throw new AppError(400, `Invalid jobType: ${jobType}`, 'INVALID_INPUT');
    }

    const job = await prisma.batchJob.create({
      data: {
        name,
        description,
        jobType,
        config: config || {},
        concurrency,
        stepSize,
        timeout,
        retryPolicy: retryPolicy || { maxRetries: 3, backoffType: 'exponential', backoffDelay: 1000 },
        isScheduled,
        cronExpression,
      },
    });

    log.info({ jobId: job.id, name, jobType }, 'Batch job created');

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチジョブ更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name,
      description,
      config,
      concurrency,
      stepSize,
      timeout,
      retryPolicy,
      isScheduled,
      cronExpression,
      isActive,
    } = req.body;

    const job = await prisma.batchJob.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(config !== undefined && { config }),
        ...(concurrency !== undefined && { concurrency }),
        ...(stepSize !== undefined && { stepSize }),
        ...(timeout !== undefined && { timeout }),
        ...(retryPolicy !== undefined && { retryPolicy }),
        ...(isScheduled !== undefined && { isScheduled }),
        ...(cronExpression !== undefined && { cronExpression }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチジョブ削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.batchJob.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Batch job deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチ実行開始
 */
router.post('/:id/execute', async (req, res, next) => {
  try {
    const { parameters, estimatedItems } = req.body;

    const job = await prisma.batchJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      throw new AppError(404, 'Batch job not found', 'NOT_FOUND');
    }

    if (!job.isActive) {
      throw new AppError(400, 'Batch job is inactive', 'INVALID_OPERATION');
    }

    const execution = await prisma.batchExecution.create({
      data: {
        jobId: job.id,
        status: 'PENDING',
        estimatedItems,
        progressType: estimatedItems ? 'ESTIMATED' : 'KNOWN',
        parameters: parameters || {},
      },
    });

    // イベントを記録
    await prisma.batchEvent.create({
      data: {
        executionId: execution.id,
        eventType: 'EXECUTION_STARTED',
        data: { jobId: job.id, parameters },
      },
    });

    log.info({ executionId: execution.id, jobId: job.id }, 'Batch execution started');

    res.status(201).json({
      success: true,
      data: {
        executionId: execution.id,
        status: execution.status,
      },
      message: 'Batch execution started',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチ実行一覧取得
 */
router.get('/:id/executions', async (req, res, next) => {
  try {
    const { status, limit = '20', offset = '0' } = req.query;

    const where: any = { jobId: req.params.id };
    if (status) where.status = status;

    const [executions, total] = await Promise.all([
      prisma.batchExecution.findMany({
        where,
        select: {
          id: true,
          status: true,
          progressPercent: true,
          progressType: true,
          totalItems: true,
          estimatedItems: true,
          processedItems: true,
          successItems: true,
          errorItems: true,
          skippedItems: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.batchExecution.count({ where }),
    ]);

    res.json({
      success: true,
      data: executions,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチ実行詳細取得
 */
router.get('/executions/:executionId', async (req, res, next) => {
  try {
    const execution = await prisma.batchExecution.findUnique({
      where: { id: req.params.executionId },
      include: {
        job: { select: { name: true, jobType: true } },
        steps: {
          orderBy: { stepNumber: 'asc' },
          select: {
            id: true,
            stepNumber: true,
            status: true,
            itemCount: true,
            processedCount: true,
            successCount: true,
            errorCount: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!execution) {
      throw new AppError(404, 'Batch execution not found', 'NOT_FOUND');
    }

    // 経過時間と推定残り時間を計算
    const elapsedTime = execution.startedAt
      ? Date.now() - execution.startedAt.getTime()
      : 0;

    let estimatedRemainingTime: number | undefined;
    if (execution.progressPercent > 0 && execution.progressPercent < 100) {
      estimatedRemainingTime = Math.round(
        (elapsedTime / execution.progressPercent) * (100 - execution.progressPercent)
      );
    }

    res.json({
      success: true,
      data: {
        ...execution,
        elapsedTime,
        estimatedRemainingTime,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチ実行の進捗取得
 */
router.get('/executions/:executionId/progress', async (req, res, next) => {
  try {
    const execution = await prisma.batchExecution.findUnique({
      where: { id: req.params.executionId },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        progressType: true,
        totalItems: true,
        estimatedItems: true,
        processedItems: true,
        successItems: true,
        errorItems: true,
        skippedItems: true,
        startedAt: true,
        _count: { select: { steps: true } },
      },
    });

    if (!execution) {
      throw new AppError(404, 'Batch execution not found', 'NOT_FOUND');
    }

    const completedSteps = await prisma.batchStep.count({
      where: {
        executionId: req.params.executionId,
        status: 'COMPLETED',
      },
    });

    const elapsedTime = execution.startedAt
      ? Date.now() - execution.startedAt.getTime()
      : 0;

    let estimatedRemainingTime: number | undefined;
    if (execution.progressPercent > 0 && execution.progressPercent < 100) {
      estimatedRemainingTime = Math.round(
        (elapsedTime / execution.progressPercent) * (100 - execution.progressPercent)
      );
    }

    res.json({
      success: true,
      data: {
        executionId: execution.id,
        status: execution.status,
        progressPercent: execution.progressPercent,
        progressType: execution.progressType,
        totalItems: execution.totalItems,
        estimatedItems: execution.estimatedItems,
        processedItems: execution.processedItems,
        successItems: execution.successItems,
        errorItems: execution.errorItems,
        skippedItems: execution.skippedItems,
        elapsedTime,
        estimatedRemainingTime,
        currentStep: completedSteps,
        totalSteps: execution._count.steps,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチ実行キャンセル
 */
router.post('/executions/:executionId/cancel', async (req, res, next) => {
  try {
    const { reason, cancelledBy } = req.body;

    const execution = await prisma.batchExecution.findUnique({
      where: { id: req.params.executionId },
    });

    if (!execution) {
      throw new AppError(404, 'Batch execution not found', 'NOT_FOUND');
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(execution.status)) {
      throw new AppError(400, `Batch execution already finished: ${execution.status}`, 'INVALID_OPERATION');
    }

    await prisma.batchExecution.update({
      where: { id: req.params.executionId },
      data: {
        cancelRequested: true,
        cancelReason: reason,
        cancelledBy,
      },
    });

    // イベントを記録
    await prisma.batchEvent.create({
      data: {
        executionId: req.params.executionId,
        eventType: 'CANCEL_REQUESTED',
        data: { reason, cancelledBy },
      },
    });

    log.info({ executionId: req.params.executionId, reason }, 'Batch execution cancel requested');

    res.json({
      success: true,
      message: 'Cancel request submitted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチ実行のイベント取得
 */
router.get('/executions/:executionId/events', async (req, res, next) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const events = await prisma.batchEvent.findMany({
      where: { executionId: req.params.executionId },
      orderBy: { timestamp: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチ統計
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const [totalJobs, executions] = await Promise.all([
      prisma.batchJob.count(),
      prisma.batchExecution.findMany({
        where,
        include: {
          job: { select: { jobType: true } },
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const byJobType: Record<string, number> = {};
    let totalProcessingTime = 0;
    let completedCount = 0;
    let successCount = 0;

    for (const exec of executions) {
      byStatus[exec.status] = (byStatus[exec.status] || 0) + 1;
      byJobType[exec.job.jobType] = (byJobType[exec.job.jobType] || 0) + 1;

      if (exec.completedAt && exec.startedAt) {
        totalProcessingTime += exec.completedAt.getTime() - exec.startedAt.getTime();
        completedCount++;
      }

      if (exec.status === 'COMPLETED') {
        successCount++;
      }
    }

    res.json({
      success: true,
      data: {
        totalJobs,
        totalExecutions: executions.length,
        byStatus,
        byJobType,
        averageProcessingTime: completedCount > 0 ? totalProcessingTime / completedCount : 0,
        successRate: executions.length > 0
          ? `${((successCount / executions.length) * 100).toFixed(1)}%`
          : '0%',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * バッチジョブタイプ一覧
 */
router.get('/types', async (_req, res, next) => {
  try {
    const jobTypes = Object.values(BatchJobType).map((type) => ({
      value: type,
      label: getJobTypeLabel(type),
    }));

    res.json({
      success: true,
      data: jobTypes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 実行ステータス一覧
 */
router.get('/statuses', async (_req, res, next) => {
  try {
    const statuses = Object.values(BatchExecutionStatus).map((status) => ({
      value: status,
      label: getStatusLabel(status),
    }));

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function getJobTypeLabel(type: BatchJobType): string {
  const labels: Record<BatchJobType, string> = {
    PRODUCT_SYNC: '商品同期',
    PRICE_UPDATE: '価格更新',
    INVENTORY_CHECK: '在庫チェック',
    ORDER_SYNC: '注文同期',
    IMAGE_PROCESSING: '画像処理',
    LISTING_PUBLISH: '出品公開',
    DATA_EXPORT: 'データエクスポート',
    DATA_IMPORT: 'データインポート',
    CLEANUP: 'クリーンアップ',
    NOTIFICATION_SEND: '通知送信',
    REPORT_GENERATE: 'レポート生成',
    CUSTOM: 'カスタム',
  };
  return labels[type] || type;
}

function getStatusLabel(status: BatchExecutionStatus): string {
  const labels: Record<BatchExecutionStatus, string> = {
    PENDING: '待機中',
    QUEUED: 'キュー投入済み',
    RUNNING: '実行中',
    PAUSED: '一時停止',
    COMPLETED: '完了',
    FAILED: '失敗',
    CANCELLED: 'キャンセル',
    TIMEOUT: 'タイムアウト',
  };
  return labels[status] || status;
}

export { router as batchJobsRouter };
