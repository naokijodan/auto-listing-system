import { Hono } from 'hono';
import { prisma } from '@rakuda/database';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

// ========================================
// スキーマ定義
// ========================================

const createExportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(['PRODUCTS', 'ORDERS', 'LISTINGS', 'CUSTOMERS', 'SHIPMENTS', 'SUPPLIERS', 'INVENTORY', 'ANALYTICS', 'AUDIT_LOGS', 'ALL']),
  format: z.enum(['CSV', 'XLSX', 'JSON', 'XML', 'PDF']),
  filters: z.record(z.any()).default({}),
  columns: z.array(z.string()).default([]),
  options: z.record(z.any()).default({}),
});

const createImportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(['PRODUCTS', 'ORDERS', 'LISTINGS', 'CUSTOMERS', 'SUPPLIERS', 'INVENTORY', 'PRICES']),
  format: z.enum(['CSV', 'XLSX', 'JSON', 'XML']),
  sourceUrl: z.string().optional(),
  sourceFileName: z.string().optional(),
  mappings: z.record(z.any()).default({}),
  options: z.record(z.any()).default({}),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(['PRODUCTS', 'ORDERS', 'LISTINGS', 'CUSTOMERS', 'SUPPLIERS', 'INVENTORY', 'PRICES']),
  mappings: z.record(z.any()).default({}),
  validations: z.array(z.any()).default([]),
  transformations: z.array(z.any()).default([]),
  isDefault: z.boolean().default(false),
});

const createScheduleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  entityType: z.enum(['PRODUCTS', 'ORDERS', 'LISTINGS', 'CUSTOMERS', 'SHIPMENTS', 'SUPPLIERS', 'INVENTORY', 'ANALYTICS', 'AUDIT_LOGS', 'ALL']),
  format: z.enum(['CSV', 'XLSX', 'JSON', 'XML', 'PDF']),
  filters: z.record(z.any()).default({}),
  columns: z.array(z.string()).default([]),
  options: z.record(z.any()).default({}),
  schedule: z.string(),
  timezone: z.string().default('Asia/Tokyo'),
  recipients: z.array(z.string()).default([]),
  deliveryMethod: z.enum(['EMAIL', 'SFTP', 'S3', 'WEBHOOK', 'SLACK']).default('EMAIL'),
  deliveryConfig: z.record(z.any()).default({}),
});

// ========================================
// 統計情報
// ========================================

app.get('/stats', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';

  const [
    totalExports,
    pendingExports,
    completedExports,
    totalImports,
    pendingImports,
    completedImports,
    totalTemplates,
    activeSchedules,
    recentExports,
    recentImports,
  ] = await Promise.all([
    prisma.dataExport.count({ where: { organizationId } }),
    prisma.dataExport.count({ where: { organizationId, status: { in: ['PENDING', 'PROCESSING'] } } }),
    prisma.dataExport.count({ where: { organizationId, status: 'COMPLETED' } }),
    prisma.dataImport.count({ where: { organizationId } }),
    prisma.dataImport.count({ where: { organizationId, status: { in: ['PENDING', 'VALIDATING', 'PROCESSING'] } } }),
    prisma.dataImport.count({ where: { organizationId, status: 'COMPLETED' } }),
    prisma.importTemplate.count({ where: { organizationId } }),
    prisma.exportSchedule.count({ where: { organizationId, isActive: true } }),
    prisma.dataExport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        entityType: true,
        format: true,
        status: true,
        totalRecords: true,
        createdAt: true,
      },
    }),
    prisma.dataImport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        entityType: true,
        format: true,
        status: true,
        totalRecords: true,
        successCount: true,
        errorCount: true,
        createdAt: true,
      },
    }),
  ]);

  return c.json({
    exports: {
      total: totalExports,
      pending: pendingExports,
      completed: completedExports,
      recent: recentExports,
    },
    imports: {
      total: totalImports,
      pending: pendingImports,
      completed: completedImports,
      recent: recentImports,
    },
    templates: totalTemplates,
    schedules: activeSchedules,
  });
});

