/**
 * バッチ処理ユーティリティ（Phase 46）
 *
 * 並列処理、進捗コールバック、エラーハンドリング（部分失敗対応）を提供
 */

/**
 * バッチ処理設定
 */
export interface BatchProcessorConfig {
  /** 並列度（同時実行数） */
  concurrency: number;
  /** チャンクサイズ（1バッチあたりの最大アイテム数） */
  chunkSize: number;
  /** アイテム間の遅延（ミリ秒） */
  delayBetweenItems: number;
  /** チャンク間の遅延（ミリ秒） */
  delayBetweenChunks: number;
  /** 失敗時に処理を継続するか */
  continueOnError: boolean;
  /** 最大エラー数（これを超えると処理停止） */
  maxErrors: number;
  /** タイムアウト（アイテムごと、ミリ秒、0で無制限） */
  itemTimeout: number;
  /** リトライ回数 */
  retryCount: number;
  /** リトライ遅延（ミリ秒） */
  retryDelay: number;
  /** 指数バックオフを使用するか */
  useExponentialBackoff: boolean;
}

/**
 * デフォルトバッチ処理設定
 */
export const DEFAULT_BATCH_CONFIG: BatchProcessorConfig = {
  concurrency: 3,
  chunkSize: 50,
  delayBetweenItems: 100,
  delayBetweenChunks: 1000,
  continueOnError: true,
  maxErrors: 10,
  itemTimeout: 30000,
  retryCount: 2,
  retryDelay: 1000,
  useExponentialBackoff: true,
};

/**
 * バッチ処理結果（単一アイテム）
 */
export interface BatchItemResult<T, R> {
  item: T;
  index: number;
  success: boolean;
  result?: R;
  error?: Error;
  retryCount: number;
  duration: number;
}

/**
 * バッチ処理統計
 */
export interface BatchProcessorStats {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration: number;
  averageItemDuration: number;
  itemsPerSecond: number;
}

/**
 * 進捗コールバック情報
 */
export interface BatchProgressInfo<T, R> {
  current: number;
  total: number;
  percentage: number;
  item: T;
  result?: BatchItemResult<T, R>;
  stats: BatchProcessorStats;
  estimatedRemainingMs: number;
}

/**
 * バッチ処理オプション
 */
export interface BatchProcessorOptions<T, R> {
  /** 設定 */
  config?: Partial<BatchProcessorConfig>;
  /** 進捗コールバック */
  onProgress?: (info: BatchProgressInfo<T, R>) => void;
  /** アイテム開始時コールバック */
  onItemStart?: (item: T, index: number) => void;
  /** アイテム完了時コールバック */
  onItemComplete?: (result: BatchItemResult<T, R>) => void;
  /** エラー時コールバック */
  onError?: (item: T, error: Error, index: number) => void;
  /** チャンク完了時コールバック */
  onChunkComplete?: (chunkIndex: number, results: BatchItemResult<T, R>[]) => void;
  /** 中断シグナル */
  abortSignal?: AbortSignal;
  /** ログ関数（デフォルト: console.log） */
  logger?: (message: string, data?: any) => void;
}

/**
 * バッチ処理結果
 */
export interface BatchProcessorResult<T, R> {
  results: BatchItemResult<T, R>[];
  stats: BatchProcessorStats;
  errors: Array<{ item: T; error: Error; index: number }>;
  aborted: boolean;
}

