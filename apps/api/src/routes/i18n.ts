import { Router } from 'express';
import { prisma, TranslationStatus, TranslationSource, TextDirection } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import * as crypto from 'crypto';

const router = Router();
const log = logger.child({ module: 'i18n' });

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
 * 翻訳バンドル取得（フロントエンド用）
 */
router.get('/bundle/:locale', async (req, res, next) => {
  try {
    const { locale } = req.params;
    const { namespace, namespaces } = req.query;

    // ETag チェック
    const ifNoneMatch = req.headers['if-none-match'];

    // 名前空間を決定
    let nsNames: string[];
    if (namespaces) {
      nsNames = (namespaces as string).split(',');
    } else if (namespace) {
      nsNames = [namespace as string];
    } else {
      // デフォルトの名前空間
      nsNames = ['common'];
    }

    // フォールバックチェーンを構築
    const chain = [locale, ...(FALLBACK_CHAIN[locale] || ['en'])];

    const bundles: Record<string, Record<string, string>> = {};
    let latestUpdate = new Date(0);

    for (const nsName of nsNames) {
      const ns = await prisma.translationNamespace.findUnique({
        where: { name: nsName },
      });

      if (!ns) {
        bundles[nsName] = {};
        continue;
      }

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

      for (const key of keys) {
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

      bundles[nsName] = translations;
    }

    // ETag を生成
    const etag = generateEtag(bundles);

    // ETag が一致する場合は 304 を返す
    if (ifNoneMatch === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Last-Modified', latestUpdate.toUTCString());

    res.json({
      success: true,
      data: {
        locale,
        bundles,
        updatedAt: latestUpdate.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 対応言語一覧取得
 */
router.get('/locales', async (_req, res, next) => {
  try {
    const locales = await prisma.supportedLocale.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: locales,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 対応言語追加
 */
router.post('/locales', async (req, res, next) => {
  try {
    const {
      code,
      name,
      nativeName,
      direction = 'LTR',
      fallbackLocale,
      isDefault = false,
      sortOrder = 0,
    } = req.body;

    if (!code || !name || !nativeName) {
      throw new AppError(400, 'code, name, and nativeName are required', 'INVALID_INPUT');
    }

    const validDirections = Object.values(TextDirection);
    if (!validDirections.includes(direction)) {
      throw new AppError(400, `Invalid direction: ${direction}`, 'INVALID_INPUT');
    }

    const locale = await prisma.supportedLocale.create({
      data: {
        code,
        name,
        nativeName,
        direction,
        fallbackLocale,
        isDefault,
        sortOrder,
      },
    });

    log.info({ localeId: locale.id, code }, 'Supported locale added');

    res.status(201).json({
      success: true,
      data: locale,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 対応言語更新
 */
router.patch('/locales/:code', async (req, res, next) => {
  try {
    const {
      name,
      nativeName,
      direction,
      fallbackLocale,
      isDefault,
      isActive,
      sortOrder,
    } = req.body;

    const locale = await prisma.supportedLocale.update({
      where: { code: req.params.code },
      data: {
        ...(name !== undefined && { name }),
        ...(nativeName !== undefined && { nativeName }),
        ...(direction !== undefined && { direction }),
        ...(fallbackLocale !== undefined && { fallbackLocale }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    res.json({
      success: true,
      data: locale,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 名前空間一覧取得
 */
router.get('/namespaces', async (_req, res, next) => {
  try {
    const namespaces = await prisma.translationNamespace.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { keys: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: namespaces,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 名前空間作成
 */
router.post('/namespaces', async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      throw new AppError(400, 'name is required', 'INVALID_INPUT');
    }

    const namespace = await prisma.translationNamespace.create({
      data: {
        name,
        description,
      },
    });

    log.info({ namespaceId: namespace.id, name }, 'Translation namespace created');

    res.status(201).json({
      success: true,
      data: namespace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳キー一覧取得
 */
router.get('/keys', async (req, res, next) => {
  try {
    const { namespace, search, limit = '50', offset = '0' } = req.query;

    const where: any = { isActive: true };
    if (namespace) {
      where.namespace = { name: namespace as string };
    }
    if (search) {
      where.OR = [
        { key: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const [keys, total] = await Promise.all([
      prisma.translationKey.findMany({
        where,
        include: {
          namespace: { select: { name: true } },
          translations: {
            select: {
              locale: true,
              status: true,
            },
          },
        },
        orderBy: { key: 'asc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.translationKey.count({ where }),
    ]);

    res.json({
      success: true,
      data: keys,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳キー作成
 */
router.post('/keys', async (req, res, next) => {
  try {
    const {
      namespace,
      key,
      description,
      context,
      screenshot,
      placeholders = [],
      maxLength,
    } = req.body;

    if (!namespace || !key) {
      throw new AppError(400, 'namespace and key are required', 'INVALID_INPUT');
    }

    // 名前空間を取得または作成
    let ns = await prisma.translationNamespace.findUnique({
      where: { name: namespace },
    });

    if (!ns) {
      ns = await prisma.translationNamespace.create({
        data: { name: namespace },
      });
    }

    const translationKey = await prisma.translationKey.create({
      data: {
        namespaceId: ns.id,
        key,
        description,
        context,
        screenshot,
        placeholders,
        maxLength,
      },
    });

    log.info({ keyId: translationKey.id, namespace, key }, 'Translation key created');

    res.status(201).json({
      success: true,
      data: translationKey,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳キー詳細取得
 */
router.get('/keys/:id', async (req, res, next) => {
  try {
    const key = await prisma.translationKey.findUnique({
      where: { id: req.params.id },
      include: {
        namespace: { select: { name: true } },
        translations: {
          orderBy: { locale: 'asc' },
        },
      },
    });

    if (!key) {
      throw new AppError(404, 'Translation key not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: key,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳キー更新
 */
router.patch('/keys/:id', async (req, res, next) => {
  try {
    const {
      description,
      context,
      screenshot,
      placeholders,
      maxLength,
      isActive,
    } = req.body;

    const key = await prisma.translationKey.update({
      where: { id: req.params.id },
      data: {
        ...(description !== undefined && { description }),
        ...(context !== undefined && { context }),
        ...(screenshot !== undefined && { screenshot }),
        ...(placeholders !== undefined && { placeholders }),
        ...(maxLength !== undefined && { maxLength }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: key,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳設定
 */
router.put('/keys/:id/translations/:locale', async (req, res, next) => {
  try {
    const { value, status, source, createdBy } = req.body;

    if (value === undefined) {
      throw new AppError(400, 'value is required', 'INVALID_INPUT');
    }

    const keyRecord = await prisma.translationKey.findUnique({
      where: { id: req.params.id },
    });

    if (!keyRecord) {
      throw new AppError(404, 'Translation key not found', 'NOT_FOUND');
    }

    // 既存の翻訳を確認
    const existing = await prisma.translation.findUnique({
      where: {
        keyId_locale: {
          keyId: req.params.id,
          locale: req.params.locale,
        },
      },
    });

    let translation;

    if (existing) {
      // 履歴を記録
      await prisma.translationHistory.create({
        data: {
          translationId: existing.id,
          oldValue: existing.value,
          newValue: value,
          oldStatus: existing.status as TranslationStatus,
          newStatus: status || existing.status as TranslationStatus,
          changedBy: createdBy,
        },
      });

      // 更新
      translation = await prisma.translation.update({
        where: { id: existing.id },
        data: {
          value,
          ...(status !== undefined && { status }),
          ...(source !== undefined && { source }),
          version: { increment: 1 },
        },
      });
    } else {
      // 新規作成
      translation = await prisma.translation.create({
        data: {
          keyId: req.params.id,
          locale: req.params.locale,
          value,
          status: status || 'DRAFT',
          source: source || 'MANUAL',
          createdBy,
        },
      });
    }

    log.info(
      { translationId: translation.id, keyId: req.params.id, locale: req.params.locale },
      'Translation set'
    );

    res.json({
      success: true,
      data: translation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳承認
 */
router.post('/translations/:id/approve', async (req, res, next) => {
  try {
    const { reviewedBy } = req.body;

    if (!reviewedBy) {
      throw new AppError(400, 'reviewedBy is required', 'INVALID_INPUT');
    }

    const translation = await prisma.translation.findUnique({
      where: { id: req.params.id },
    });

    if (!translation) {
      throw new AppError(404, 'Translation not found', 'NOT_FOUND');
    }

    const updated = await prisma.translation.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        reviewedBy,
        reviewedAt: new Date(),
      },
    });

    // 履歴を記録
    await prisma.translationHistory.create({
      data: {
        translationId: req.params.id,
        oldValue: translation.value,
        newValue: translation.value,
        oldStatus: translation.status as TranslationStatus,
        newStatus: 'APPROVED',
        changedBy: reviewedBy,
        changeReason: 'Approved',
      },
    });

    log.info({ translationId: req.params.id, reviewedBy }, 'Translation approved');

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳公開
 */
router.post('/namespaces/:namespace/publish/:locale', async (req, res, next) => {
  try {
    const ns = await prisma.translationNamespace.findUnique({
      where: { name: req.params.namespace },
    });

    if (!ns) {
      throw new AppError(404, 'Namespace not found', 'NOT_FOUND');
    }

    const result = await prisma.translation.updateMany({
      where: {
        translationKey: { namespaceId: ns.id },
        locale: req.params.locale,
        status: 'APPROVED',
      },
      data: {
        status: 'PUBLISHED',
      },
    });

    log.info(
      { namespace: req.params.namespace, locale: req.params.locale, published: result.count },
      'Translations published'
    );

    res.json({
      success: true,
      data: { published: result.count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 未翻訳キー取得
 */
router.get('/untranslated/:locale', async (req, res, next) => {
  try {
    const { namespace } = req.query;

    const where: any = { isActive: true };
    if (namespace) {
      where.namespace = { name: namespace as string };
    }

    const keys = await prisma.translationKey.findMany({
      where,
      include: {
        namespace: { select: { name: true } },
        translations: {
          where: { locale: req.params.locale },
        },
      },
    });

    const untranslated = keys
      .filter(k => k.translations.length === 0)
      .map(k => ({
        id: k.id,
        namespace: k.namespace.name,
        key: k.key,
        description: k.description,
        context: k.context,
      }));

    res.json({
      success: true,
      data: untranslated,
      count: untranslated.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳インポート
 */
router.post('/import', async (req, res, next) => {
  try {
    const { namespace, locale, translations, source = 'IMPORTED', status = 'DRAFT', createdBy } = req.body;

    if (!namespace || !locale || !translations) {
      throw new AppError(400, 'namespace, locale, and translations are required', 'INVALID_INPUT');
    }

    // 名前空間を取得または作成
    let ns = await prisma.translationNamespace.findUnique({
      where: { name: namespace },
    });

    if (!ns) {
      ns = await prisma.translationNamespace.create({
        data: { name: namespace },
      });
    }

    let imported = 0;
    let updated = 0;

    for (const [key, value] of Object.entries(translations)) {
      // キーを取得または作成
      let keyRecord = await prisma.translationKey.findUnique({
        where: {
          namespaceId_key: {
            namespaceId: ns.id,
            key,
          },
        },
      });

      if (!keyRecord) {
        keyRecord = await prisma.translationKey.create({
          data: {
            namespaceId: ns.id,
            key,
          },
        });
      }

      // 翻訳を設定
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
            value: value as string,
            source,
            version: { increment: 1 },
          },
        });
        updated++;
      } else {
        await prisma.translation.create({
          data: {
            keyId: keyRecord.id,
            locale,
            value: value as string,
            source,
            status,
            createdBy,
          },
        });
        imported++;
      }
    }

    log.info({ namespace, locale, imported, updated }, 'Translations imported');

    res.json({
      success: true,
      data: { imported, updated },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳エクスポート
 */
router.get('/export/:namespace/:locale', async (req, res, next) => {
  try {
    const { status, includeMetadata } = req.query;

    const ns = await prisma.translationNamespace.findUnique({
      where: { name: req.params.namespace },
    });

    if (!ns) {
      res.json({
        success: true,
        data: {},
      });
      return;
    }

    const statusFilter = status
      ? (status as string).split(',')
      : ['APPROVED', 'PUBLISHED'];

    const translations = await prisma.translation.findMany({
      where: {
        translationKey: { namespaceId: ns.id },
        locale: req.params.locale,
        status: { in: statusFilter as TranslationStatus[] },
      },
      include: {
        translationKey: { select: { key: true } },
      },
    });

    const result: Record<string, any> = {};

    for (const t of translations) {
      if (includeMetadata === 'true') {
        result[t.translationKey.key] = {
          value: t.value,
          status: t.status,
          updatedAt: t.updatedAt.toISOString(),
        };
      } else {
        result[t.translationKey.key] = t.value;
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳統計
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { namespace } = req.query;

    const where: any = { isActive: true };
    if (namespace) {
      where.namespace = { name: namespace as string };
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
        ? Math.round((translations.length / keys.length) * 100)
        : 0;
    }

    res.json({
      success: true,
      data: {
        totalKeys: keys.length,
        byLocale,
        completionRate,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳ステータス一覧
 */
router.get('/statuses', async (_req, res, next) => {
  try {
    const statuses = Object.values(TranslationStatus).map((status) => ({
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

/**
 * 翻訳ソース一覧
 */
router.get('/sources', async (_req, res, next) => {
  try {
    const sources = Object.values(TranslationSource).map((source) => ({
      value: source,
      label: getSourceLabel(source),
    }));

    res.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function generateEtag(data: unknown): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

function getStatusLabel(status: TranslationStatus): string {
  const labels: Record<TranslationStatus, string> = {
    UNTRANSLATED: '未翻訳',
    MACHINE: '機械翻訳',
    DRAFT: '下書き',
    PENDING_REVIEW: 'レビュー待ち',
    APPROVED: '承認済み',
    PUBLISHED: '公開済み',
  };
  return labels[status] || status;
}

function getSourceLabel(source: TranslationSource): string {
  const labels: Record<TranslationSource, string> = {
    MANUAL: '手動入力',
    MACHINE_GOOGLE: 'Google翻訳',
    MACHINE_DEEPL: 'DeepL',
    MACHINE_GPT: 'GPT',
    IMPORTED: 'インポート',
  };
  return labels[source] || source;
}

export { router as i18nRouter };
