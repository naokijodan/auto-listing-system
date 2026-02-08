import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'settings-api' });

export const settingsRouter = Router();

// ========================================
// バリデーションスキーマ
// ========================================

const MarketplaceEnum = z.enum(['JOOM', 'EBAY']);
const SyncTypeEnum = z.enum(['INVENTORY', 'ORDER', 'PRICE']);

const SyncSettingUpdateSchema = z.object({
  marketplace: MarketplaceEnum,
  syncType: SyncTypeEnum,
  cronExpression: z.string().min(9).max(100), // 最低限のcron式長さ
  isEnabled: z.boolean().optional(),
});

const BulkSyncSettingUpdateSchema = z.object({
  settings: z.array(SyncSettingUpdateSchema),
});

// cron式の簡易バリデーション
function isValidCronExpression(cron: string): boolean {
  // 基本的なcron式パターン: 分 時 日 月 曜日
  // 例: "0 */6 * * *" (6時間ごと)
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  // 各パートが有効かチェック（簡易版）
  const patterns = [
    /^(\*|[0-5]?\d)(\/\d+)?$|^(\*|[0-5]?\d)-[0-5]?\d$/,  // 分 (0-59)
    /^(\*|[01]?\d|2[0-3])(\/\d+)?$|^(\*|[01]?\d|2[0-3])-([01]?\d|2[0-3])$/,  // 時 (0-23)
    /^(\*|[1-9]|[12]\d|3[01])(\/\d+)?$/,  // 日 (1-31)
    /^(\*|[1-9]|1[0-2])(\/\d+)?$/,  // 月 (1-12)
    /^(\*|[0-6])(\/\d+)?$/,  // 曜日 (0-6)
  ];

  for (let i = 0; i < 5; i++) {
    const part = parts[i];
    // * はすべてのパートで有効
    if (part === '*') continue;
    // */n パターン
    if (part.startsWith('*/')) continue;
    // 数値パターン
    if (!patterns[i].test(part)) {
      return false;
    }
  }

  return true;
}

// ========================================
// GET /api/settings/sync-schedule - 全設定取得
// ========================================
settingsRouter.get('/sync-schedule', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.marketplaceSyncSetting.findMany({
      orderBy: [
        { marketplace: 'asc' },
        { syncType: 'asc' },
      ],
    });

    log.info({
      type: 'sync_settings_fetched',
      count: settings.length,
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    log.error({ type: 'sync_settings_fetch_error', error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync settings',
    });
  }
});

// ========================================
// GET /api/settings/sync-schedule/:marketplace/:syncType - 個別設定取得
// ========================================
settingsRouter.get(
  '/sync-schedule/:marketplace/:syncType',
  async (req: Request, res: Response) => {
    try {
      const { marketplace, syncType } = req.params;

      // パラメータバリデーション
      const marketplaceResult = MarketplaceEnum.safeParse(marketplace.toUpperCase());
      const syncTypeResult = SyncTypeEnum.safeParse(syncType.toUpperCase());

      if (!marketplaceResult.success || !syncTypeResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid marketplace or syncType',
        });
        return;
      }

      const setting = await prisma.marketplaceSyncSetting.findUnique({
        where: {
          marketplace_syncType: {
            marketplace: marketplaceResult.data,
            syncType: syncTypeResult.data,
          },
        },
      });

      if (!setting) {
        res.status(404).json({
          success: false,
          error: 'Setting not found',
        });
        return;
      }

      res.json({
        success: true,
        data: setting,
      });
    } catch (error) {
      log.error({ type: 'sync_setting_fetch_error', error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sync setting',
      });
    }
  }
);

