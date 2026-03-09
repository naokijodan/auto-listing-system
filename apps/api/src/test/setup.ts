import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock Prisma Client
export const mockPrisma = {
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  shopifyProduct: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  listing: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  source: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  jobLog: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  oAuthState: {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  marketplaceCredential: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
  },
  ebayCategoryMapping: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  translationPrompt: {
    findFirst: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  webhookEvent: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  order: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  sale: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  enrichmentTask: {
    create: vi.fn(),
    delete: vi.fn(),
  },
  notificationChannel: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  exchangeRate: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  priceChangeLog: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  priceSetting: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  shippingPolicy: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  marketplaceSyncSetting: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  // Phase 97: Automation Rules
  automationRule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  automationExecution: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  safetySettings: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  // Phase 98: Profit Calculation
  productCost: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  profitCalculation: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  feeStructure: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  profitTarget: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  // Phase 93: Backup Recovery
  backupJob: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  backupSchedule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  recoveryPoint: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  restoreJob: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  // Phase 94: Monitoring Alerts
  alertRule: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  alertIncident: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  alertEscalation: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  alertNotificationChannel: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  alertNotification: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  // Phase 95: Listing Performance
  listingPerformance: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  performanceSnapshot: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  performanceThreshold: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  lowPerformanceFlag: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  categoryBenchmark: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  // Phase 96: Listing Improvement
  improvementSuggestion: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  bulkAction: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  actionHistory: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation((operations: any[]) =>
    Promise.all(operations.map((op: any) => op))
  ),
};

// Simple in-memory store for worker integration tests
let __mem: {
  lastProduct: any | null;
  lastTask: any | null;
  lastListing: any | null;
} = { lastProduct: null, lastTask: null, lastListing: null };

// Prisma モジュールをモック
vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

// Logger モジュールをモック
vi.mock('@rakuda/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// BullMQ Queueをモック
const createMockJob = (id: string, data: any) => ({
  id,
  name: 'test-job',
  data,
  timestamp: Date.now(),
  attemptsMade: 0,
  failedReason: null,
  processedOn: null,
  finishedOn: null,
  returnvalue: null,
  getState: vi.fn().mockResolvedValue('waiting'),
  retry: vi.fn().mockResolvedValue(undefined),
});

export const mockQueue = {
  add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
  addBulk: vi.fn().mockResolvedValue([]),
  close: vi.fn(),
  getWaitingCount: vi.fn().mockResolvedValue(0),
  getActiveCount: vi.fn().mockResolvedValue(0),
  getCompletedCount: vi.fn().mockResolvedValue(0),
  getFailedCount: vi.fn().mockResolvedValue(0),
  getDelayedCount: vi.fn().mockResolvedValue(0),
  getWaiting: vi.fn().mockResolvedValue([]),
  getActive: vi.fn().mockResolvedValue([]),
  getCompleted: vi.fn().mockResolvedValue([]),
  getFailed: vi.fn().mockResolvedValue([]),
  getDelayed: vi.fn().mockResolvedValue([]),
  getJob: vi.fn().mockResolvedValue(null),
};

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => mockQueue),
}));

export { createMockJob };

// ioredisをモック
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    quit: vi.fn(),
  })),
}));

// Mock @prisma/client used by enrichment package
vi.mock('@prisma/client', () => {
  class FakePrismaClient {
    itemSpecificsField = {
      findMany: vi.fn(async (args?: any) => {
        const category = args?.where?.category;
        if (!category || category === 'Watches') {
          return [
            { category: 'Watches', fieldName: 'Brand', fieldType: 'required', priority: 1, notes: '', tagJp: '腕時計, 時計' },
            { category: 'Watches', fieldName: 'Movement', fieldType: 'required', priority: 2, notes: '', tagJp: '腕時計, 時計' },
            { category: 'Watches', fieldName: 'Dial Color', fieldType: 'recommended', priority: 3, notes: '', tagJp: '腕時計, 時計' },
            { category: 'Watches', fieldName: 'Case Size', fieldType: 'recommended', priority: 4, notes: '', tagJp: '腕時計, 時計' },
          ];
        }
        return [];
      }),
    };
    brand = {
      findMany: vi.fn(async () => [
        {
          name: 'Seiko',
          jpNames: ['セイコー'],
          categories: ['Watches'],
          isMaterial: false,
          parentBrand: null,
          country: 'Japan',
        },
      ]),
    };
  }
  return { PrismaClient: FakePrismaClient };
});

