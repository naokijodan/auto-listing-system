/**
 * クエリパフォーマンス監視API
 * Phase 69: データベースインデックス最適化
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'query-performance' });

/**
 * テーブル統計情報を取得
 * GET /api/query-performance/table-stats
 */
router.get('/table-stats', async (_req, res, next) => {
  try {
    const tableStats = await prisma.$queryRaw<Array<{
      table_name: string;
      row_count: bigint;
      total_size: string;
      index_size: string;
    }>>`
      SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_indexes_size(relid)) as index_size
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 50
    `;

    const stats = tableStats.map(row => ({
      tableName: row.table_name,
      rowCount: Number(row.row_count),
      totalSize: row.total_size,
      indexSize: row.index_size,
    }));

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get table stats');
    next(error);
  }
});

/**
 * インデックス使用状況を取得
 * GET /api/query-performance/index-usage
 */
router.get('/index-usage', async (_req, res, next) => {
  try {
    const indexUsage = await prisma.$queryRaw<Array<{
      table_name: string;
      index_name: string;
      index_size: string;
      idx_scan: bigint;
      idx_tup_read: bigint;
      idx_tup_fetch: bigint;
    }>>`
      SELECT
        schemaname || '.' || relname as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 100
    `;

    const usage = indexUsage.map(row => ({
      tableName: row.table_name,
      indexName: row.index_name,
      indexSize: row.index_size,
      scans: Number(row.idx_scan),
      tuplesRead: Number(row.idx_tup_read),
      tuplesFetched: Number(row.idx_tup_fetch),
      efficiency: row.idx_tup_read > 0
        ? Math.round((Number(row.idx_tup_fetch) / Number(row.idx_tup_read)) * 100)
        : 0,
    }));

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get index usage');
    next(error);
  }
});

/**
 * 未使用インデックスを取得
 * GET /api/query-performance/unused-indexes
 */
