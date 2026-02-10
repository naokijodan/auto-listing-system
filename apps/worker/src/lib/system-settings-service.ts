import { prisma, SettingCategory, SettingValueType } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'system-settings-service' });

// メモリキャッシュ
const settingsCache: Map<string, { value: any; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1分

interface SettingDefinition {
  key: string;
  category: SettingCategory;
  valueType: SettingValueType;
  defaultValue: string;
  label: string;
  description?: string;
  isSecret?: boolean;
  isReadOnly?: boolean;
  validationRule?: string;
}

/**
 * 設定値を取得（キャッシュ付き）
 */
export async function getSetting<T = string>(key: string): Promise<T | null> {
  // キャッシュチェック
  const cached = settingsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    return null;
  }

  const value = parseValue(setting.value, setting.valueType);

  // キャッシュに保存
  settingsCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return value as T;
}

/**
 * 設定値を取得（デフォルト値付き）
 */
export async function getSettingOrDefault<T = string>(key: string, defaultValue: T): Promise<T> {
  const value = await getSetting<T>(key);
  return value ?? defaultValue;
}

/**
 * 複数の設定を一括取得
 */
export async function getSettings(keys: string[]): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  // キャッシュから取得
  const uncachedKeys: string[] = [];
  for (const key of keys) {
    const cached = settingsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      result[key] = cached.value;
    } else {
      uncachedKeys.push(key);
    }
  }

  // DBから取得
  if (uncachedKeys.length > 0) {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: uncachedKeys } },
    });

    for (const setting of settings) {
      const value = parseValue(setting.value, setting.valueType);
      result[setting.key] = value;

      // キャッシュに保存
      settingsCache.set(setting.key, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
  }

  return result;
}

/**
 * カテゴリ別に設定を取得
 */
export async function getSettingsByCategory(category: SettingCategory): Promise<Record<string, any>> {
  const settings = await prisma.systemSetting.findMany({
    where: { category },
  });

  const result: Record<string, any> = {};
  for (const setting of settings) {
    result[setting.key] = parseValue(setting.value, setting.valueType);
  }

  return result;
}

/**
 * 設定値を更新
 */
export async function updateSetting(
  key: string,
  value: any,
  options?: {
    changedBy?: string;
    changeReason?: string;
  }
): Promise<void> {
  const existing = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!existing) {
    throw new Error(`Setting not found: ${key}`);
  }

  if (existing.isReadOnly) {
    throw new Error(`Setting is read-only: ${key}`);
  }

  const stringValue = stringifyValue(value, existing.valueType);

  // バリデーション
  if (existing.validationRule) {
    const isValid = validateValue(stringValue, existing.validationRule);
    if (!isValid) {
      throw new Error(`Invalid value for setting: ${key}`);
    }
  }

  await prisma.$transaction([
    // 履歴を保存
    prisma.settingHistory.create({
      data: {
        settingId: existing.id,
        previousValue: existing.value,
        newValue: stringValue,
        version: existing.version + 1,
        changedBy: options?.changedBy,
        changeReason: options?.changeReason,
      },
    }),
    // 設定を更新
    prisma.systemSetting.update({
      where: { key },
      data: {
        value: stringValue,
        version: { increment: 1 },
        lastChangedBy: options?.changedBy,
        lastChangedAt: new Date(),
      },
    }),
  ]);

  // キャッシュを無効化
  settingsCache.delete(key);

  log.info({
    key,
    changedBy: options?.changedBy,
    version: existing.version + 1,
  }, 'Setting updated');
}

/**
 * 複数の設定を一括更新
 */
export async function updateSettings(
  settings: Record<string, any>,
  options?: {
    changedBy?: string;
    changeReason?: string;
  }
): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await updateSetting(key, value, options);
  }
}

/**
 * 設定を作成または更新
 */
export async function upsertSetting(definition: SettingDefinition): Promise<void> {
  const existing = await prisma.systemSetting.findUnique({
    where: { key: definition.key },
  });

  if (existing) {
    // 既存の場合はメタデータのみ更新
    await prisma.systemSetting.update({
      where: { key: definition.key },
      data: {
        category: definition.category,
        valueType: definition.valueType,
        defaultValue: definition.defaultValue,
        label: definition.label,
        description: definition.description,
        isSecret: definition.isSecret ?? false,
        isReadOnly: definition.isReadOnly ?? false,
        validationRule: definition.validationRule,
      },
    });
  } else {
    // 新規作成
    await prisma.systemSetting.create({
      data: {
        key: definition.key,
        category: definition.category,
        value: definition.defaultValue,
        valueType: definition.valueType,
        defaultValue: definition.defaultValue,
        label: definition.label,
        description: definition.description,
        isSecret: definition.isSecret ?? false,
        isReadOnly: definition.isReadOnly ?? false,
        validationRule: definition.validationRule,
      },
    });
  }

  // キャッシュを無効化
  settingsCache.delete(definition.key);
}

/**
 * 設定履歴を取得
 */