/**
 * スリープ関数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * タイムアウト付き実行
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  if (timeoutMs <= 0) {
    return fn();
  }

  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * 配列をチャンクに分割
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    return [array];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * バッチ処理を実行
 *
 * @param items 処理するアイテムの配列
 * @param processor 各アイテムを処理する関数
 * @param options 処理オプション
 * @returns 処理結果
 *
 * @example
 * ```typescript
 * const results = await processBatch(
 *   productIds,
 *   async (productId) => {
 *     const result = await publishProduct(productId);
 *     return result;
 *   },
 *   {
 *     config: { concurrency: 5, continueOnError: true },
 *     onProgress: (info) => console.log(`Progress: ${info.percentage}%`),
 *   }
 * );
 * ```
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessorOptions<T, R> = {}
): Promise<BatchProcessorResult<T, R>> {
  const config = { ...DEFAULT_BATCH_CONFIG, ...options.config };
  const logger = options.logger || (() => {});
  const startTime = Date.now();

  const results: BatchItemResult<T, R>[] = [];
  const errors: Array<{ item: T; error: Error; index: number }> = [];
  let aborted = false;

  const stats: BatchProcessorStats = {
    total: items.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    averageItemDuration: 0,
    itemsPerSecond: 0,
  };

  if (items.length === 0) {
    return { results, stats, errors, aborted };
  }

  logger('batch_start', { total: items.length, config });

  // チャンクに分割
  const chunks = chunkArray(items, config.chunkSize);

  // 各チャンクを処理
  let globalIndex = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    // 中断チェック
    if (options.abortSignal?.aborted) {
      aborted = true;
      logger('batch_aborted', { chunkIndex, processedItems: stats.processed });
      break;
    }

    // 最大エラー数チェック
    if (errors.length >= config.maxErrors && config.maxErrors > 0) {
      logger('batch_max_errors_reached', { errorCount: errors.length });
      break;
    }

    const chunk = chunks[chunkIndex];
    const chunkResults: BatchItemResult<T, R>[] = [];

    // チャンク内を並列処理
    const processItem = async (item: T, localIndex: number): Promise<BatchItemResult<T, R>> => {
      const itemIndex = globalIndex + localIndex;
      const itemStartTime = Date.now();
      let retryCount = 0;
      let lastError: Error | undefined;

      // アイテム開始コールバック
      options.onItemStart?.(item, itemIndex);

      // リトライループ
      while (retryCount <= config.retryCount) {
        try {
          // タイムアウト付き実行
          const result = await withTimeout(
            () => processor(item, itemIndex),
            config.itemTimeout,
            `Item processing timeout after ${config.itemTimeout}ms`
          );

          const duration = Date.now() - itemStartTime;
          const itemResult: BatchItemResult<T, R> = {
            item,
            index: itemIndex,
            success: true,
            result,
            retryCount,
            duration,
          };

          return itemResult;
        } catch (error: any) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retryCount++;

          if (retryCount <= config.retryCount) {
            // リトライ待機
            const delay = config.useExponentialBackoff
              ? config.retryDelay * Math.pow(2, retryCount - 1)
              : config.retryDelay;

            logger('item_retry', {
              index: itemIndex,
              attempt: retryCount,
              delay,
              error: lastError.message,
            });

            await sleep(delay);
          }
        }
      }

      // 全リトライ失敗
      const duration = Date.now() - itemStartTime;
      const itemResult: BatchItemResult<T, R> = {
        item,
        index: itemIndex,
        success: false,
        error: lastError,
        retryCount: retryCount - 1,
        duration,
      };

      // エラーコールバック
      options.onError?.(item, lastError!, itemIndex);

      return itemResult;
    };

    // 並列度を制御してチャンク内を処理
    for (let i = 0; i < chunk.length; i += config.concurrency) {
      // 中断チェック
      if (options.abortSignal?.aborted) {
        aborted = true;
        break;
      }

      // 最大エラー数チェック
      if (errors.length >= config.maxErrors && config.maxErrors > 0) {
        break;
      }

      const batch = chunk.slice(i, i + config.concurrency);

      // Promise.allSettledで並列実行（部分失敗対応）
      const batchPromises = batch.map((item, idx) => processItem(item, i + idx));
      const batchResults = await Promise.allSettled(batchPromises);

      // 結果を処理
      for (const settledResult of batchResults) {
        let itemResult: BatchItemResult<T, R>;

        if (settledResult.status === 'fulfilled') {
          itemResult = settledResult.value;
        } else {
          // Promise.allSettled自体がrejectした場合（通常は発生しない）
          itemResult = {
            item: batch[batchResults.indexOf(settledResult)],
            index: globalIndex + i + batchResults.indexOf(settledResult),
            success: false,
            error: settledResult.reason,
            retryCount: 0,
            duration: 0,
          };
        }

        chunkResults.push(itemResult);
        results.push(itemResult);

        // 統計更新
        stats.processed++;
        if (itemResult.success) {
          stats.succeeded++;
        } else {
          stats.failed++;
          errors.push({
            item: itemResult.item,
            error: itemResult.error!,
            index: itemResult.index,
          });

          // continueOnError=falseの場合は停止
          if (!config.continueOnError) {
            aborted = true;
            break;
          }
        }

        // アイテム完了コールバック
        options.onItemComplete?.(itemResult);

        // 進捗コールバック
        if (options.onProgress) {
          const elapsed = Date.now() - startTime;
          const avgDuration = stats.processed > 0 ? elapsed / stats.processed : 0;
          const remaining = items.length - stats.processed;

          options.onProgress({
            current: stats.processed,
            total: items.length,
            percentage: Math.round((stats.processed / items.length) * 100),
            item: itemResult.item,
            result: itemResult,
            stats: { ...stats },
            estimatedRemainingMs: remaining * avgDuration,
          });
        }
      }

      if (aborted) break;

      // アイテム間遅延
      if (i + config.concurrency < chunk.length && config.delayBetweenItems > 0) {
        await sleep(config.delayBetweenItems);
      }
    }

    if (aborted) break;

    // チャンク完了コールバック
    options.onChunkComplete?.(chunkIndex, chunkResults);

    globalIndex += chunk.length;

    // チャンク間遅延
    if (chunkIndex < chunks.length - 1 && config.delayBetweenChunks > 0) {
      await sleep(config.delayBetweenChunks);
    }
  }

  // 最終統計
  const totalDuration = Date.now() - startTime;
  stats.duration = totalDuration;
  stats.averageItemDuration = stats.processed > 0 ? totalDuration / stats.processed : 0;
  stats.itemsPerSecond = totalDuration > 0 ? (stats.processed / totalDuration) * 1000 : 0;

  logger('batch_complete', { stats, aborted, errorCount: errors.length });

  return { results, stats, errors, aborted };
}

/**
 * バッチ処理を直列実行（並列度1）
 */
