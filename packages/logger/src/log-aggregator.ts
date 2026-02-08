import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

/**
 * ログエントリ
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  module?: string;
  message?: string;
  jobId?: string;
  queueName?: string;
  requestId?: string;
  type?: string;
  duration?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * ログ検索オプション
 */
export interface LogSearchOptions {
  startTime?: Date;
  endTime?: Date;
  level?: string | string[];
  module?: string;
  type?: string;
  jobId?: string;
  queueName?: string;
  requestId?: string;
  search?: string; // 全文検索
  limit?: number;
  offset?: number;
}

/**
 * ログ検索結果
 */
export interface LogSearchResult {
  entries: LogEntry[];
  total: number;
  hasMore: boolean;
}

/**
 * ログ統計
 */
export interface LogStats {
  totalEntries: number;
  byLevel: Record<string, number>;
  byModule: Record<string, number>;
  byHour: Array<{ hour: string; count: number; errors: number }>;
  errorRate: number;
  topErrors: Array<{ message: string; count: number }>;
}

/**
 * ログローテーション設定
 */
export interface LogRotationConfig {
  maxSize: number; // bytes
  maxFiles: number;
  compress: boolean;
}

const DEFAULT_ROTATION_CONFIG: LogRotationConfig = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 7,
  compress: true,
};

/**
 * ログアグリゲーター
 *
 * ファイルベースのログ集約と検索を提供
 */
export class LogAggregator {
  private logDir: string;
  private rotationConfig: LogRotationConfig;
  private currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;
  private currentSize: number = 0;

  constructor(
    logDir: string = './logs',
    rotationConfig: Partial<LogRotationConfig> = {}
  ) {
    this.logDir = logDir;
    this.rotationConfig = { ...DEFAULT_ROTATION_CONFIG, ...rotationConfig };
    this.currentLogFile = this.getLogFilePath();

    // ディレクトリ作成
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 現在のファイルサイズを取得
    if (fs.existsSync(this.currentLogFile)) {
      this.currentSize = fs.statSync(this.currentLogFile).size;
    }
  }