export async function getSettingHistory(
  key: string,
  limit: number = 20
): Promise<any[]> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    return [];
  }

  return prisma.settingHistory.findMany({
    where: { settingId: setting.id },
    orderBy: { changedAt: 'desc' },
    take: limit,
  });
}

/**
 * 設定を以前のバージョンにロールバック
 */
export async function rollbackSetting(
  key: string,
  targetVersion: number,
  changedBy?: string
): Promise<void> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
    include: {
      history: {
        where: { version: targetVersion },
        take: 1,
      },
    },
  });

  if (!setting || setting.history.length === 0) {
    throw new Error(`Version ${targetVersion} not found for setting: ${key}`);
  }

  const historyEntry = setting.history[0];

  await updateSetting(key, historyEntry.newValue, {
    changedBy,
    changeReason: `Rollback to version ${targetVersion}`,
  });

  log.info({
    key,
    fromVersion: setting.version,
    toVersion: targetVersion,
    changedBy,
  }, 'Setting rolled back');
}

/**
 * キャッシュをクリア
 */
export function clearSettingsCache(): void {
  settingsCache.clear();
  log.info('Settings cache cleared');
}

/**
 * デフォルト設定を初期化
 */
export async function initializeDefaultSettings(): Promise<void> {
  const defaults: SettingDefinition[] = [
    // 一般設定
    {
      key: 'system.timezone',
      category: 'GENERAL',
      valueType: 'STRING',
      defaultValue: 'Asia/Tokyo',
      label: 'タイムゾーン',
      description: 'システムのタイムゾーン',
    },
    {
      key: 'system.language',
      category: 'GENERAL',
      valueType: 'STRING',
      defaultValue: 'ja',
      label: '言語',
      description: 'システムの言語設定',
    },
    // スケジューラー設定
    {
      key: 'scheduler.inventory_check.enabled',
      category: 'SCHEDULER',
      valueType: 'BOOLEAN',
      defaultValue: 'true',
      label: '在庫チェック有効',
    },
    {
      key: 'scheduler.inventory_check.times_per_day',
      category: 'SCHEDULER',
      valueType: 'NUMBER',
      defaultValue: '3',
      label: '1日の在庫チェック回数',
    },
    // 通知設定
    {
      key: 'notification.email.enabled',
      category: 'NOTIFICATION',
      valueType: 'BOOLEAN',
      defaultValue: 'true',
      label: 'メール通知有効',
    },
    // 価格設定
    {
      key: 'pricing.target_profit_rate',
      category: 'PRICING',
      valueType: 'NUMBER',
      defaultValue: '15',
      label: '目標利益率（%）',
    },
    {
      key: 'pricing.min_profit_rate',
      category: 'PRICING',
      valueType: 'NUMBER',
      defaultValue: '10',
      label: '最低利益率（%）',
    },
    // 在庫設定
    {
      key: 'inventory.auto_pause_on_stockout',
      category: 'INVENTORY',
      valueType: 'BOOLEAN',
      defaultValue: 'true',
      label: '在庫切れ時の自動停止',
    },
    {
      key: 'inventory.resume_delay_hours',
      category: 'INVENTORY',
      valueType: 'NUMBER',
      defaultValue: '24',
      label: '再開遅延時間',
    },
    // API設定
    {
      key: 'api.rate_limit.default',
      category: 'SECURITY',
      valueType: 'NUMBER',
      defaultValue: '1000',
      label: 'デフォルトレート制限（リクエスト/時間）',
    },
    {
      key: 'api.rate_limit.burst',
      category: 'SECURITY',
      valueType: 'NUMBER',
      defaultValue: '50',
      label: 'バースト制限',
    },
  ];

  for (const def of defaults) {
    await upsertSetting(def);
  }

  log.info({ count: defaults.length }, 'Default settings initialized');
}

// ヘルパー関数

function parseValue(value: string, type: SettingValueType): any {
  switch (type) {
    case 'NUMBER':
      return Number(value);
    case 'BOOLEAN':
      return value.toLowerCase() === 'true';
    case 'JSON':
    case 'ARRAY':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case 'SECRET':
    case 'STRING':
    default:
      return value;
  }
}

function stringifyValue(value: any, type: SettingValueType): string {
  switch (type) {
    case 'JSON':
    case 'ARRAY':
      return JSON.stringify(value);
    case 'BOOLEAN':
      return String(!!value);
    case 'NUMBER':
      return String(Number(value));
    default:
      return String(value);
  }
}

function validateValue(value: string, rule: string): boolean {
  try {
    // 簡易バリデーション（将来的にはJSON Schemaを使用）
    const parsed = JSON.parse(rule);
    if (parsed.pattern) {
      const regex = new RegExp(parsed.pattern);
      return regex.test(value);
    }
    if (parsed.min !== undefined || parsed.max !== undefined) {
      const num = Number(value);
      if (parsed.min !== undefined && num < parsed.min) return false;
      if (parsed.max !== undefined && num > parsed.max) return false;
    }
    return true;
  } catch {
    return true; // ルールが無効な場合はパス
  }
}
