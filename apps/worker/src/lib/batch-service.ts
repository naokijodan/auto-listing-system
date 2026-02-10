/**
 * バッチ処理最適化サービス
 * Phase 29: 並列実行・進捗追跡・キャンセル機能
 */

import {
  prisma,
  BatchJobType,
  BatchExecutionStatus,
  BatchStepStatus,
  BatchProgressType,
  BatchEventType,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';

const log = logger.child({ module: 'batch-service' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// バッチキュー
const batchQueue = new Queue('batch-processing', { connection: redis });

// バッチジョブ定義
export interface BatchJobDefinition {
  name: string;
  description?: string;
  jobType: BatchJobType;
  config?: Record<string, unknown>;
  concurrency?: number;
  stepSize?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

// リトライポリシー
export interface RetryPolicy {
  maxRetries: number;
  backoffType: 'fixed' | 'exponential';
  backoffDelay: number;
}

// 実行パラメータ
export interface ExecutionParams {
  filter?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

// 進捗情報
export interface ProgressInfo {
  executionId: string;
  status: BatchExecutionStatus;
  progressPercent: number;
  progressType: BatchProgressType;
  totalItems: number | null;
  estimatedItems: number | null;
  processedItems: number;
  successItems: number;
  errorItems: number;
  skippedItems: number;
  elapsedTime?: number;
  estimatedRemainingTime?: number;
  currentStep?: number;
  totalSteps?: number;
}

// ステップ処理関数の型
export type StepProcessor<T> = (
  items: T[],
  context: StepContext
) => Promise<StepResult>;

// ステップコンテキスト
export interface StepContext {
  executionId: string;
  stepNumber: number;
  startOffset: number;
  endOffset: number;
  isCancelled: () => Promise<boolean>;
}

// ステップ結果
export interface StepResult {
  processedCount: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors?: Array<{ item: unknown; error: string }>;
  output?: unknown;
}

/**
 * バッチジョブを作成
 */
export async function createBatchJob(definition: BatchJobDefinition): Promise<string> {
  const job = await prisma.batchJob.create({
    data: {
      name: definition.name,
      description: definition.description,
      jobType: definition.jobType,
      config: (definition.config || {}) as any,
      concurrency: definition.concurrency || 1,
      stepSize: definition.stepSize || 100,
      timeout: definition.timeout || 3600,
      retryPolicy: (definition.retryPolicy || {
        maxRetries: 3,
        backoffType: 'exponential',
        backoffDelay: 1000,
      }) as any,
    },
  });

  log.info({ jobId: job.id, name: definition.name, jobType: definition.jobType }, 'Batch job created');

  return job.id;
}

/**
 * バッチ実行を開始
 */
export async function startBatchExecution(
  jobId: string,
  params?: ExecutionParams,
  estimatedItems?: number
): Promise<string> {
  const job = await prisma.batchJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error(`Batch job not found: ${jobId}`);
  }

  if (!job.isActive) {
    throw new Error(`Batch job is inactive: ${jobId}`);
  }

  // 実行レコードを作成
  const execution = await prisma.batchExecution.create({
    data: {
      jobId,
      status: 'PENDING',
      estimatedItems,
      progressType: estimatedItems ? 'ESTIMATED' : 'KNOWN',
      parameters: (params || {}) as any,
    },
  });

  // イベントを記録
  await recordEvent(execution.id, null, 'EXECUTION_STARTED', { jobId, params });

  // BullMQキューに投入
  const queueJob = await batchQueue.add(
    'process-batch',
    {
      executionId: execution.id,
      jobId,
      params,
      timeoutMs: job.timeout * 1000, // タイムアウトをデータに含める
    },
    {
      attempts: (job.retryPolicy as any)?.maxRetries || 3,
      backoff: {
        type: (job.retryPolicy as any)?.backoffType || 'exponential',
        delay: (job.retryPolicy as any)?.backoffDelay || 1000,
      },
    }
  );

  // キューされたことを更新
  await prisma.batchExecution.update({
    where: { id: execution.id },
    data: {
      status: 'QUEUED',
      queueJobId: queueJob.id,
    },
  });

  log.info({ executionId: execution.id, jobId, queueJobId: queueJob.id }, 'Batch execution queued');

  return execution.id;
}

/**
 * バッチ実行をキャンセル
 */
export async function cancelBatchExecution(
  executionId: string,
  reason?: string,
  cancelledBy?: string
): Promise<boolean> {
  const execution = await prisma.batchExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) {
    throw new Error(`Batch execution not found: ${executionId}`);
  }

  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(execution.status)) {
    throw new Error(`Batch execution already finished: ${execution.status}`);
  }

  // キャンセルフラグを設定
  await prisma.batchExecution.update({
    where: { id: executionId },
    data: {
      cancelRequested: true,
      cancelReason: reason,
      cancelledBy,
    },
  });

  // イベントを記録
  await recordEvent(executionId, null, 'CANCEL_REQUESTED', { reason, cancelledBy });

  log.info({ executionId, reason, cancelledBy }, 'Batch execution cancel requested');

  return true;
}

/**
 * バッチ実行の進捗を取得
 */
export async function getBatchProgress(executionId: string): Promise<ProgressInfo> {
  const execution = await prisma.batchExecution.findUnique({
    where: { id: executionId },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
  });

  if (!execution) {
    throw new Error(`Batch execution not found: ${executionId}`);
  }

  const elapsedTime = execution.startedAt
    ? Date.now() - execution.startedAt.getTime()
    : 0;

  let estimatedRemainingTime: number | undefined;
  if (execution.progressPercent > 0 && execution.progressPercent < 100) {
    estimatedRemainingTime = Math.round(
      (elapsedTime / execution.progressPercent) * (100 - execution.progressPercent)
    );
  }

  return {
    executionId: execution.id,
    status: execution.status as BatchExecutionStatus,
    progressPercent: execution.progressPercent,
    progressType: execution.progressType as BatchProgressType,
    totalItems: execution.totalItems,
    estimatedItems: execution.estimatedItems,
    processedItems: execution.processedItems,
    successItems: execution.successItems,
    errorItems: execution.errorItems,
    skippedItems: execution.skippedItems,
    elapsedTime,
    estimatedRemainingTime,
    currentStep: execution.steps.filter(s => s.status === 'COMPLETED').length,
    totalSteps: execution.steps.length,
  };
}

/**
 * バッチ実行の進捗を更新
 */
export async function updateBatchProgress(
  executionId: string,
  progress: Partial<{
    totalItems: number;
    processedItems: number;
    successItems: number;
    errorItems: number;
    skippedItems: number;
    progressType: BatchProgressType;
  }>
): Promise<void> {
  const execution = await prisma.batchExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) return;

  const newProcessed = progress.processedItems ?? execution.processedItems;
  const total = progress.totalItems ?? execution.totalItems ?? execution.estimatedItems;
  const progressPercent = total && total > 0 ? Math.min(100, (newProcessed / total) * 100) : 0;

  await prisma.batchExecution.update({
    where: { id: executionId },
    data: {
      ...progress,
      progressPercent,
      progressType: progress.progressType || (progress.totalItems ? 'KNOWN' : execution.progressType),
    },
  });

  // イベントを記録
  await recordEvent(executionId, null, 'PROGRESS_UPDATED', {
    processedItems: newProcessed,
    totalItems: total,
    progressPercent,
  });
}

/**
 * ステップを作成
 */
export async function createBatchStep(
  executionId: string,
  stepNumber: number,
  startOffset: number,
  endOffset: number,
  stepKey?: string
): Promise<string> {
  const step = await prisma.batchStep.create({
    data: {
      executionId,
      stepNumber,
      stepKey: stepKey || `step-${stepNumber}`,
      startOffset,
      endOffset,
      itemCount: endOffset - startOffset,
    },
  });

  return step.id;
}

/**
 * ステップを開始
 */
export async function startBatchStep(stepId: string): Promise<void> {
  await prisma.batchStep.update({
    where: { id: stepId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  const step = await prisma.batchStep.findUnique({
    where: { id: stepId },
  });

  if (step) {
    await recordEvent(step.executionId, stepId, 'STEP_STARTED', { stepNumber: step.stepNumber });
  }
}

/**
 * ステップを完了
 */
export async function completeBatchStep(
  stepId: string,
  result: StepResult
): Promise<void> {
  await prisma.batchStep.update({
    where: { id: stepId },
    data: {
      status: 'COMPLETED',
      processedCount: result.processedCount,
      successCount: result.successCount,
      errorCount: result.errorCount,
      skippedCount: result.skippedCount,
      output: result.output ? (result.output as any) : undefined,
      errors: (result.errors || []) as any,
      completedAt: new Date(),
    },
  });

  const step = await prisma.batchStep.findUnique({
    where: { id: stepId },
  });

  if (step) {
    await recordEvent(step.executionId, stepId, 'STEP_COMPLETED', {
      stepNumber: step.stepNumber,
      ...result,
    });

    // 実行全体の進捗を更新
    const execution = await prisma.batchExecution.findUnique({
      where: { id: step.executionId },
    });

    if (execution) {
      await updateBatchProgress(step.executionId, {
        processedItems: execution.processedItems + result.processedCount,
        successItems: execution.successItems + result.successCount,
        errorItems: execution.errorItems + result.errorCount,
        skippedItems: execution.skippedItems + result.skippedCount,
      });
    }
  }
}

/**
 * ステップを失敗としてマーク
 */
export async function failBatchStep(
  stepId: string,
  error: string,
  errorDetails?: unknown
): Promise<void> {
  await prisma.batchStep.update({
    where: { id: stepId },
    data: {
      status: 'FAILED',
      errors: [{ error, details: errorDetails }] as any,
      completedAt: new Date(),
    },
  });

  const step = await prisma.batchStep.findUnique({
    where: { id: stepId },
  });

  if (step) {
    await recordEvent(step.executionId, stepId, 'STEP_FAILED', {
      stepNumber: step.stepNumber,
      error,
    });
  }
}

/**
 * バッチ実行を完了
 */
export async function completeBatchExecution(
  executionId: string,
  result?: unknown
): Promise<void> {
  const execution = await prisma.batchExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) return;

  const finalStatus: BatchExecutionStatus = execution.cancelRequested
    ? 'CANCELLED'
    : execution.errorItems > 0 && execution.successItems === 0
    ? 'FAILED'
    : 'COMPLETED';

  await prisma.batchExecution.update({
    where: { id: executionId },
    data: {
      status: finalStatus,
      progressPercent: 100,
      result: result ? (result as any) : undefined,
      completedAt: new Date(),
      cancelledAt: execution.cancelRequested ? new Date() : undefined,
    },
  });

  const eventType: BatchEventType =
    finalStatus === 'CANCELLED'
      ? 'EXECUTION_CANCELLED'
      : finalStatus === 'FAILED'
      ? 'EXECUTION_FAILED'
      : 'EXECUTION_COMPLETED';

  await recordEvent(executionId, null, eventType, {
    status: finalStatus,
    processedItems: execution.processedItems,
    successItems: execution.successItems,
    errorItems: execution.errorItems,
  });

  log.info(
    { executionId, status: finalStatus, processed: execution.processedItems },
    'Batch execution completed'
  );
}

/**
 * バッチ実行を失敗としてマーク
 */
export async function failBatchExecution(
  executionId: string,
  error: string,
  errorDetails?: unknown
): Promise<void> {
  await prisma.batchExecution.update({
    where: { id: executionId },
    data: {
      status: 'FAILED',
      errorMessage: error,
      errorDetails: errorDetails ? (errorDetails as any) : undefined,
      completedAt: new Date(),
    },
  });

  await recordEvent(executionId, null, 'EXECUTION_FAILED', { error });

  log.error({ executionId, error }, 'Batch execution failed');
}

/**
 * キャンセルが要求されているか確認
 */
export async function isCancellationRequested(executionId: string): Promise<boolean> {
  const execution = await prisma.batchExecution.findUnique({
    where: { id: executionId },
    select: { cancelRequested: true },
  });

  return execution?.cancelRequested || false;
}

/**
 * イベントを記録
 */
async function recordEvent(
  executionId: string,
  stepId: string | null,
  eventType: BatchEventType,
  data: Record<string, unknown>
): Promise<void> {
  await prisma.batchEvent.create({
    data: {
      executionId,
      stepId,
      eventType,
      data: data as any,
    },
  });
}

/**
 * バッチジョブ一覧を取得
 */
export async function listBatchJobs(options?: {
  jobType?: BatchJobType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: any[]; total: number }> {
  const where: any = {};
  if (options?.jobType) where.jobType = options.jobType;
  if (options?.isActive !== undefined) where.isActive = options.isActive;

  const [jobs, total] = await Promise.all([
    prisma.batchJob.findMany({
      where,
      include: {
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.batchJob.count({ where }),
  ]);

  return { jobs, total };
}

/**
 * バッチ実行一覧を取得
 */
export async function listBatchExecutions(options?: {
  jobId?: string;
  status?: BatchExecutionStatus;
  limit?: number;
  offset?: number;
}): Promise<{ executions: any[]; total: number }> {
  const where: any = {};
  if (options?.jobId) where.jobId = options.jobId;
  if (options?.status) where.status = options.status;

  const [executions, total] = await Promise.all([
    prisma.batchExecution.findMany({
      where,
      include: {
        job: { select: { name: true, jobType: true } },
        _count: { select: { steps: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    }),
    prisma.batchExecution.count({ where }),
  ]);

  return { executions, total };
}

/**
 * バッチ統計を取得
 */
export async function getBatchStats(options?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalJobs: number;
  totalExecutions: number;
  byStatus: Record<string, number>;
  byJobType: Record<string, number>;
  averageProcessingTime: number;
  successRate: number;
}> {
  const where: any = {};
  if (options?.startDate) where.createdAt = { gte: options.startDate };
  if (options?.endDate) where.createdAt = { ...where.createdAt, lte: options.endDate };

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

  return {
    totalJobs,
    totalExecutions: executions.length,
    byStatus,
    byJobType,
    averageProcessingTime: completedCount > 0 ? totalProcessingTime / completedCount : 0,
    successRate: executions.length > 0 ? (successCount / executions.length) * 100 : 0,
  };
}

/**
 * スケジュールされたバッチを実行
 */
export async function executeScheduledBatches(): Promise<{ executed: number }> {
  const now = new Date();

  const scheduledJobs = await prisma.batchJob.findMany({
    where: {
      isScheduled: true,
      isActive: true,
      nextRunAt: { lte: now },
    },
  });

  let executed = 0;

  for (const job of scheduledJobs) {
    try {
      await startBatchExecution(job.id);

      // 次回実行時刻を計算（簡易実装）
      const next = new Date();
      next.setDate(next.getDate() + 1);

      await prisma.batchJob.update({
        where: { id: job.id },
        data: { nextRunAt: next },
      });

      executed++;
    } catch (error) {
      log.error({ jobId: job.id, error }, 'Failed to execute scheduled batch');
    }
  }

  log.info({ executed }, 'Scheduled batches executed');

  return { executed };
}