  /**
   * ログファイルパスを取得
   */
  private getLogFilePath(date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0];
    return path.join(this.logDir, `rakuda-${dateStr}.log`);
  }

  /**
   * ログを書き込み
   */
  async write(entry: LogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    const lineSize = Buffer.byteLength(line);

    // ローテーションチェック
    if (this.currentSize + lineSize > this.rotationConfig.maxSize) {
      await this.rotate();
    }

    // 日付が変わった場合
    const todayLogFile = this.getLogFilePath();
    if (todayLogFile !== this.currentLogFile) {
      await this.closeStream();
      this.currentLogFile = todayLogFile;
      this.currentSize = 0;
    }

    // ストリームを開く
    if (!this.writeStream) {
      this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    }

    // 書き込み
    this.writeStream.write(line);
    this.currentSize += lineSize;
  }

  /**
   * ストリームを閉じる
   */
  private async closeStream(): Promise<void> {
    if (this.writeStream) {
      await new Promise<void>((resolve) => {
        this.writeStream!.end(() => resolve());
      });
      this.writeStream = null;
    }
  }

  /**
   * ログファイルをローテーション
   */
  async rotate(): Promise<void> {
    await this.closeStream();

    // ファイル名を変更
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);

    if (fs.existsSync(this.currentLogFile)) {
      fs.renameSync(this.currentLogFile, rotatedFile);

      // 圧縮
      if (this.rotationConfig.compress) {
        await this.compressFile(rotatedFile);
      }
    }

    // 古いファイルを削除
    await this.cleanupOldFiles();

    this.currentSize = 0;
  }

  /**
   * ファイルを圧縮
   */
  private async compressFile(filePath: string): Promise<void> {
    const gzipPath = `${filePath}.gz`;
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(gzipPath);
    const gzip = createGzip();

    await pipeline(source, gzip, destination);
    fs.unlinkSync(filePath);
  }

  /**
   * 古いログファイルを削除
   */
  private async cleanupOldFiles(): Promise<void> {
    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('rakuda-') && (f.endsWith('.log') || f.endsWith('.log.gz')))
      .map(f => ({
        name: f,
        path: path.join(this.logDir, f),
        time: fs.statSync(path.join(this.logDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    // 最大ファイル数を超えたら削除
    const filesToDelete = files.slice(this.rotationConfig.maxFiles);
    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
    }
  }

  /**
   * ログを検索
   */
  async search(options: LogSearchOptions = {}): Promise<LogSearchResult> {
    const {
      startTime,
      endTime,
      level,
      module,
      type,
      jobId,
      queueName,
      requestId,
      search,
      limit = 100,
      offset = 0,
    } = options;

    const levels = level ? (Array.isArray(level) ? level : [level]) : null;
    const entries: LogEntry[] = [];
    let total = 0;

    // 対象ファイルを取得
    const files = this.getLogFilesInRange(startTime, endTime);

    for (const file of files) {
      const fileEntries = await this.readLogFile(file);

      for (const entry of fileEntries) {
        // フィルタリング
        if (levels && !levels.includes(entry.level)) continue;
        if (module && entry.module !== module) continue;
        if (type && entry.type !== type) continue;
        if (jobId && entry.jobId !== jobId) continue;
        if (queueName && entry.queueName !== queueName) continue;
        if (requestId && entry.requestId !== requestId) continue;

        // 時間範囲
        if (startTime || endTime) {
          const entryTime = new Date(entry.timestamp).getTime();
          if (startTime && entryTime < startTime.getTime()) continue;
          if (endTime && entryTime > endTime.getTime()) continue;
        }

        // 全文検索
        if (search) {
          const entryStr = JSON.stringify(entry).toLowerCase();
          if (!entryStr.includes(search.toLowerCase())) continue;
        }

        total++;
        if (total > offset && entries.length < limit) {
          entries.push(entry);
        }
      }
    }

    return {
      entries,
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * 指定範囲のログファイルを取得
   */
  private getLogFilesInRange(startTime?: Date, endTime?: Date): string[] {
    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('rakuda-'))
      .map(f => path.join(this.logDir, f))
      .sort()
      .reverse();

    if (!startTime && !endTime) {
      return files;
    }

    // TODO: 日付でフィルタリング（最適化のため）
    return files;
  }

  /**
   * ログファイルを読み込み
   */
  private async readLogFile(filePath: string): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];

    let readStream: NodeJS.ReadableStream;

    if (filePath.endsWith('.gz')) {
      const gunzip = createGunzip();
      const fileStream = fs.createReadStream(filePath);
      readStream = fileStream.pipe(gunzip);
    } else {
      readStream = fs.createReadStream(filePath);
    }

    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        entries.push(entry);
      } catch {
        // 不正なJSONは無視
      }
    }

    return entries;
  }

  /**
   * ログ統計を取得
   */
  async getStats(options: { hours?: number } = {}): Promise<LogStats> {
    const { hours = 24 } = options;
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 3600000);

    const result = await this.search({
      startTime,
      limit: 100000, // 統計用に多めに取得
    });

    const byLevel: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    const byHourMap: Map<string, { count: number; errors: number }> = new Map();
    const errorMessages: Map<string, number> = new Map();

    for (const entry of result.entries) {
      // レベル別
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;

      // モジュール別
      if (entry.module) {
        byModule[entry.module] = (byModule[entry.module] || 0) + 1;
      }

      // 時間別
      const hourKey = new Date(entry.timestamp).toISOString().slice(0, 13);
      const hourData = byHourMap.get(hourKey) || { count: 0, errors: 0 };
      hourData.count++;
      if (entry.level === 'error') {
        hourData.errors++;
      }
      byHourMap.set(hourKey, hourData);

      // エラーメッセージ
      if (entry.level === 'error' && (entry.message || entry.error)) {
        const errorMsg = (entry.message || entry.error || '').slice(0, 100);
        errorMessages.set(errorMsg, (errorMessages.get(errorMsg) || 0) + 1);
      }
    }

    // 時間別データを配列に変換
    const byHour = Array.from(byHourMap.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // トップエラー
    const topErrors = Array.from(errorMessages.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // エラーレート
    const totalErrors = byLevel['error'] || 0;
    const errorRate = result.total > 0 ? (totalErrors / result.total) * 100 : 0;

    return {
      totalEntries: result.total,
      byLevel,
      byModule,
      byHour,
      errorRate: Math.round(errorRate * 100) / 100,
      topErrors,
    };
  }

  /**
   * ログをエクスポート
   */
  async export(
    options: LogSearchOptions & { format?: 'json' | 'ndjson' | 'csv' }
  ): Promise<string> {
    const { format = 'ndjson', ...searchOptions } = options;
    const result = await this.search({ ...searchOptions, limit: 100000 });

    switch (format) {
      case 'json':
        return JSON.stringify(result.entries, null, 2);

      case 'csv': {
        const headers = ['timestamp', 'level', 'module', 'type', 'message', 'error'];
        const rows = result.entries.map(entry =>
          headers.map(h => {
            const val = entry[h as keyof LogEntry];
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val ?? '';
          }).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      }

      case 'ndjson':
      default:
        return result.entries.map(e => JSON.stringify(e)).join('\n');
    }
  }

  /**
   * クリーンアップ
   */
  async close(): Promise<void> {
    await this.closeStream();
  }
}

// シングルトンインスタンス
let aggregatorInstance: LogAggregator | null = null;

/**
 * ログアグリゲーターを取得
 */
export function getLogAggregator(): LogAggregator {
  if (!aggregatorInstance) {
    const logDir = process.env.LOG_DIR || './logs';
    aggregatorInstance = new LogAggregator(logDir);
  }
  return aggregatorInstance;
}

/**
 * Pinoトランスポート用のwriteメソッド
 */
export function createPinoTransport(aggregator: LogAggregator) {
  return {
    write(chunk: string) {
      try {
        const entry = JSON.parse(chunk) as LogEntry;
        aggregator.write(entry).catch(console.error);
      } catch {
        // 無視
      }
    },
  };
}