// ========================================
// エクスポート
// ========================================

app.get('/exports', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { status, entityType, format, page = '1', limit = '20' } = c.req.query();

  const where: any = { organizationId };
  if (status) where.status = status;
  if (entityType) where.entityType = entityType;
  if (format) where.format = format;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [exports, total] = await Promise.all([
    prisma.dataExport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.dataExport.count({ where }),
  ]);

  return c.json({
    exports,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

app.post('/exports', zValidator('json', createExportSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const data = c.req.valid('json');

  const exportJob = await prisma.dataExport.create({
    data: {
      ...data,
      organizationId,
      userId,
      status: 'PENDING',
    },
  });

  // 非同期でエクスポート処理を開始（実際はBullMQジョブをキューに追加）
  processExport(exportJob.id).catch(console.error);

  return c.json({ export: exportJob }, 201);
});

app.get('/exports/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const exportJob = await prisma.dataExport.findFirst({
    where: { id, organizationId },
  });

  if (!exportJob) {
    return c.json({ error: 'Export not found' }, 404);
  }

  return c.json({ export: exportJob });
});

app.get('/exports/:id/download', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const exportJob = await prisma.dataExport.findFirst({
    where: { id, organizationId, status: 'COMPLETED' },
  });

  if (!exportJob || !exportJob.fileUrl) {
    return c.json({ error: 'Export file not available' }, 404);
  }

  return c.json({
    downloadUrl: exportJob.fileUrl,
    fileName: exportJob.fileName,
    fileSize: exportJob.fileSize,
    expiresAt: exportJob.expiresAt,
  });
});

app.post('/exports/:id/cancel', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const exportJob = await prisma.dataExport.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return c.json({ export: exportJob });
});

// ========================================
// インポート
// ========================================

app.get('/imports', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { status, entityType, format, page = '1', limit = '20' } = c.req.query();

  const where: any = { organizationId };
  if (status) where.status = status;
  if (entityType) where.entityType = entityType;
  if (format) where.format = format;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [imports, total] = await Promise.all([
    prisma.dataImport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.dataImport.count({ where }),
  ]);

  return c.json({
    imports,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

app.post('/imports', zValidator('json', createImportSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const data = c.req.valid('json');

  const importJob = await prisma.dataImport.create({
    data: {
      ...data,
      organizationId,
      userId,
      status: 'PENDING',
    },
  });

  return c.json({ import: importJob }, 201);
});

app.get('/imports/:id', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const importJob = await prisma.dataImport.findFirst({
    where: { id, organizationId },
    include: {
      logs: {
        take: 100,
        orderBy: { rowNumber: 'asc' },
      },
    },
  });

  if (!importJob) {
    return c.json({ error: 'Import not found' }, 404);
  }

  return c.json({ import: importJob });
});

app.post('/imports/:id/validate', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const importJob = await prisma.dataImport.findFirst({
    where: { id, organizationId },
  });

  if (!importJob) {
    return c.json({ error: 'Import not found' }, 404);
  }

  await prisma.dataImport.update({
    where: { id },
    data: { status: 'VALIDATING' },
  });

  // バリデーション処理（シミュレーション）
  const validationResult = await validateImportData(importJob);

  await prisma.dataImport.update({
    where: { id },
    data: {
      status: validationResult.isValid ? 'VALIDATED' : 'FAILED',
      validationErrors: validationResult.errors,
      totalRecords: validationResult.totalRecords,
    },
  });

  return c.json({ result: validationResult });
});

app.post('/imports/:id/process', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { id } = c.req.param();

  const importJob = await prisma.dataImport.findFirst({
    where: { id, organizationId, status: 'VALIDATED' },
  });

  if (!importJob) {
    return c.json({ error: 'Import not validated or not found' }, 404);
  }

  await prisma.dataImport.update({
    where: { id },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
    },
  });

  // 非同期でインポート処理（実際はBullMQジョブ）
  processImport(importJob.id).catch(console.error);

  return c.json({ message: 'Import processing started' });
});