router.get('/unused-indexes', async (_req, res, next) => {
  try {
    const unusedIndexes = await prisma.$queryRaw<Array<{
      table_name: string;
      index_name: string;
      index_size: string;
      idx_scan: bigint;
    }>>`
      SELECT
        schemaname || '.' || relname as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
        AND indexrelname NOT LIKE '%_key'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 50
    `;

    const indexes = unusedIndexes.map(row => ({
      tableName: row.table_name,
      indexName: row.index_name,
      indexSize: row.index_size,
      scans: Number(row.idx_scan),
    }));

    res.json({
      success: true,
      data: indexes,
      summary: {
        count: indexes.length,
        recommendation: indexes.length > 10
          ? '未使用インデックスが多いです。削除を検討してください。'
          : '未使用インデックス数は正常です。',
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get unused indexes');
    next(error);
  }
});

/**
 * シーケンシャルスキャンが多いテーブルを取得
 * GET /api/query-performance/seq-scans
 */
router.get('/seq-scans', async (_req, res, next) => {
  try {
    const seqScans = await prisma.$queryRaw<Array<{
      table_name: string;
      seq_scan: bigint;
      seq_tup_read: bigint;
      idx_scan: bigint;
      idx_tup_fetch: bigint;
      row_count: bigint;
    }>>`
      SELECT
        relname as table_name,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE n_live_tup > 1000
        AND seq_scan > 0
      ORDER BY seq_tup_read DESC
      LIMIT 30
    `;

    const tables = seqScans.map(row => {
      const totalScans = Number(row.seq_scan) + Number(row.idx_scan);
      const seqScanRatio = totalScans > 0
        ? Math.round((Number(row.seq_scan) / totalScans) * 100)
        : 0;

      return {
        tableName: row.table_name,
        seqScans: Number(row.seq_scan),
        seqTuplesRead: Number(row.seq_tup_read),
        indexScans: Number(row.idx_scan),
        indexTuplesFetched: Number(row.idx_tup_fetch),
        rowCount: Number(row.row_count),
        seqScanRatio,
        needsOptimization: seqScanRatio > 50 && Number(row.row_count) > 10000,
      };
    });

    const needsOptimization = tables.filter(t => t.needsOptimization);

    res.json({
      success: true,
      data: tables,
      summary: {
        total: tables.length,
        needsOptimization: needsOptimization.length,
        tablesNeedingAttention: needsOptimization.map(t => t.tableName),
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get seq scans');
    next(error);
  }
});

/**
 * クエリパフォーマンスサマリーを取得
 * GET /api/query-performance/summary
 */
router.get('/summary', async (_req, res, next) => {
  try {
    // テーブル数
    const tableCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM pg_stat_user_tables
    `;

    // インデックス数
    const indexCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM pg_stat_user_indexes
    `;

    // データベースサイズ
    const dbSize = await prisma.$queryRaw<Array<{ size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;

    // キャッシュヒット率
    const cacheHitRatio = await prisma.$queryRaw<Array<{
      heap_hit_ratio: number;
      index_hit_ratio: number;
    }>>`
      SELECT
        ROUND(100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as heap_hit_ratio,
        ROUND(100.0 * sum(idx_blks_hit) / nullif(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2) as index_hit_ratio
      FROM pg_statio_user_tables
    `;

    // 未使用インデックス数
    const unusedIndexCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
        AND indexrelname NOT LIKE '%_key'
    `;

    // 高seqスキャン率テーブル数
    const highSeqScanTables = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM pg_stat_user_tables
      WHERE n_live_tup > 10000
        AND seq_scan > idx_scan
    `;

    const heapHitRatio = cacheHitRatio[0]?.heap_hit_ratio ?? 0;
    const indexHitRatio = cacheHitRatio[0]?.index_hit_ratio ?? 0;

    const summary = {
      tables: Number(tableCount[0]?.count ?? 0),
      indexes: Number(indexCount[0]?.count ?? 0),
      databaseSize: dbSize[0]?.size ?? 'N/A',
      cacheHitRatio: {
        heap: heapHitRatio,
        index: indexHitRatio,
        status: heapHitRatio >= 99 ? 'excellent' : heapHitRatio >= 95 ? 'good' : 'needs_attention',
      },
      unusedIndexes: Number(unusedIndexCount[0]?.count ?? 0),
      highSeqScanTables: Number(highSeqScanTables[0]?.count ?? 0),
      health: calculateHealth(heapHitRatio, indexHitRatio, Number(unusedIndexCount[0]?.count ?? 0), Number(highSeqScanTables[0]?.count ?? 0)),
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    log.error({ error }, 'Failed to get performance summary');
    next(error);
  }
});

/**
 * テーブル詳細統計を取得
 * GET /api/query-performance/tables/:tableName
 */
router.get('/tables/:tableName', async (req, res, next) => {
  try {
    const { tableName } = req.params;

    // テーブル統計
    const tableStats = await prisma.$queryRaw<Array<{
      seq_scan: bigint;
      seq_tup_read: bigint;
      idx_scan: bigint;
      idx_tup_fetch: bigint;
      n_tup_ins: bigint;
      n_tup_upd: bigint;
      n_tup_del: bigint;
      n_live_tup: bigint;
      n_dead_tup: bigint;
      last_vacuum: Date | null;
      last_autovacuum: Date | null;
      last_analyze: Date | null;
    }>>`
      SELECT
        seq_scan, seq_tup_read,
        idx_scan, idx_tup_fetch,
        n_tup_ins, n_tup_upd, n_tup_del,
        n_live_tup, n_dead_tup,
        last_vacuum, last_autovacuum, last_analyze
      FROM pg_stat_user_tables
      WHERE relname = ${tableName}
    `;

    if (tableStats.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Table not found',
      });
      return;
    }

    // インデックス一覧
    const indexes = await prisma.$queryRaw<Array<{
      index_name: string;
      index_size: string;
      idx_scan: bigint;
      idx_tup_read: bigint;
      idx_tup_fetch: bigint;
    }>>`
      SELECT
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan, idx_tup_read, idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE relname = ${tableName}
      ORDER BY idx_scan DESC
    `;

    const stats = tableStats[0];
    const deadTupRatio = Number(stats.n_live_tup) > 0
      ? Math.round((Number(stats.n_dead_tup) / Number(stats.n_live_tup)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        tableName,
        rowCount: Number(stats.n_live_tup),
        deadTuples: Number(stats.n_dead_tup),
        deadTupleRatio: deadTupRatio,
        needsVacuum: deadTupRatio > 10,
        scans: {
          sequential: Number(stats.seq_scan),
          sequentialTuplesRead: Number(stats.seq_tup_read),
          index: Number(stats.idx_scan),
          indexTuplesFetched: Number(stats.idx_tup_fetch),
        },
        operations: {
          inserts: Number(stats.n_tup_ins),
          updates: Number(stats.n_tup_upd),
          deletes: Number(stats.n_tup_del),
        },
        maintenance: {
          lastVacuum: stats.last_vacuum,
          lastAutoVacuum: stats.last_autovacuum,
          lastAnalyze: stats.last_analyze,
        },
        indexes: indexes.map(idx => ({
          name: idx.index_name,
          size: idx.index_size,
          scans: Number(idx.idx_scan),
          tuplesRead: Number(idx.idx_tup_read),
          tuplesFetched: Number(idx.idx_tup_fetch),
          isUsed: Number(idx.idx_scan) > 0,
        })),
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to get table details');
    next(error);
  }
});

/**
 * VACUUM ANALYZEを実行
 * POST /api/query-performance/vacuum/:tableName
 */
router.post('/vacuum/:tableName', async (req, res, next) => {
  try {
    const { tableName } = req.params;

    // テーブル存在チェック
    const tableExists = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM pg_stat_user_tables WHERE relname = ${tableName}
    `;

    if (Number(tableExists[0]?.count ?? 0) === 0) {
      res.status(404).json({
        success: false,
        error: 'Table not found',
      });
      return;
    }

    // VACUUM ANALYZE実行（バックグラウンド）
    // Note: VACUUM cannot run in a transaction, so we use a separate connection
    await prisma.$executeRawUnsafe(`VACUUM ANALYZE "${tableName}"`);

    log.info({ tableName }, 'VACUUM ANALYZE completed');

    res.json({
      success: true,
      message: `VACUUM ANALYZE completed for ${tableName}`,
    });
  } catch (error) {
    log.error({ error }, 'Failed to vacuum table');
    next(error);
  }
});

/**
 * 統計情報を更新
 * POST /api/query-performance/analyze/:tableName
 */
router.post('/analyze/:tableName', async (req, res, next) => {
  try {
    const { tableName } = req.params;

    // テーブル存在チェック
    const tableExists = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM pg_stat_user_tables WHERE relname = ${tableName}
    `;

    if (Number(tableExists[0]?.count ?? 0) === 0) {
      res.status(404).json({
        success: false,
        error: 'Table not found',
      });
      return;
    }

    await prisma.$executeRawUnsafe(`ANALYZE "${tableName}"`);

    log.info({ tableName }, 'ANALYZE completed');

    res.json({
      success: true,
      message: `ANALYZE completed for ${tableName}`,
    });
  } catch (error) {
    log.error({ error }, 'Failed to analyze table');
    next(error);
  }
});

// ヘルパー関数
function calculateHealth(
  heapHitRatio: number,
  indexHitRatio: number,
  unusedIndexes: number,
  highSeqScanTables: number
): { score: number; status: string; issues: string[] } {
  const issues: string[] = [];
  let score = 100;

  // キャッシュヒット率評価
  if (heapHitRatio < 95) {
    score -= 20;
    issues.push('ヒープキャッシュヒット率が低い（< 95%）');
  } else if (heapHitRatio < 99) {
    score -= 5;
  }

  if (indexHitRatio < 95) {
    score -= 15;
    issues.push('インデックスキャッシュヒット率が低い（< 95%）');
  } else if (indexHitRatio < 99) {
    score -= 3;
  }

  // 未使用インデックス評価
  if (unusedIndexes > 20) {
    score -= 15;
    issues.push(`未使用インデックスが多い（${unusedIndexes}個）`);
  } else if (unusedIndexes > 10) {
    score -= 5;
    issues.push(`未使用インデックスあり（${unusedIndexes}個）`);
  }

  // シーケンシャルスキャン評価
  if (highSeqScanTables > 5) {
    score -= 20;
    issues.push(`シーケンシャルスキャンが多いテーブルあり（${highSeqScanTables}テーブル）`);
  } else if (highSeqScanTables > 2) {
    score -= 10;
    issues.push(`シーケンシャルスキャンが多いテーブルあり（${highSeqScanTables}テーブル）`);
  }

  const status = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return { score: Math.max(0, score), status, issues };
}

export { router as queryPerformanceRouter };