// ========================================
// PUT /api/settings/sync-schedule - 設定更新（単一または一括）
// ========================================
settingsRouter.put('/sync-schedule', async (req: Request, res: Response) => {
  try {
    // リクエストボディの判定
    const isBulk = Array.isArray(req.body.settings);

    if (isBulk) {
      // 一括更新
      const result = BulkSyncSettingUpdateSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: result.error.issues,
        });
        return;
      }

      // cron式バリデーション
      for (const setting of result.data.settings) {
        if (!isValidCronExpression(setting.cronExpression)) {
          res.status(400).json({
            success: false,
            error: `Invalid cron expression for ${setting.marketplace}/${setting.syncType}: ${setting.cronExpression}`,
          });
          return;
        }
      }

      // 一括upsert
      const updatedSettings = await prisma.$transaction(
        result.data.settings.map((setting) =>
          prisma.marketplaceSyncSetting.upsert({
            where: {
              marketplace_syncType: {
                marketplace: setting.marketplace,
                syncType: setting.syncType,
              },
            },
            update: {
              cronExpression: setting.cronExpression,
              isEnabled: setting.isEnabled ?? true,
              updatedAt: new Date(),
            },
            create: {
              marketplace: setting.marketplace,
              syncType: setting.syncType,
              cronExpression: setting.cronExpression,
              isEnabled: setting.isEnabled ?? true,
            },
          })
        )
      );

      log.info({
        type: 'sync_settings_bulk_updated',
        count: updatedSettings.length,
        settings: result.data.settings.map((s) => ({
          marketplace: s.marketplace,
          syncType: s.syncType,
          cronExpression: s.cronExpression,
        })),
      });

      res.json({
        success: true,
        data: updatedSettings,
        message: `${updatedSettings.length} settings updated`,
      });
    } else {
      // 単一更新
      const result = SyncSettingUpdateSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: result.error.issues,
        });
        return;
      }

      // cron式バリデーション
      if (!isValidCronExpression(result.data.cronExpression)) {
        res.status(400).json({
          success: false,
          error: `Invalid cron expression: ${result.data.cronExpression}`,
        });
        return;
      }

      const updatedSetting = await prisma.marketplaceSyncSetting.upsert({
        where: {
          marketplace_syncType: {
            marketplace: result.data.marketplace,
            syncType: result.data.syncType,
          },
        },
        update: {
          cronExpression: result.data.cronExpression,
          isEnabled: result.data.isEnabled ?? true,
          updatedAt: new Date(),
        },
        create: {
          marketplace: result.data.marketplace,
          syncType: result.data.syncType,
          cronExpression: result.data.cronExpression,
          isEnabled: result.data.isEnabled ?? true,
        },
      });

      log.info({
        type: 'sync_setting_updated',
        marketplace: result.data.marketplace,
        syncType: result.data.syncType,
        cronExpression: result.data.cronExpression,
      });

      res.json({
        success: true,
        data: updatedSetting,
      });
    }
  } catch (error) {
    log.error({ type: 'sync_setting_update_error', error });
    res.status(500).json({
      success: false,
      error: 'Failed to update sync settings',
    });
  }
});

// ========================================
// PATCH /api/settings/sync-schedule/:marketplace/:syncType/toggle - 有効/無効切り替え
// ========================================
settingsRouter.patch(
  '/sync-schedule/:marketplace/:syncType/toggle',
  async (req: Request, res: Response) => {
    try {
      const { marketplace, syncType } = req.params;

      // パラメータバリデーション
      const marketplaceResult = MarketplaceEnum.safeParse(marketplace.toUpperCase());
      const syncTypeResult = SyncTypeEnum.safeParse(syncType.toUpperCase());

      if (!marketplaceResult.success || !syncTypeResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid marketplace or syncType',
        });
        return;
      }

      // 現在の設定を取得
      const currentSetting = await prisma.marketplaceSyncSetting.findUnique({
        where: {
          marketplace_syncType: {
            marketplace: marketplaceResult.data,
            syncType: syncTypeResult.data,
          },
        },
      });

      if (!currentSetting) {
        res.status(404).json({
          success: false,
          error: 'Setting not found',
        });
        return;
      }

      // トグル
      const updatedSetting = await prisma.marketplaceSyncSetting.update({
        where: {
          marketplace_syncType: {
            marketplace: marketplaceResult.data,
            syncType: syncTypeResult.data,
          },
        },
        data: {
          isEnabled: !currentSetting.isEnabled,
          updatedAt: new Date(),
        },
      });

      log.info({
        type: 'sync_setting_toggled',
        marketplace: marketplaceResult.data,
        syncType: syncTypeResult.data,
        isEnabled: updatedSetting.isEnabled,
      });

      res.json({
        success: true,
        data: updatedSetting,
      });
    } catch (error) {
      log.error({ type: 'sync_setting_toggle_error', error });
      res.status(500).json({
        success: false,
        error: 'Failed to toggle sync setting',
      });
    }
  }
);

// ========================================
// POST /api/settings/sync-schedule/:marketplace/:syncType/run - 手動実行記録
// ========================================
settingsRouter.post(
  '/sync-schedule/:marketplace/:syncType/run',
  async (req: Request, res: Response) => {
    try {
      const { marketplace, syncType } = req.params;

      // パラメータバリデーション
      const marketplaceResult = MarketplaceEnum.safeParse(marketplace.toUpperCase());
      const syncTypeResult = SyncTypeEnum.safeParse(syncType.toUpperCase());

      if (!marketplaceResult.success || !syncTypeResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid marketplace or syncType',
        });
        return;
      }

      // 実行日時を更新
      const updatedSetting = await prisma.marketplaceSyncSetting.update({
        where: {
          marketplace_syncType: {
            marketplace: marketplaceResult.data,
            syncType: syncTypeResult.data,
          },
        },
        data: {
          lastRunAt: new Date(),
          updatedAt: new Date(),
        },
      });

      log.info({
        type: 'sync_setting_run_recorded',
        marketplace: marketplaceResult.data,
        syncType: syncTypeResult.data,
        lastRunAt: updatedSetting.lastRunAt,
      });

      res.json({
        success: true,
        data: updatedSetting,
      });
    } catch (error) {
      log.error({ type: 'sync_setting_run_error', error });
      res.status(500).json({
        success: false,
        error: 'Failed to record sync run',
      });
    }
  }
);
