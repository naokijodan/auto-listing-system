import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockTrackerCreate,
  mockTrackerUpdate,
  mockTrackerFindUnique,
  mockTrackerFindMany,
  mockTrackerCount,
  mockPriceLogCreate,
  mockPriceLogCount,
  mockPriceLogFindMany,
  mockAlertCreate,
  mockAlertUpdate,
  mockAlertFindMany,
  mockAlertCount,
  mockListingFindUnique,
  mockPublishPriceChange,
} = vi.hoisted(() => {
  return {
    mockTrackerCreate: vi.fn(),
    mockTrackerUpdate: vi.fn(),
    mockTrackerFindUnique: vi.fn(),
    mockTrackerFindMany: vi.fn(),
    mockTrackerCount: vi.fn(),
    mockPriceLogCreate: vi.fn(),
    mockPriceLogCount: vi.fn(),
    mockPriceLogFindMany: vi.fn(),
    mockAlertCreate: vi.fn(),
    mockAlertUpdate: vi.fn(),
    mockAlertFindMany: vi.fn(),
    mockAlertCount: vi.fn(),
    mockListingFindUnique: vi.fn(),
    mockPublishPriceChange: vi.fn(),
  };
});

vi.mock('@rakuda/database', () => ({
  prisma: {
    competitorTracker: {
      create: mockTrackerCreate,
      update: mockTrackerUpdate,
      findUnique: mockTrackerFindUnique,
      findMany: mockTrackerFindMany,
      count: mockTrackerCount,
    },
    competitorPriceLog: {
      create: mockPriceLogCreate,
      count: mockPriceLogCount,
      findMany: mockPriceLogFindMany,
    },
    competitorAlert: {
      create: mockAlertCreate,
      update: mockAlertUpdate,
      findMany: mockAlertFindMany,
      count: mockAlertCount,
    },
    listing: {
      findUnique: mockListingFindUnique,
    },
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('../../lib/event-bus', () => ({
  eventBus: {
    initialized: true,
    publishPriceChange: mockPublishPriceChange,
  },
}));

import { competitorMonitor, TrackerCreateInput } from '../../lib/competitor/competitor-monitor';

describe('CompetitorMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackerCreate.mockResolvedValue({ id: 'tracker-1' });
    mockTrackerUpdate.mockResolvedValue({});
    mockPriceLogCreate.mockResolvedValue({});
    mockAlertCreate.mockResolvedValue({ id: 'alert-1' });
    mockAlertUpdate.mockResolvedValue({});
    mockPublishPriceChange.mockResolvedValue(undefined);
  });

  describe('createTracker', () => {
    it('should create a new tracker with required fields', async () => {
      const input: TrackerCreateInput = {
        competitorIdentifier: 'B08XYZ123',
        marketplace: 'amazon',
        url: 'https://amazon.co.jp/dp/B08XYZ123',
      };

      const trackerId = await competitorMonitor.createTracker(input);

      expect(trackerId).toBe('tracker-1');
      expect(mockTrackerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          competitorIdentifier: 'B08XYZ123',
          marketplace: 'amazon',
          url: 'https://amazon.co.jp/dp/B08XYZ123',
          matchMethod: 'manual',
          matchConfidence: 1.0,
          checkInterval: 360,
          alertOnPriceDrop: true,
          alertOnPriceRise: false,
          alertThresholdPercent: 5.0,
          autoAdjustPrice: false,
        }),
      });
    });

    it('should create tracker with optional fields', async () => {
      const input: TrackerCreateInput = {
        listingId: 'listing-1',
        productId: 'product-1',
        competitorIdentifier: 'B08XYZ123',
        marketplace: 'amazon',
        url: 'https://amazon.co.jp/dp/B08XYZ123',
        title: 'Test Product',
        matchMethod: 'asin',
        matchConfidence: 0.95,
        checkInterval: 120,
        alertOnPriceDrop: true,
        alertOnPriceRise: true,
        alertThresholdPercent: 10,
        autoAdjustPrice: true,
      };

      await competitorMonitor.createTracker(input);

      expect(mockTrackerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          listingId: 'listing-1',
          productId: 'product-1',
          title: 'Test Product',
          matchMethod: 'asin',
          matchConfidence: 0.95,
          checkInterval: 120,
          alertOnPriceDrop: true,
          alertOnPriceRise: true,
          alertThresholdPercent: 10,
          autoAdjustPrice: true,
        }),
      });
    });
  });

  describe('updateTracker', () => {
    it('should update tracker with partial data', async () => {
      await competitorMonitor.updateTracker('tracker-1', {
        alertThresholdPercent: 15,
        autoAdjustPrice: true,
      });

      expect(mockTrackerUpdate).toHaveBeenCalledWith({
        where: { id: 'tracker-1' },
        data: expect.objectContaining({
          alertThresholdPercent: 15,
          autoAdjustPrice: true,
        }),
      });
    });

    it('should set verifiedAt when isVerified is true', async () => {
      await competitorMonitor.updateTracker('tracker-1', {
        isVerified: true,
      });

      expect(mockTrackerUpdate).toHaveBeenCalledWith({
        where: { id: 'tracker-1' },
        data: expect.objectContaining({
          isVerified: true,
          verifiedAt: expect.any(Date),
        }),
      });
    });

    it('should not set verifiedAt when isVerified is false', async () => {
      await competitorMonitor.updateTracker('tracker-1', {
        isActive: false,
      });

      expect(mockTrackerUpdate).toHaveBeenCalledWith({
        where: { id: 'tracker-1' },
        data: expect.objectContaining({
          isActive: false,
          verifiedAt: undefined,
        }),
      });
    });
  });

  describe('getTrackersToCheck', () => {
    it('should return trackers that need checking', async () => {
      mockTrackerFindMany.mockResolvedValue([
        {
          id: 'tracker-1',
          listingId: 'listing-1',
          productId: null,
          competitorIdentifier: 'B08XYZ123',
          marketplace: 'amazon',
          url: 'https://amazon.co.jp/dp/B08XYZ123',
          lastPrice: 1000,
          alertOnPriceDrop: true,
          alertOnPriceRise: false,
          alertThresholdPercent: 5,
          autoAdjustPrice: false,
        },
      ]);

      const trackers = await competitorMonitor.getTrackersToCheck(10);

      expect(trackers).toHaveLength(1);
      expect(trackers[0].id).toBe('tracker-1');
      expect(mockTrackerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            consecutiveErrors: { lt: 5 },
          }),
          take: 10,
        })
      );
    });

    it('should use default limit of 50', async () => {
      mockTrackerFindMany.mockResolvedValue([]);

      await competitorMonitor.getTrackersToCheck();

      expect(mockTrackerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });

  describe('recordPriceCheck', () => {
    const mockTracker = {
      id: 'tracker-1',
      listingId: 'listing-1',
      productId: null,
      competitorIdentifier: 'B08XYZ123',
      marketplace: 'amazon',
      url: 'https://amazon.co.jp/dp/B08XYZ123',
      title: 'Test Product',
      lastPrice: 1000,
      matchConfidence: 0.95,
      isVerified: true,
      alertOnPriceDrop: true,
      alertOnPriceRise: false,
      alertThresholdPercent: 5,
      autoAdjustPrice: false,
    };

    it('should record price check and create price log', async () => {
      mockTrackerFindUnique.mockResolvedValue(mockTracker);

      const result = await competitorMonitor.recordPriceCheck('tracker-1', 990);

      expect(result.success).toBe(true);
      expect(result.price).toBe(990);
      expect(result.previousPrice).toBe(1000);
      expect(result.priceChange).toBe(-10);
      expect(result.priceChangePercent).toBe(-1);
      expect(mockPriceLogCreate).toHaveBeenCalled();
      expect(mockTrackerUpdate).toHaveBeenCalledWith({
        where: { id: 'tracker-1' },
        data: expect.objectContaining({
          lastPrice: 990,
          lastError: null,
          consecutiveErrors: 0,
        }),
      });
    });

    it('should throw error when tracker not found', async () => {
      mockTrackerFindUnique.mockResolvedValue(null);

      await expect(
        competitorMonitor.recordPriceCheck('nonexistent', 1000)
      ).rejects.toThrow('Tracker not found: nonexistent');
    });

    it('should trigger price_drop alert when price drops beyond threshold', async () => {
      mockTrackerFindUnique.mockResolvedValue(mockTracker);
      mockListingFindUnique.mockResolvedValue({ listingPrice: 1100 });

      const result = await competitorMonitor.recordPriceCheck('tracker-1', 900);

      expect(result.alertTriggered).toBe(true);
      expect(result.alertType).toBe('price_drop');
      expect(mockAlertCreate).toHaveBeenCalled();
    });

    it('should trigger price_rise alert when price rises beyond threshold', async () => {
      const trackerWithRiseAlert = {
        ...mockTracker,
        alertOnPriceRise: true,
        alertOnPriceDrop: false,
      };
      mockTrackerFindUnique.mockResolvedValue(trackerWithRiseAlert);

      const result = await competitorMonitor.recordPriceCheck('tracker-1', 1100);

      expect(result.alertTriggered).toBe(true);
      expect(result.alertType).toBe('price_rise');
      expect(mockAlertCreate).toHaveBeenCalled();
    });

    it('should not trigger alert when price change is below threshold', async () => {
      mockTrackerFindUnique.mockResolvedValue(mockTracker);

      const result = await competitorMonitor.recordPriceCheck('tracker-1', 980);

      expect(result.alertTriggered).toBe(false);
      expect(result.alertType).toBeUndefined();
      expect(mockAlertCreate).not.toHaveBeenCalled();
    });

    it('should handle first price check (no previous price)', async () => {
      const trackerNoPreviousPrice = { ...mockTracker, lastPrice: null };
      mockTrackerFindUnique.mockResolvedValue(trackerNoPreviousPrice);

      const result = await competitorMonitor.recordPriceCheck('tracker-1', 1000);

      expect(result.success).toBe(true);
      expect(result.previousPrice).toBeUndefined();
      expect(result.priceChange).toBeUndefined();
      expect(result.alertTriggered).toBe(false);
    });

    it('should record metadata when provided', async () => {
      mockTrackerFindUnique.mockResolvedValue(mockTracker);

      await competitorMonitor.recordPriceCheck('tracker-1', 990, {
        title: 'Updated Title',
        conditionRank: 'A',
        sellerRating: 4.5,
        stockStatus: 'in_stock',
        shippingCost: 500,
      });

      expect(mockPriceLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Updated Title',
          conditionRank: 'A',
          sellerRating: 4.5,
          stockStatus: 'in_stock',
          shippingCost: 500,
        }),
      });
    });

    it('should publish price change event when alert triggered', async () => {
      mockTrackerFindUnique.mockResolvedValue(mockTracker);
      mockListingFindUnique.mockResolvedValue({ listingPrice: 1100 });

      await competitorMonitor.recordPriceCheck('tracker-1', 900);

      expect(mockPublishPriceChange).toHaveBeenCalledWith('listing-1', {
        type: 'competitor_alert',
        alertId: 'alert-1',
        alertType: 'price_drop',
        competitorPrice: 900,
        priceDiffPercent: -10,
      });
    });
  });

  describe('recordError', () => {
    it('should increment consecutive errors', async () => {
      await competitorMonitor.recordError('tracker-1', 'Network timeout');

      expect(mockTrackerUpdate).toHaveBeenCalledWith({
        where: { id: 'tracker-1' },
        data: {
          lastCheckedAt: expect.any(Date),
          lastError: 'Network timeout',
          consecutiveErrors: { increment: 1 },
        },
      });
    });
  });

  describe('getPendingAlerts', () => {
    it('should return pending alerts', async () => {
      mockAlertFindMany.mockResolvedValue([
        {
          id: 'alert-1',
          trackerId: 'tracker-1',
          listingId: 'listing-1',
          alertType: 'price_drop',
          severity: 'high',
          title: 'Price Drop',
          message: 'Competitor lowered price',
          ourPrice: 1000,
          competitorPrice: 850,
          priceDiffPercent: -15,
          createdAt: new Date(),
        },
      ]);

      const alerts = await competitorMonitor.getPendingAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('price_drop');
      expect(mockAlertFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'pending' },
        })
      );
    });

    it('should filter by listingId', async () => {
      mockAlertFindMany.mockResolvedValue([]);

      await competitorMonitor.getPendingAlerts({ listingId: 'listing-1' });

      expect(mockAlertFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingId: 'listing-1',
          }),
        })
      );
    });

    it('should filter by productId', async () => {
      mockAlertFindMany.mockResolvedValue([]);

      await competitorMonitor.getPendingAlerts({ productId: 'product-1' });

      expect(mockAlertFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-1',
          }),
        })
      );
    });

    it('should respect limit option', async () => {
      mockAlertFindMany.mockResolvedValue([]);

      await competitorMonitor.getPendingAlerts({ limit: 10 });

      expect(mockAlertFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('should update alert status to acknowledged', async () => {
      await competitorMonitor.acknowledgeAlert('alert-1', 'user@example.com');

      expect(mockAlertUpdate).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          status: 'acknowledged',
          acknowledgedBy: 'user@example.com',
          acknowledgedAt: expect.any(Date),
        },
      });
    });

    it('should acknowledge without acknowledgedBy', async () => {
      await competitorMonitor.acknowledgeAlert('alert-1');

      expect(mockAlertUpdate).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          status: 'acknowledged',
          acknowledgedBy: undefined,
        }),
      });
    });
  });

  describe('resolveAlert', () => {
    it('should update alert status to resolved', async () => {
      await competitorMonitor.resolveAlert('alert-1');

      expect(mockAlertUpdate).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          status: 'resolved',
          resolvedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      mockTrackerCount
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(80)   // active
        .mockResolvedValueOnce(50);  // verified
      mockAlertCount
        .mockResolvedValueOnce(25)   // total alerts
        .mockResolvedValueOnce(10);  // pending
      mockPriceLogCount.mockResolvedValue(150);
      mockPriceLogFindMany.mockResolvedValue([
        { priceChangePercent: -5 },
        { priceChangePercent: 3 },
        { priceChangePercent: -2 },
      ]);

      const stats = await competitorMonitor.getStats(7);

      expect(stats.totalTrackers).toBe(100);
      expect(stats.activeTrackers).toBe(80);
      expect(stats.verifiedTrackers).toBe(50);
      expect(stats.totalAlerts).toBe(25);
      expect(stats.pendingAlerts).toBe(10);
      expect(stats.priceChecksToday).toBe(150);
      expect(stats.avgPriceChange).toBeCloseTo(-1.33, 1);
    });

    it('should handle empty price logs', async () => {
      mockTrackerCount.mockResolvedValue(0);
      mockAlertCount.mockResolvedValue(0);
      mockPriceLogCount.mockResolvedValue(0);
      mockPriceLogFindMany.mockResolvedValue([]);

      const stats = await competitorMonitor.getStats();

      expect(stats.avgPriceChange).toBe(0);
    });

    it('should use default days of 7', async () => {
      mockTrackerCount.mockResolvedValue(0);
      mockAlertCount.mockResolvedValue(0);
      mockPriceLogCount.mockResolvedValue(0);
      mockPriceLogFindMany.mockResolvedValue([]);

      await competitorMonitor.getStats();

      // Just verify it doesn't throw
      expect(mockTrackerCount).toHaveBeenCalled();
    });
  });

  describe('severity calculation', () => {
    const mockTracker = {
      id: 'tracker-1',
      listingId: 'listing-1',
      productId: null,
      competitorIdentifier: 'B08XYZ123',
      marketplace: 'amazon',
      url: 'https://amazon.co.jp/dp/B08XYZ123',
      title: 'Test Product',
      lastPrice: 1000,
      matchConfidence: 0.95,
      isVerified: true,
      alertOnPriceDrop: true,
      alertOnPriceRise: false,
      alertThresholdPercent: 5,
      autoAdjustPrice: false,
    };

    it('should set critical severity when competitor is much cheaper', async () => {
      mockTrackerFindUnique.mockResolvedValue(mockTracker);
      mockListingFindUnique.mockResolvedValue({ listingPrice: 1200 });

      await competitorMonitor.recordPriceCheck('tracker-1', 900); // 25% cheaper

      expect(mockAlertCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'critical',
        }),
      });
    });

    it('should set high severity when competitor is moderately cheaper', async () => {
      mockTrackerFindUnique.mockResolvedValue(mockTracker);
      mockListingFindUnique.mockResolvedValue({ listingPrice: 1000 });

      await competitorMonitor.recordPriceCheck('tracker-1', 920); // 8% drop, 8% cheaper

      expect(mockAlertCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'high',
        }),
      });
    });

    it('should set medium severity for small difference', async () => {
      mockTrackerFindUnique.mockResolvedValue({
        ...mockTracker,
        alertThresholdPercent: 3,
      });
      mockListingFindUnique.mockResolvedValue({ listingPrice: 1000 });

      await competitorMonitor.recordPriceCheck('tracker-1', 970); // 3% drop

      expect(mockAlertCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'medium',
        }),
      });
    });

    it('should set critical severity for large price changes (20%+)', async () => {
      mockTrackerFindUnique.mockResolvedValue({
        ...mockTracker,
        alertOnPriceRise: true,
      });
      mockListingFindUnique.mockResolvedValue({ listingPrice: 800 }); // our price is lower

      await competitorMonitor.recordPriceCheck('tracker-1', 1250); // 25% rise

      expect(mockAlertCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'critical',
        }),
      });
    });

    it('should set high severity for moderate price changes (10-20%)', async () => {
      mockTrackerFindUnique.mockResolvedValue({
        ...mockTracker,
        alertOnPriceRise: true,
      });
      mockListingFindUnique.mockResolvedValue({ listingPrice: 800 });

      await competitorMonitor.recordPriceCheck('tracker-1', 1150); // 15% rise

      expect(mockAlertCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'high',
        }),
      });
    });

    it('should set low severity for small price changes (below 5%)', async () => {
      mockTrackerFindUnique.mockResolvedValue({
        ...mockTracker,
        alertOnPriceRise: true,
        alertThresholdPercent: 3,
      });
      mockListingFindUnique.mockResolvedValue({ listingPrice: 800 });

      await competitorMonitor.recordPriceCheck('tracker-1', 1040); // 4% rise

      expect(mockAlertCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: 'low',
        }),
      });
    });
  });

  describe('edge cases', () => {
    it('should not publish event when listingId is null', async () => {
      const trackerNoListing = {
        id: 'tracker-1',
        listingId: null,
        productId: 'product-1',
        competitorIdentifier: 'B08XYZ123',
        marketplace: 'amazon',
        url: 'https://amazon.co.jp/dp/B08XYZ123',
        title: 'Test Product',
        lastPrice: 1000,
        matchConfidence: 0.95,
        isVerified: true,
        alertOnPriceDrop: true,
        alertOnPriceRise: false,
        alertThresholdPercent: 5,
        autoAdjustPrice: false,
      };
      mockTrackerFindUnique.mockResolvedValue(trackerNoListing);

      await competitorMonitor.recordPriceCheck('tracker-1', 900);

      expect(mockPublishPriceChange).not.toHaveBeenCalled();
    });

    it('should handle zero previous price', async () => {
      const trackerZeroPrice = {
        id: 'tracker-1',
        listingId: 'listing-1',
        productId: null,
        competitorIdentifier: 'B08XYZ123',
        marketplace: 'amazon',
        url: 'https://amazon.co.jp/dp/B08XYZ123',
        title: 'Test Product',
        lastPrice: 0,
        matchConfidence: 0.95,
        isVerified: true,
        alertOnPriceDrop: true,
        alertOnPriceRise: false,
        alertThresholdPercent: 5,
        autoAdjustPrice: false,
      };
      mockTrackerFindUnique.mockResolvedValue(trackerZeroPrice);

      const result = await competitorMonitor.recordPriceCheck('tracker-1', 1000);

      // priceChangePercent should be null when previous price is 0
      expect(result.alertTriggered).toBe(false);
    });

    it('should use tracker title when metadata title is not provided', async () => {
      const tracker = {
        id: 'tracker-1',
        listingId: null,
        productId: null,
        competitorIdentifier: 'B08XYZ123',
        marketplace: 'amazon',
        url: 'https://amazon.co.jp/dp/B08XYZ123',
        title: 'Original Title',
        lastPrice: null,
        matchConfidence: 1.0,
        isVerified: false,
        alertOnPriceDrop: true,
        alertOnPriceRise: false,
        alertThresholdPercent: 5,
        autoAdjustPrice: false,
      };
      mockTrackerFindUnique.mockResolvedValue(tracker);

      await competitorMonitor.recordPriceCheck('tracker-1', 1000);

      expect(mockPriceLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Original Title',
        }),
      });
    });
  });
});