app.post('/imports/:id/cancel', async (c) => {
  const { id } = c.req.param();

  const importJob = await prisma.dataImport.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return c.json({ import: importJob });
});

app.get('/imports/:id/logs', async (c) => {
  const { id } = c.req.param();
  const { status, page = '1', limit = '50' } = c.req.query();

  const where: any = { importId: id };
  if (status) where.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.importLog.findMany({
      where,
      orderBy: { rowNumber: 'asc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.importLog.count({ where }),
  ]);

  return c.json({
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// ========================================
// テンプレート
// ========================================

app.get('/templates', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { entityType } = c.req.query();

  const where: any = { organizationId };
  if (entityType) where.entityType = entityType;

  const templates = await prisma.importTemplate.findMany({
    where,
    orderBy: [
      { isDefault: 'desc' },
      { usageCount: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return c.json({ templates });
});

app.post('/templates', zValidator('json', createTemplateSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const data = c.req.valid('json');

  if (data.isDefault) {
    await prisma.importTemplate.updateMany({
      where: { organizationId, entityType: data.entityType, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.importTemplate.create({
    data: {
      ...data,
      organizationId,
    },
  });

  return c.json({ template }, 201);
});

app.get('/templates/:id', async (c) => {
  const { id } = c.req.param();

  const template = await prisma.importTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }

  return c.json({ template });
});

app.put('/templates/:id', zValidator('json', createTemplateSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const template = await prisma.importTemplate.update({
    where: { id },
    data,
  });

  return c.json({ template });
});

app.delete('/templates/:id', async (c) => {
  const { id } = c.req.param();

  await prisma.importTemplate.delete({
    where: { id },
  });

  return c.json({ success: true });
});

// ========================================
// スケジュール
// ========================================

app.get('/schedules', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const { isActive, entityType } = c.req.query();

  const where: any = { organizationId };
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (entityType) where.entityType = entityType;

  const schedules = await prisma.exportSchedule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ schedules });
});

app.post('/schedules', zValidator('json', createScheduleSchema), async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const data = c.req.valid('json');

  const schedule = await prisma.exportSchedule.create({
    data: {
      ...data,
      organizationId,
      userId,
      nextRunAt: calculateNextRun(data.schedule, data.timezone),
    },
  });

  return c.json({ schedule }, 201);
});

app.get('/schedules/:id', async (c) => {
  const { id } = c.req.param();

  const schedule = await prisma.exportSchedule.findUnique({
    where: { id },
  });

  if (!schedule) {
    return c.json({ error: 'Schedule not found' }, 404);
  }

  return c.json({ schedule });
});

app.put('/schedules/:id', zValidator('json', createScheduleSchema.partial()), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');

  const updateData: any = { ...data };
  if (data.schedule || data.timezone) {
    const existing = await prisma.exportSchedule.findUnique({ where: { id } });
    if (existing) {
      updateData.nextRunAt = calculateNextRun(
        data.schedule || existing.schedule,
        data.timezone || existing.timezone
      );
    }
  }

  const schedule = await prisma.exportSchedule.update({
    where: { id },
    data: updateData,
  });

  return c.json({ schedule });
});

app.delete('/schedules/:id', async (c) => {
  const { id } = c.req.param();

  await prisma.exportSchedule.delete({
    where: { id },
  });

  return c.json({ success: true });
});

app.post('/schedules/:id/toggle', async (c) => {
  const { id } = c.req.param();

  const existing = await prisma.exportSchedule.findUnique({ where: { id } });
  if (!existing) {
    return c.json({ error: 'Schedule not found' }, 404);
  }

  const schedule = await prisma.exportSchedule.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return c.json({ schedule });
});

app.post('/schedules/:id/run-now', async (c) => {
  const organizationId = c.req.header('x-organization-id') || 'default';
  const userId = c.req.header('x-user-id') || 'default';
  const { id } = c.req.param();

  const schedule = await prisma.exportSchedule.findUnique({
    where: { id },
  });

  if (!schedule) {
    return c.json({ error: 'Schedule not found' }, 404);
  }

  // スケジュールからエクスポートジョブを作成
  const exportJob = await prisma.dataExport.create({
    data: {
      organizationId,
      userId,
      name: `${schedule.name} (Manual Run)`,
      entityType: schedule.entityType,
      format: schedule.format,
      filters: schedule.filters as any,
      columns: schedule.columns as any,
      options: schedule.options as any,
      status: 'PENDING',
    },
  });

  processExport(exportJob.id).catch(console.error);

  return c.json({ export: exportJob });
});

// ========================================
// フィールドマッピング情報
// ========================================

app.get('/fields/:entityType', async (c) => {
  const { entityType } = c.req.param();

  const fields = getEntityFieldsForExport(entityType);
  return c.json({ fields });
});

// ========================================
// ヘルパー関数
// ========================================

async function processExport(exportId: string) {
  await prisma.dataExport.update({
    where: { id: exportId },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
    },
  });

  // シミュレーション：実際はデータ取得→ファイル生成→アップロード
  const totalRecords = Math.floor(Math.random() * 10000) + 100;

  await new Promise(resolve => setTimeout(resolve, 2000));

  const fileUrl = `https://storage.example.com/exports/${exportId}.csv`;
  const fileName = `export_${exportId}.csv`;

  await prisma.dataExport.update({
    where: { id: exportId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      totalRecords,
      processedRecords: totalRecords,
      fileUrl,
      fileName,
      fileSize: totalRecords * 100,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

async function validateImportData(importJob: any) {
  // シミュレーション
  const totalRecords = Math.floor(Math.random() * 1000) + 50;
  const errors: any[] = [];

  if (Math.random() > 0.8) {
    errors.push({
      row: 5,
      field: 'price',
      message: 'Invalid price format',
    });
  }

  return {
    isValid: errors.length === 0,
    totalRecords,
    errors,
  };
}

async function processImport(importId: string) {
  const importJob = await prisma.dataImport.findUnique({
    where: { id: importId },
  });

  if (!importJob || !importJob.totalRecords) return;

  const total = importJob.totalRecords;
  let success = 0;
  let errors = 0;
  let skipped = 0;

  // シミュレーション：行ごとの処理
  for (let i = 0; i < total; i++) {
    const rand = Math.random();
    let status: 'SUCCESS' | 'ERROR' | 'SKIPPED' = 'SUCCESS';

    if (rand > 0.95) {
      status = 'ERROR';
      errors++;
    } else if (rand > 0.9) {
      status = 'SKIPPED';
      skipped++;
    } else {
      success++;
    }

    await prisma.importLog.create({
      data: {
        importId,
        rowNumber: i + 1,
        status,
        originalData: { row: i + 1 },
        errorMessage: status === 'ERROR' ? 'Validation failed' : undefined,
      },
    });

    if (i % 100 === 0) {
      await prisma.dataImport.update({
        where: { id: importId },
        data: {
          processedRecords: i + 1,
          successCount: success,
          errorCount: errors,
          skipCount: skipped,
        },
      });
    }
  }

  await prisma.dataImport.update({
    where: { id: importId },
    data: {
      status: errors > 0 ? 'PARTIALLY_COMPLETED' : 'COMPLETED',
      completedAt: new Date(),
      processedRecords: total,
      successCount: success,
      errorCount: errors,
      skipCount: skipped,
    },
  });
}

function calculateNextRun(schedule: string, timezone: string): Date {
  // 簡易実装：次の実行時刻を計算
  // 実際はcron-parserなどを使用
  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return next;
}

function getEntityFieldsForExport(entityType: string) {
  const fields: Record<string, any[]> = {
    PRODUCTS: [
      { name: 'id', label: 'ID', type: 'string', required: false },
      { name: 'title', label: 'タイトル', type: 'string', required: true },
      { name: 'description', label: '説明', type: 'text', required: false },
      { name: 'price', label: '価格', type: 'number', required: true },
      { name: 'sku', label: 'SKU', type: 'string', required: false },
      { name: 'category', label: 'カテゴリ', type: 'string', required: false },
      { name: 'brand', label: 'ブランド', type: 'string', required: false },
      { name: 'condition', label: '状態', type: 'enum', required: false },
      { name: 'status', label: 'ステータス', type: 'enum', required: false },
      { name: 'quantity', label: '数量', type: 'number', required: false },
      { name: 'createdAt', label: '作成日', type: 'datetime', required: false },
      { name: 'updatedAt', label: '更新日', type: 'datetime', required: false },
    ],
    ORDERS: [
      { name: 'id', label: 'ID', type: 'string', required: false },
      { name: 'externalOrderId', label: '注文ID', type: 'string', required: true },
      { name: 'marketplace', label: 'マーケットプレイス', type: 'enum', required: true },
      { name: 'status', label: 'ステータス', type: 'enum', required: false },
      { name: 'totalPrice', label: '合計金額', type: 'number', required: true },
      { name: 'currency', label: '通貨', type: 'string', required: false },
      { name: 'buyerName', label: '購入者名', type: 'string', required: false },
      { name: 'buyerEmail', label: '購入者メール', type: 'string', required: false },
      { name: 'shippingAddress', label: '配送先住所', type: 'text', required: false },
      { name: 'createdAt', label: '注文日', type: 'datetime', required: false },
    ],
    LISTINGS: [
      { name: 'id', label: 'ID', type: 'string', required: false },
      { name: 'title', label: 'タイトル', type: 'string', required: true },
      { name: 'externalId', label: '外部ID', type: 'string', required: false },
      { name: 'marketplace', label: 'マーケットプレイス', type: 'enum', required: true },
      { name: 'status', label: 'ステータス', type: 'enum', required: false },
      { name: 'price', label: '価格', type: 'number', required: true },
      { name: 'quantity', label: '数量', type: 'number', required: false },
      { name: 'createdAt', label: '出品日', type: 'datetime', required: false },
    ],
    CUSTOMERS: [
      { name: 'id', label: 'ID', type: 'string', required: false },
      { name: 'email', label: 'メール', type: 'string', required: true },
      { name: 'name', label: '名前', type: 'string', required: false },
      { name: 'phone', label: '電話番号', type: 'string', required: false },
      { name: 'address', label: '住所', type: 'text', required: false },
      { name: 'segment', label: 'セグメント', type: 'enum', required: false },
      { name: 'totalOrders', label: '総注文数', type: 'number', required: false },
      { name: 'totalSpent', label: '総購入額', type: 'number', required: false },
    ],
    SUPPLIERS: [
      { name: 'id', label: 'ID', type: 'string', required: false },
      { name: 'name', label: '名前', type: 'string', required: true },
      { name: 'contactEmail', label: 'メール', type: 'string', required: false },
      { name: 'contactPhone', label: '電話番号', type: 'string', required: false },
      { name: 'address', label: '住所', type: 'text', required: false },
      { name: 'rating', label: '評価', type: 'number', required: false },
      { name: 'status', label: 'ステータス', type: 'enum', required: false },
    ],
    INVENTORY: [
      { name: 'sku', label: 'SKU', type: 'string', required: true },
      { name: 'productId', label: '商品ID', type: 'string', required: false },
      { name: 'quantity', label: '数量', type: 'number', required: true },
      { name: 'location', label: '保管場所', type: 'string', required: false },
      { name: 'reorderPoint', label: '発注点', type: 'number', required: false },
      { name: 'reorderQuantity', label: '発注数量', type: 'number', required: false },
    ],
  };

  return fields[entityType] || [];
}

export const dataExportImportRouter = app;