// デフォルト値を設定
export function setupDefaultMocks() {
  // reset memory
  __mem = { lastProduct: null, lastTask: null, lastListing: null };
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockPrisma.product.count.mockResolvedValue(0);
  mockPrisma.listing.findMany.mockResolvedValue([]);
  mockPrisma.listing.count.mockResolvedValue(0);

  // marketplaceCredential.upsert
  mockPrisma.marketplaceCredential.upsert.mockResolvedValue({
    id: '1',
    marketplace: 'EBAY',
    name: 'default',
    isActive: true,
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
  });
  mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
    id: '1',
    marketplace: 'EBAY',
    isActive: true,
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    },
  });

  // ebayCategoryMapping.upsert
  mockPrisma.ebayCategoryMapping.upsert.mockResolvedValue({
    id: '1',
    sourceCategory: 'Watches',
    ebayCategoryId: '31387',
    ebayCategoryName: 'Wristwatches',
    itemSpecifics: {},
    isActive: true,
  });
  mockPrisma.ebayCategoryMapping.findUnique.mockImplementation(async (args: any) => {
    const where = args?.where || {};
    if (where.sourceCategory === 'Watches') {
      return {
        id: '1',
        sourceCategory: 'Watches',
        ebayCategoryId: '31387',
        ebayCategoryName: 'Wristwatches',
        itemSpecifics: {},
        isActive: true,
      } as any;
    }
    return null;
  });

  // translationPrompt defaults
  mockPrisma.translationPrompt.upsert.mockImplementation(async (args: any) => {
    const data = args?.create || args?.data || {};
    return { id: `prompt-${Date.now()}`, ...data };
  });
  mockPrisma.translationPrompt.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where || {};
    if (where.category === 'Watches' && where.isActive === true) {
      return {
        id: 'prompt-1',
        name: 'TEST-時計専用V2',
        category: 'Watches',
        marketplace: null,
        systemPrompt: 'WATCH-PROMPT-V2',
        userPrompt: 'タイトル: {{title}}\n説明: {{description}}\nカテゴリ: {{category}}',
        extractAttributes: ['brand', 'model'],
        priority: 100,
        isActive: true,
        isDefault: false,
      } as any;
    }
    if (where.isDefault === true && where.isActive === true) {
      return {
        id: 'prompt-2',
        name: 'TEST-一般・汎用',
        category: null,
        marketplace: null,
        systemPrompt: 'DEFAULT-PROMPT',
        userPrompt: 'タイトル: {{title}}\n説明: {{description}}\nカテゴリ: {{category}}',
        extractAttributes: ['brand', 'model'],
        priority: 1,
        isActive: true,
        isDefault: true,
      } as any;
    }
    return null;
  });
  mockPrisma.translationPrompt.delete.mockResolvedValue({ id: '1' });

  // delete mocks for cleanup
  mockPrisma.listing.delete.mockResolvedValue({ id: '1' });
  mockPrisma.enrichmentTask.delete.mockResolvedValue({ id: '1' });
  mockPrisma.product.delete.mockResolvedValue({ id: '1' });
  mockPrisma.source.delete.mockResolvedValue({ id: '1' });

  // Source
  mockPrisma.source.create.mockImplementation(async (args: any) => {
    const data = args?.data || {};
    return { id: `src-${Date.now()}`, ...data };
  });

  // EnrichmentTask
  mockPrisma.enrichmentTask.create.mockImplementation(async (args: any) => {
    const data = args?.data || {};
    const task = { id: `task-${Date.now()}`, ...data };
    __mem.lastTask = task;
    return task;
  });
  mockPrisma.enrichmentTask.findUnique = vi.fn(async (args: any) => {
    const where = args?.where || {};
    const include = args?.include || {};
    if (
      __mem.lastTask &&
      ((__mem.lastTask as any).id === where.id || (__mem.lastTask as any).productId === where.productId)
    ) {
      const task = { ...(__mem.lastTask as any) };
      if (include.product) {
        task.product = __mem.lastProduct && (__mem.lastProduct as any).id === task.productId
          ? __mem.lastProduct
          : (__mem.lastProduct || { id: task.productId });
      }
      return task;
    }
    return null;
  });
  mockPrisma.enrichmentTask.update = vi.fn(async (args: any) => {
    const where = args?.where || {};
    const data = args?.data || {};
    if (__mem.lastTask && (__mem.lastTask as any).id === where.id) {
      __mem.lastTask = { ...(__mem.lastTask as any), ...data };
      return __mem.lastTask;
    }
    return { id: where.id, ...data };
  });

  // Product.create
  mockPrisma.product.create.mockImplementation(async (args: any) => {
    const data = args?.data || {};
    const prod = { id: `prod-${Date.now()}`, processedImages: [], ...data };
    __mem.lastProduct = prod;
    return prod;
  });

  // Listing (stateful minimal)
  mockPrisma.listing.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.listing.create.mockImplementation(async (args: any) => {
    const data = args?.data || {};
    const listing = { id: `lst-${Date.now()}`, ...data };
    __mem.lastListing = listing;
    return listing;
  });
  mockPrisma.listing.findUnique.mockImplementation(async (args: any) => {
    const id = args?.where?.id;
    if (__mem.lastListing && (__mem.lastListing as any).id === id) {
      if (args?.include?.product) {
        return { ...(__mem.lastListing as any), product: __mem.lastProduct };
      }
      if (args?.select?.marketplaceData) {
        const md = (__mem.lastListing as any).marketplaceData || {};
        return { marketplaceData: md };
      }
      return __mem.lastListing;
    }
    return null;
  });
  mockPrisma.listing.findFirst.mockImplementation(async (args: any) => {
    const where = args?.where || {};
    if (
      __mem.lastListing &&
      (__mem.lastListing as any).productId === where.productId &&
      (__mem.lastListing as any).marketplace === where.marketplace &&
      ((__mem.lastListing as any).credentialId ?? null) === (where.credentialId ?? null)
    ) {
      return __mem.lastListing;
    }
    return null;
  });
  mockPrisma.listing.update.mockImplementation(async (args: any) => {
    if (__mem.lastListing && (__mem.lastListing as any).id === args?.where?.id) {
      __mem.lastListing = { ...(__mem.lastListing as any), ...args.data };
      return __mem.lastListing;
    }
    return { id: args?.where?.id, ...(args?.data || {}) };
  });
}

// モックをリセット
export function resetMocks() {
  // Keep implementations (especially $transaction); only clear calls/state
  Object.values(mockPrisma).forEach((model) => {
    Object.values(model).forEach((method) => {
      if (typeof method === 'function' && 'mockClear' in method) {
        (method as ReturnType<typeof vi.fn>).mockClear();
      }
    });
  });
}

beforeAll(() => {
  setupDefaultMocks();
});

afterEach(() => {
  // Do not reset implementations; just clear calls and reapply defaults
  vi.clearAllMocks();
  setupDefaultMocks();
});

afterAll(() => {
  // cleanup
});
