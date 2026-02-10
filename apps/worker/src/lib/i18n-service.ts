/**
 * 多言語対応サービス
 * Phase 30: i18n基盤の構築
 */

import {
  prisma,
  TranslationStatus,
  TranslationSource,
  TextDirection,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as crypto from 'crypto';

const log = logger.child({ module: 'i18n-service' });

// 翻訳キー定義
export interface TranslationKeyDefinition {
  namespace: string;
  key: string;
  description?: string;
  context?: string;
  screenshot?: string;
  placeholders?: string[];
  maxLength?: number;
}

// 翻訳データ
export interface TranslationData {
  locale: string;
  value: string;
  status?: TranslationStatus;
  source?: TranslationSource;
}

// 言語設定
export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction?: TextDirection;
  fallbackLocale?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

// 翻訳バンドル（フロントエンド用）
export interface TranslationBundle {
  locale: string;
  namespace: string;
  translations: Record<string, string>;
  etag: string;
  updatedAt: Date;
}

// フォールバックチェーン
const FALLBACK_CHAIN: Record<string, string[]> = {
  'zh-TW': ['zh', 'en'],
  'zh-CN': ['zh', 'en'],
  'zh': ['en'],
  'ko': ['en'],
  'ja': ['en'],
  'es': ['en'],
  'de': ['en'],
  'fr': ['en'],
  'en': [],
};

/**
 * 名前空間を作成
 */
export async function createNamespace(
  name: string,
  description?: string
): Promise<string> {
  const existing = await prisma.translationNamespace.findUnique({
    where: { name },
  });

  if (existing) {
    return existing.id;
  }

  const namespace = await prisma.translationNamespace.create({
    data: {
      name,
      description,
    },
  });

  log.info({ namespaceId: namespace.id, name }, 'Translation namespace created');

  return namespace.id;
}

/**
 * 翻訳キーを作成
 */
export async function createTranslationKey(
  definition: TranslationKeyDefinition
): Promise<string> {
  // 名前空間を取得または作成
  let namespace = await prisma.translationNamespace.findUnique({
    where: { name: definition.namespace },
  });

  if (!namespace) {
    namespace = await prisma.translationNamespace.create({
      data: { name: definition.namespace },
    });
  }

  // 既存のキーを確認
  const existing = await prisma.translationKey.findUnique({
    where: {
      namespaceId_key: {
        namespaceId: namespace.id,
        key: definition.key,
      },
    },
  });

  if (existing) {
    return existing.id;
  }

  const key = await prisma.translationKey.create({
    data: {
      namespaceId: namespace.id,
      key: definition.key,
      description: definition.description,
      context: definition.context,
      screenshot: definition.screenshot,
      placeholders: (definition.placeholders || []) as any,
      maxLength: definition.maxLength,
    },
  });

  log.info(
    { keyId: key.id, namespace: definition.namespace, key: definition.key },
    'Translation key created'
  );

  return key.id;
}

/**
 * 翻訳を設定
 */
export async function setTranslation(
  namespace: string,
  key: string,
  locale: string,
  value: string,
  options?: {
    status?: TranslationStatus;
    source?: TranslationSource;
    createdBy?: string;
  }
): Promise<string> {
  // キーを取得
  const translationKey = await getOrCreateKey(namespace, key);

  // 既存の翻訳を確認
  const existing = await prisma.translation.findUnique({
    where: {
      keyId_locale: {
        keyId: translationKey.id,
        locale,
      },
    },
  });

  if (existing) {
    // 履歴を記録
    await prisma.translationHistory.create({
      data: {
        translationId: existing.id,
        oldValue: existing.value,
        newValue: value,
        oldStatus: existing.status as TranslationStatus,
        newStatus: options?.status || existing.status as TranslationStatus,
        changedBy: options?.createdBy,
      },
    });

    // 更新
    const updated = await prisma.translation.update({
      where: { id: existing.id },
      data: {
        value,
        status: options?.status,
        source: options?.source,
        version: { increment: 1 },
      },
    });

    return updated.id;
  }

  // 新規作成
  const translation = await prisma.translation.create({
    data: {
      keyId: translationKey.id,
      locale,
      value,
      status: options?.status || 'DRAFT',
      source: options?.source || 'MANUAL',
      createdBy: options?.createdBy,
    },
  });

  log.info({ translationId: translation.id, namespace, key, locale }, 'Translation set');

  return translation.id;
}

/**
 * 翻訳を取得（フォールバック付き）
 */
export async function getTranslation(
  namespace: string,
  key: string,
  locale: string,
  placeholders?: Record<string, string>
): Promise<string | null> {
  // フォールバックチェーンを構築
  const chain = [locale, ...(FALLBACK_CHAIN[locale] || ['en'])];

  // 翻訳キーを取得
  const translationKey = await prisma.translationKey.findFirst({
    where: {
      namespace: { name: namespace },
      key,
      isActive: true,
    },
    include: {
      translations: {
        where: {
          locale: { in: chain },
          status: { in: ['APPROVED', 'PUBLISHED'] },
        },
      },
    },
  });

  if (!translationKey) {
    return null;
  }

  // フォールバック順に翻訳を探す
  for (const lang of chain) {
    const translation = translationKey.translations.find(t => t.locale === lang);
    if (translation) {
      let value = translation.value;

      // プレースホルダーを置換
      if (placeholders) {
        for (const [placeholder, replacement] of Object.entries(placeholders)) {
          value = value.replace(new RegExp(`{{${placeholder}}}`, 'g'), replacement);
        }
      }

      return value;
    }
  }

  return null;
}

/**
 * 名前空間の全翻訳をバンドルとして取得
 */
export async function getTranslationBundle(
  namespace: string,
  locale: string
): Promise<TranslationBundle> {
  const ns = await prisma.translationNamespace.findUnique({
    where: { name: namespace },
  });

  if (!ns) {
    return {
      locale,
      namespace,
      translations: {},
      etag: generateEtag({}),
      updatedAt: new Date(),
    };
  }

  // フォールバックチェーンを構築
  const chain = [locale, ...(FALLBACK_CHAIN[locale] || ['en'])];

  // 全キーと翻訳を取得
  const keys = await prisma.translationKey.findMany({
    where: {
      namespaceId: ns.id,
      isActive: true,
    },
    include: {
      translations: {
        where: {
          locale: { in: chain },
          status: { in: ['APPROVED', 'PUBLISHED'] },
        },
      },
    },
  });

  const translations: Record<string, string> = {};
  let latestUpdate = new Date(0);

  for (const key of keys) {
    // フォールバック順に翻訳を探す
    for (const lang of chain) {
      const translation = key.translations.find(t => t.locale === lang);
      if (translation) {
        translations[key.key] = translation.value;
        if (translation.updatedAt > latestUpdate) {
          latestUpdate = translation.updatedAt;
        }
        break;
      }
    }
  }

  return {
    locale,
    namespace,
    translations,
    etag: generateEtag(translations),
    updatedAt: latestUpdate,
  };
}

/**
 * 複数名前空間の翻訳をまとめて取得
 */
export async function getTranslationBundles(
  namespaces: string[],
  locale: string
): Promise<Record<string, TranslationBundle>> {
  const bundles: Record<string, TranslationBundle> = {};

  for (const ns of namespaces) {
    bundles[ns] = await getTranslationBundle(ns, locale);
  }

  return bundles;
}

/**
 * 対応言語一覧を取得
 */
export async function getSupportedLocales(): Promise<LocaleConfig[]> {
  const locales = await prisma.supportedLocale.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return locales.map(l => ({
    code: l.code,
    name: l.name,
    nativeName: l.nativeName,
    direction: l.direction as TextDirection,
    fallbackLocale: l.fallbackLocale || undefined,
    isDefault: l.isDefault,
    sortOrder: l.sortOrder,
  }));
}

/**
 * 対応言語を追加
 */
export async function addSupportedLocale(config: LocaleConfig): Promise<string> {
  const existing = await prisma.supportedLocale.findUnique({
    where: { code: config.code },
  });

  if (existing) {
    return existing.id;
  }

  const locale = await prisma.supportedLocale.create({
    data: {
      code: config.code,
      name: config.name,
      nativeName: config.nativeName,
      direction: config.direction || 'LTR',
      fallbackLocale: config.fallbackLocale,
      isDefault: config.isDefault || false,
      sortOrder: config.sortOrder || 0,
    },
  });

  log.info({ localeId: locale.id, code: config.code }, 'Supported locale added');

  return locale.id;
}

/**
 * 未翻訳キーを取得
 */
export async function getUntranslatedKeys(
  locale: string,
  namespace?: string
): Promise<Array<{ namespace: string; key: string; description?: string }>> {
  const where: any = { isActive: true };
  if (namespace) {
    where.namespace = { name: namespace };
  }

  const keys = await prisma.translationKey.findMany({
    where,
    include: {
      namespace: { select: { name: true } },
      translations: {
        where: { locale },
      },
    },
  });

  return keys
    .filter(k => k.translations.length === 0)
    .map(k => ({
      namespace: k.namespace.name,
      key: k.key,
      description: k.description || undefined,
    }));
}

/**
 * 翻訳をレビュー済みとしてマーク
 */
export async function approveTranslation(
  translationId: string,
  reviewedBy: string
): Promise<void> {
  const translation = await prisma.translation.findUnique({
    where: { id: translationId },
  });

  if (!translation) {
    throw new Error(`Translation not found: ${translationId}`);
  }

  await prisma.translation.update({
    where: { id: translationId },
    data: {
      status: 'APPROVED',
      reviewedBy,
      reviewedAt: new Date(),
    },
  });

  // 履歴を記録
  await prisma.translationHistory.create({
    data: {
      translationId,
      oldValue: translation.value,
      newValue: translation.value,
      oldStatus: translation.status as TranslationStatus,
      newStatus: 'APPROVED',
      changedBy: reviewedBy,
      changeReason: 'Approved',
    },
  });

  log.info({ translationId, reviewedBy }, 'Translation approved');
}

/**
 * 翻訳を公開
 */
export async function publishTranslations(
  namespace: string,
  locale: string
): Promise<{ published: number }> {
  const ns = await prisma.translationNamespace.findUnique({
    where: { name: namespace },
  });

  if (!ns) {
    throw new Error(`Namespace not found: ${namespace}`);
  }

  const result = await prisma.translation.updateMany({
    where: {
      translationKey: { namespaceId: ns.id },
      locale,
      status: 'APPROVED',
    },
    data: {
      status: 'PUBLISHED',
    },
  });

  log.info({ namespace, locale, published: result.count }, 'Translations published');

  return { published: result.count };
}

/**
 * 翻訳をインポート
 */
export async function importTranslations(
  namespace: string,
  locale: string,
  translations: Record<string, string>,
  options?: {
    source?: TranslationSource;
    status?: TranslationStatus;
    createdBy?: string;
  }
): Promise<{ imported: number; updated: number }> {
  let imported = 0;
  let updated = 0;

  for (const [key, value] of Object.entries(translations)) {
    const keyRecord = await getOrCreateKey(namespace, key);

    const existing = await prisma.translation.findUnique({
      where: {
        keyId_locale: {
          keyId: keyRecord.id,
          locale,
        },
      },
    });

    if (existing) {
      await prisma.translation.update({
        where: { id: existing.id },
        data: {
          value,
          source: options?.source || 'IMPORTED',
          status: options?.status || existing.status,
          version: { increment: 1 },
        },
      });
      updated++;
    } else {
      await prisma.translation.create({
        data: {
          keyId: keyRecord.id,
          locale,
          value,
          source: options?.source || 'IMPORTED',
          status: options?.status || 'DRAFT',
          createdBy: options?.createdBy,
        },
      });
      imported++;
    }
  }

  log.info({ namespace, locale, imported, updated }, 'Translations imported');

  return { imported, updated };
}

/**
 * 翻訳をエクスポート
 */
export async function exportTranslations(
  namespace: string,
  locale: string,
  options?: {
    status?: TranslationStatus[];
    includeMetadata?: boolean;
  }
): Promise<Record<string, string | { value: string; status: string; updatedAt: string }>> {
  const ns = await prisma.translationNamespace.findUnique({
    where: { name: namespace },
  });

  if (!ns) {
    return {};
  }

  const statusFilter = options?.status || ['APPROVED', 'PUBLISHED'];

  const translations = await prisma.translation.findMany({
    where: {
      translationKey: { namespaceId: ns.id },
      locale,
      status: { in: statusFilter },
    },
    include: {
      translationKey: { select: { key: true } },
    },
  });

  const result: Record<string, any> = {};

  for (const t of translations) {
    if (options?.includeMetadata) {
      result[t.translationKey.key] = {
        value: t.value,
        status: t.status,
        updatedAt: t.updatedAt.toISOString(),
      };
    } else {
      result[t.translationKey.key] = t.value;
    }
  }

  return result;
}

/**
 * 翻訳統計を取得
 */
export async function getTranslationStats(namespace?: string): Promise<{
  totalKeys: number;
  byLocale: Record<string, { total: number; byStatus: Record<string, number> }>;
  completionRate: Record<string, number>;
}> {
  const where: any = { isActive: true };
  if (namespace) {
    where.namespace = { name: namespace };
  }

  const keys = await prisma.translationKey.findMany({
    where,
    include: {
      translations: true,
    },
  });

  const locales = await prisma.supportedLocale.findMany({
    where: { isActive: true },
  });

  const byLocale: Record<string, { total: number; byStatus: Record<string, number> }> = {};
  const completionRate: Record<string, number> = {};

  for (const locale of locales) {
    const translations = keys.flatMap(k =>
      k.translations.filter(t => t.locale === locale.code)
    );

    const byStatus: Record<string, number> = {};
    for (const t of translations) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    }

    byLocale[locale.code] = {
      total: translations.length,
      byStatus,
    };

    completionRate[locale.code] = keys.length > 0
      ? (translations.length / keys.length) * 100
      : 0;
  }

  return {
    totalKeys: keys.length,
    byLocale,
    completionRate,
  };
}