export async function processBatchSequential<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: Omit<BatchProcessorOptions<T, R>, 'config'> & {
    config?: Omit<Partial<BatchProcessorConfig>, 'concurrency'>;
  } = {}
): Promise<BatchProcessorResult<T, R>> {
  return processBatch(items, processor, {
    ...options,
    config: { ...options.config, concurrency: 1 },
  });
}

/**
 * レート制限付きバッチ処理
 *
 * @param items 処理するアイテム
 * @param processor 処理関数
 * @param rateLimiter レート制限関数（待機すべきミリ秒を返す）
 * @param options オプション
 */
export async function processBatchWithRateLimit<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  rateLimiter: () => Promise<number>,
  options: BatchProcessorOptions<T, R> = {}
): Promise<BatchProcessorResult<T, R>> {
  const wrappedProcessor = async (item: T, index: number): Promise<R> => {
    // レート制限チェック
    const waitTime = await rateLimiter();
    if (waitTime > 0) {
      await sleep(waitTime);
    }
    return processor(item, index);
  };

  return processBatch(items, wrappedProcessor, options);
}

/**
 * マップ関数付きバッチ処理（結果を変換）
 */
export async function processBatchMap<T, R, M>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  mapper: (result: R, item: T, index: number) => M,
  options: BatchProcessorOptions<T, R> = {}
): Promise<{
  mappedResults: M[];
  batchResult: BatchProcessorResult<T, R>;
}> {
  const batchResult = await processBatch(items, processor, options);

  const mappedResults: M[] = batchResult.results
    .filter(r => r.success && r.result !== undefined)
    .map(r => mapper(r.result!, r.item, r.index));

  return { mappedResults, batchResult };
}

