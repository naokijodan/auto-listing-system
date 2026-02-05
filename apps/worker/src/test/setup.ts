import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Mock Prisma Client (must be defined before vi.mock)
export const mockPrisma = {
  exchangeRate: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  priceSetting: {
    findFirst: vi.fn(),
  },
  shippingPolicy: {
    findFirst: vi.fn(),
  },
  marketplaceCredential: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  ebayCategoryMapping: {
    findUnique: vi.fn(),
  },
  product: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  listing: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  jobLog: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
};

// デフォルト値を設定するヘルパー
export function setupDefaultMocks() {
  // 為替レート
  mockPrisma.exchangeRate.findFirst.mockResolvedValue({
    id: '1',
    fromCurrency: 'JPY',
    toCurrency: 'USD',
    rate: 0.0067, // 1 JPY = 0.0067 USD (150 JPY/USD)
    source: 'test',
    fetchedAt: new Date(),
  });

  // 価格設定
  mockPrisma.priceSetting.findFirst.mockResolvedValue({
    id: '1',
    marketplace: 'EBAY',
    isDefault: true,
    platformFeeRate: 0.13,
    paymentFeeRate: 0.03,
    targetProfitRate: 0.30,
    adRate: 0,
    categorySettings: {},
  });

  // 送料ポリシー
  mockPrisma.shippingPolicy.findFirst.mockResolvedValue({
    id: '1',
    region: 'US',
    isActive: true,
    shippingTable: {
      '100': 1200,
      '200': 1500,
      '500': 2000,
      '1000': 2500,
    },
  });

  // マーケットプレイス認証情報
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

  // Listing
  mockPrisma.listing.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.listing.update.mockResolvedValue({ id: '1' });
  mockPrisma.listing.findUnique.mockResolvedValue(null);
  mockPrisma.listing.create.mockResolvedValue({ id: '1' });

  // Notification
  mockPrisma.notification.create.mockResolvedValue({ id: '1' });

  // JobLog
  mockPrisma.jobLog.create.mockResolvedValue({ id: '1' });
  mockPrisma.jobLog.findMany.mockResolvedValue([]);
  mockPrisma.jobLog.count.mockResolvedValue(0);
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

// Prisma モジュールをモック
vi.mock('@rakuda/database', () => ({
  prisma: mockPrisma,
}));

// Logger モジュールをモック（静かに）
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

// MSW サーバーのセットアップ
export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  setupDefaultMocks();
});

afterEach(() => {
  server.resetHandlers();
  resetMocks();
  setupDefaultMocks();
});

afterAll(() => {
  server.close();
});
