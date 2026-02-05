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
  },
  listing: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  source: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  jobLog: {
    findMany: vi.fn(),
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
};

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

// デフォルト値を設定
export function setupDefaultMocks() {
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockPrisma.product.count.mockResolvedValue(0);
  mockPrisma.listing.findMany.mockResolvedValue([]);
  mockPrisma.listing.count.mockResolvedValue(0);
}

// モックをリセット
export function resetMocks() {
  Object.values(mockPrisma).forEach((model) => {
    Object.values(model).forEach((method) => {
      if (typeof method === 'function' && 'mockReset' in method) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    });
  });
}

beforeAll(() => {
  setupDefaultMocks();
});

afterEach(() => {
  resetMocks();
  setupDefaultMocks();
});

afterAll(() => {
  // cleanup
});