/**
 * フィルター関数付きバッチ処理（条件に合うアイテムのみ処理）
 */
export async function processBatchFiltered<T, R>(
  items: T[],
  filter: (item: T, index: number) => boolean | Promise<boolean>,
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessorOptions<T, R> = {}
): Promise<BatchProcessorResult<T, R>> {
  // フィルター適用
  const filteredItems: T[] = [];
  const indexMap: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const shouldProcess = await filter(items[i], i);
    if (shouldProcess) {
      filteredItems.push(items[i]);
      indexMap.push(i);
    }
  }

  // 処理実行
  const result = await processBatch(
    filteredItems,
    (item, idx) => processor(item, indexMap[idx]),
    options
  );

  // スキップ数を更新
  result.stats.skipped = items.length - filteredItems.length;
  result.stats.total = items.length;

  return result;
}

/**
 * パイプライン処理（複数の処理を順次適用）
 */
export async function processBatchPipeline<T>(
  items: T[],
  processors: Array<{
    name: string;
    process: (item: T, index: number) => Promise<T>;
    options?: Partial<BatchProcessorConfig>;
  }>,
  options: Omit<BatchProcessorOptions<T, T>, 'config'> & {
    config?: Partial<BatchProcessorConfig>;
  } = {}
): Promise<{
  results: T[];
  stageResults: Array<{ name: string; stats: BatchProcessorStats }>;
  errors: Array<{ stage: string; item: T; error: Error; index: number }>;
}> {
  let currentItems = [...items];
  const stageResults: Array<{ name: string; stats: BatchProcessorStats }> = [];
  const allErrors: Array<{ stage: string; item: T; error: Error; index: number }> = [];

  for (const stage of processors) {
    const stageConfig = { ...options.config, ...stage.options };

    const result = await processBatch(currentItems, stage.process, {
      ...options,
      config: stageConfig,
    });

    stageResults.push({ name: stage.name, stats: result.stats });

    // エラーを記録
    for (const err of result.errors) {
      allErrors.push({ stage: stage.name, ...err });
    }

    // 成功したアイテムのみ次のステージへ
    currentItems = result.results
      .filter(r => r.success && r.result !== undefined)
      .map(r => r.result!);

    // 全て失敗した場合は中断
    if (currentItems.length === 0) {
      break;
    }
  }

  return { results: currentItems, stageResults, errors: allErrors };
}

/**
 * 並列バッチグループ処理（複数のバッチを並列で実行）
 */
export async function processBatchGroups<T, R>(
  groups: Array<{ name: string; items: T[] }>,
  processor: (item: T, index: number, groupName: string) => Promise<R>,
  options: BatchProcessorOptions<T, R> & {
    groupConcurrency?: number;
  } = {}
): Promise<
  Array<{
    name: string;
    result: BatchProcessorResult<T, R>;
  }>
> {
  const groupConcurrency = options.groupConcurrency || 2;
  const results: Array<{ name: string; result: BatchProcessorResult<T, R> }> = [];

  // グループをチャンクに分割
  const groupChunks = chunkArray(groups, groupConcurrency);

  for (const groupChunk of groupChunks) {
    const chunkResults = await Promise.allSettled(
      groupChunk.map(async group => {
        const result = await processBatch(
          group.items,
          (item, index) => processor(item, index, group.name),
          options
        );
        return { name: group.name, result };
      })
    );

    for (const settled of chunkResults) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
      } else {
        // グループ全体が失敗した場合
        const groupIndex = chunkResults.indexOf(settled);
        const group = groupChunk[groupIndex];
        results.push({
          name: group.name,
          result: {
            results: [],
            stats: {
              total: group.items.length,
              processed: 0,
              succeeded: 0,
              failed: group.items.length,
              skipped: 0,
              duration: 0,
              averageItemDuration: 0,
              itemsPerSecond: 0,
            },
            errors: [],
            aborted: true,
          },
        });
      }
    }
  }

  return results;
}
