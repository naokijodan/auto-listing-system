import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'system-settings' });

/**
 * 全設定一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, includeSecret = 'false' } = req.query;

    const where: any = {};
    if (category) where.category = category;

    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // シークレット値をマスク
    const maskedSettings = settings.map(s => ({
      ...s,
      value: s.isSecret && includeSecret !== 'true' ? '********' : s.value,
    }));

    res.json({
      success: true,
      data: maskedSettings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリ別設定取得
 */
router.get('/category/:category', async (req, res, next) => {
  try {
    const { category } = req.params;

    const settings = await prisma.systemSetting.findMany({
      where: { category: category as any },
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.key] = parseValue(s.value, s.valueType);
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
 * 単一設定取得
 */
router.get('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      include: {
        history: {
          take: 5,
          orderBy: { changedAt: 'desc' },
        },
      },
    });

    if (!setting) {
      throw new AppError(404, 'Setting not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        ...setting,
        value: setting.isSecret ? '********' : setting.value,
        parsedValue: setting.isSecret ? null : parseValue(setting.value, setting.valueType),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 設定を更新
 */
router.put('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, reason } = req.body;

    if (value === undefined) {
      throw new AppError(400, 'value is required', 'INVALID_INPUT');
    }

    const existing = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new AppError(404, 'Setting not found', 'NOT_FOUND');
    }

    if (existing.isReadOnly) {
      throw new AppError(403, 'Setting is read-only', 'FORBIDDEN');
    }

    const stringValue = stringifyValue(value, existing.valueType);

    // バリデーション
    if (existing.validationRule) {
      const isValid = validateValue(stringValue, existing.validationRule);
      if (!isValid) {
        throw new AppError(400, 'Invalid value', 'VALIDATION_ERROR');
      }
    }

    await prisma.$transaction([
      prisma.settingHistory.create({
        data: {
          settingId: existing.id,
          previousValue: existing.value,
          newValue: stringValue,
          version: existing.version + 1,
          changedBy: req.headers['x-api-key'] as string || 'anonymous',
          changeReason: reason,
        },
      }),
      prisma.systemSetting.update({
        where: { key },
        data: {
          value: stringValue,
          version: { increment: 1 },
          lastChangedBy: req.headers['x-api-key'] as string || 'anonymous',
          lastChangedAt: new Date(),
        },
      }),
    ]);

    log.info({ key, changedBy: req.headers['x-api-key'] }, 'Setting updated');

    res.json({
      success: true,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 複数設定を一括更新
 */
router.put('/', async (req, res, next) => {
  try {
    const { settings, reason } = req.body;

    if (!settings || typeof settings !== 'object') {
      throw new AppError(400, 'settings object is required', 'INVALID_INPUT');
    }

    const changedBy = req.headers['x-api-key'] as string || 'anonymous';
    const results: { key: string; success: boolean; error?: string }[] = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        const existing = await prisma.systemSetting.findUnique({
          where: { key },
        });

        if (!existing) {
          results.push({ key, success: false, error: 'Not found' });
          continue;
        }

        if (existing.isReadOnly) {
          results.push({ key, success: false, error: 'Read-only' });
          continue;
        }

        const stringValue = stringifyValue(value, existing.valueType);

        await prisma.$transaction([
          prisma.settingHistory.create({
            data: {
              settingId: existing.id,
              previousValue: existing.value,
              newValue: stringValue,
              version: existing.version + 1,
              changedBy,
              changeReason: reason,
            },
          }),
          prisma.systemSetting.update({
            where: { key },
            data: {
              value: stringValue,
              version: { increment: 1 },
              lastChangedBy: changedBy,
              lastChangedAt: new Date(),
            },
          }),
        ]);

        results.push({ key, success: true });
      } catch (error) {
        results.push({ key, success: false, error: 'Update failed' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    log.info({ successCount, total: results.length }, 'Bulk settings update');

    res.json({
      success: true,
      data: { results, successCount, total: results.length },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 設定履歴取得
 */
router.get('/:key/history', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { limit = '20' } = req.query;

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new AppError(404, 'Setting not found', 'NOT_FOUND');
    }

    const history = await prisma.settingHistory.findMany({
      where: { settingId: setting.id },
      orderBy: { changedAt: 'desc' },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 設定をロールバック
 */
router.post('/:key/rollback', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { version } = req.body;

    if (!version) {
      throw new AppError(400, 'version is required', 'INVALID_INPUT');
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      include: {
        history: {
          where: { version },
          take: 1,
        },
      },
    });

    if (!setting || setting.history.length === 0) {
      throw new AppError(404, `Version ${version} not found`, 'NOT_FOUND');
    }

    const historyEntry = setting.history[0];
    const changedBy = req.headers['x-api-key'] as string || 'anonymous';

    await prisma.$transaction([
      prisma.settingHistory.create({
        data: {
          settingId: setting.id,
          previousValue: setting.value,
          newValue: historyEntry.newValue,
          version: setting.version + 1,
          changedBy,
          changeReason: `Rollback to version ${version}`,
        },
      }),
      prisma.systemSetting.update({
        where: { key },
        data: {
          value: historyEntry.newValue,
          version: { increment: 1 },
          lastChangedBy: changedBy,
          lastChangedAt: new Date(),
        },
      }),
    ]);

    log.info({ key, fromVersion: setting.version, toVersion: version }, 'Setting rolled back');

    res.json({
      success: true,
      message: `Rolled back to version ${version}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 設定を作成（管理者用）
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      key,
      value,
      category = 'GENERAL',
      valueType = 'STRING',
      label,
      description,
      isSecret = false,
      isReadOnly = false,
    } = req.body;

    if (!key || value === undefined) {
      throw new AppError(400, 'key and value are required', 'INVALID_INPUT');
    }

    const existing = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (existing) {
      throw new AppError(409, 'Setting already exists', 'CONFLICT');
    }

    const stringValue = stringifyValue(value, valueType);

    const setting = await prisma.systemSetting.create({
      data: {
        key,
        category,
        value: stringValue,
        valueType,
        defaultValue: stringValue,
        label,
        description,
        isSecret,
        isReadOnly,
      },
    });

    log.info({ key, category }, 'Setting created');

    res.status(201).json({
      success: true,
      data: setting,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 設定を削除（管理者用）
 */
router.delete('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new AppError(404, 'Setting not found', 'NOT_FOUND');
    }

    if (setting.isReadOnly) {
      throw new AppError(403, 'Cannot delete read-only setting', 'FORBIDDEN');
    }

    await prisma.systemSetting.delete({
      where: { key },
    });

    log.info({ key }, 'Setting deleted');

    res.json({
      success: true,
      message: 'Setting deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数

function parseValue(value: string, type: string): any {
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
    default:
      return value;
  }
}

function stringifyValue(value: any, type: string): string {
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
    return true;
  }
}

export { router as systemSettingsRouter };