/**
 * キーを取得または作成
 */
async function getOrCreateKey(
  namespace: string,
  key: string
): Promise<{ id: string }> {
  let ns = await prisma.translationNamespace.findUnique({
    where: { name: namespace },
  });

  if (!ns) {
    ns = await prisma.translationNamespace.create({
      data: { name: namespace },
    });
  }

  let translationKey = await prisma.translationKey.findUnique({
    where: {
      namespaceId_key: {
        namespaceId: ns.id,
        key,
      },
    },
  });

  if (!translationKey) {
    translationKey = await prisma.translationKey.create({
      data: {
        namespaceId: ns.id,
        key,
      },
    });
  }

  return { id: translationKey.id };
}

/**
 * Etagを生成
 */
function generateEtag(data: unknown): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * デフォルト言語を初期化
 */
export async function initializeDefaultLocales(): Promise<void> {
  const defaultLocales: LocaleConfig[] = [
    { code: 'en', name: 'English', nativeName: 'English', isDefault: true, sortOrder: 1 },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', fallbackLocale: 'en', sortOrder: 2 },
    { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', fallbackLocale: 'en', sortOrder: 3 },
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', fallbackLocale: 'zh', sortOrder: 4 },
    { code: 'ko', name: 'Korean', nativeName: '한국어', fallbackLocale: 'en', sortOrder: 5 },
    { code: 'es', name: 'Spanish', nativeName: 'Español', fallbackLocale: 'en', sortOrder: 6 },
    { code: 'de', name: 'German', nativeName: 'Deutsch', fallbackLocale: 'en', sortOrder: 7 },
    { code: 'fr', name: 'French', nativeName: 'Français', fallbackLocale: 'en', sortOrder: 8 },
  ];

  for (const locale of defaultLocales) {
    await addSupportedLocale(locale);
  }

  log.info({ count: defaultLocales.length }, 'Default locales initialized');
}

/**
 * デフォルト名前空間を初期化
 */
export async function initializeDefaultNamespaces(): Promise<void> {
  const defaultNamespaces = [
    { name: 'common', description: '共通の翻訳（ボタン、ラベル等）' },
    { name: 'navigation', description: 'ナビゲーション関連' },
    { name: 'product', description: '商品関連' },
    { name: 'order', description: '注文関連' },
    { name: 'checkout', description: 'チェックアウト関連' },
    { name: 'error', description: 'エラーメッセージ' },
    { name: 'notification', description: '通知メッセージ' },
    { name: 'settings', description: '設定画面' },
    { name: 'dashboard', description: 'ダッシュボード' },
  ];

  for (const ns of defaultNamespaces) {
    await createNamespace(ns.name, ns.description);
  }

  log.info({ count: defaultNamespaces.length }, 'Default namespaces initialized');
}
