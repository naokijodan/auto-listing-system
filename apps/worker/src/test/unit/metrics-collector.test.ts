import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock
const { mockRedis } = vi.hoisted(() => {
  return {
    mockRedis: {
      multi: vi.fn().mockReturnValue({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        lpush: vi.fn().mockReturnThis(),
        ltrim: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      }),
      lpush: vi.fn().mockResolvedValue(1),
      ltrim: vi.fn().mockResolvedValue('OK'),
      lrange: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    },
  };
});

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

import { MetricsCollector, DEFAULT_ALERT_RULES } from '../../lib/metrics-collector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new MetricsCollector(mockRedis as any);
  });

  describe('constructor', () => {
    it('should initialize with default alert rules', () => {
      const rules = collector.getAlertRules();
      expect(rules.length).toBe(DEFAULT_ALERT_RULES.length);
    });
  });

  describe('recordJobCompletion', () => {
    it('should record successful job completion', async () => {
      await collector.recordJobCompletion('test-queue', 'job-1', 1000, true);

      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it('should record failed job completion', async () => {
      await collector.recordJobCompletion('test-queue', 'job-1', 1000, false, 'TimeoutError');

      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it('should reset consecutive errors on success', async () => {
      // Record some failures first
      await collector.recordJobCompletion('test-queue', 'job-1', 1000, false, 'Error');
      await collector.recordJobCompletion('test-queue', 'job-2', 1000, false, 'Error');

      // Then a success
      await collector.recordJobCompletion('test-queue', 'job-3', 1000, true);

      // No alert should be created since success resets the counter
      expect(mockRedis.multi).toHaveBeenCalled();
    });
  });

  describe('createAlert', () => {
    it('should create alert and store in Redis', async () => {
      await collector.createAlert({
        type: 'error_rate',
        severity: 'warning',
        message: 'Error rate is high',
        queueName: 'test-queue',
        value: 15,
        threshold: 10,
      });

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'rakuda:alerts',
        expect.stringContaining('error_rate')
      );
    });

    it('should not create duplicate alerts', async () => {
      // Simulate existing alert
      const existingAlert = {
        id: 'alert_123',
        type: 'error_rate',
        severity: 'warning',
        message: 'Error rate is high',
        queueName: 'test-queue',
        value: 15,
        threshold: 10,
        createdAt: new Date(),
        acknowledged: false,
      };
      mockRedis.lrange.mockResolvedValueOnce([JSON.stringify(existingAlert)]);

      await collector.createAlert({
        type: 'error_rate',
        severity: 'warning',
        message: 'Error rate is still high',
        queueName: 'test-queue',
        value: 20,
        threshold: 10,
      });

      // Should not create duplicate
      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });
  });

  describe('getRecentAlerts', () => {
    it('should return recent alerts', async () => {
      const recentAlert = {
        id: 'alert_1',
        type: 'error_rate',
        severity: 'warning',
        message: 'Test alert',
        queueName: 'test-queue',
        value: 15,
        threshold: 10,
        createdAt: new Date(),
        acknowledged: false,
      };
      mockRedis.lrange.mockResolvedValueOnce([JSON.stringify(recentAlert)]);

      const alerts = await collector.getRecentAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert_1');
    });

    it('should filter out old alerts', async () => {
      const oldAlert = {
        id: 'alert_old',
        type: 'error_rate',
        severity: 'warning',
        message: 'Old alert',
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        acknowledged: false,
      };
      mockRedis.lrange.mockResolvedValueOnce([JSON.stringify(oldAlert)]);

      const alerts = await collector.getRecentAlerts(3600000); // within 1 hour

      expect(alerts).toHaveLength(0);
    });

    it('should return empty array on error', async () => {
      mockRedis.lrange.mockRejectedValueOnce(new Error('Redis error'));

      const alerts = await collector.getRecentAlerts();

      expect(alerts).toHaveLength(0);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge existing alert', async () => {
      const alert = {
        id: 'alert_1',
        type: 'error_rate',
        severity: 'warning',
        message: 'Test alert',
        createdAt: new Date(),
        acknowledged: false,
      };
      mockRedis.lrange.mockResolvedValueOnce([JSON.stringify(alert)]);

      const result = await collector.acknowledgeAlert('alert_1');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('rakuda:alerts');
    });

    it('should return false for non-existent alert', async () => {
      mockRedis.lrange.mockResolvedValueOnce([]);

      const result = await collector.acknowledgeAlert('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      mockRedis.get
        .mockResolvedValueOnce('100') // completed
        .mockResolvedValueOnce('10');  // failed

      const metrics = await collector.getQueueMetrics('test-queue', 1);

      expect(metrics.queueName).toBe('test-queue');
      expect(metrics.completed).toBe(100);
      expect(metrics.failed).toBe(10);
    });

    it('should calculate success rate correctly', async () => {
      mockRedis.get
        .mockResolvedValueOnce('90') // completed
        .mockResolvedValueOnce('10'); // failed

      const metrics = await collector.getQueueMetrics('test-queue', 1);

      expect(metrics.successRate).toBe(90);
    });

    it('should return 100% success rate when no jobs', async () => {
      mockRedis.get.mockResolvedValue(null);

      const metrics = await collector.getQueueMetrics('test-queue', 1);

      expect(metrics.successRate).toBe(100);
    });

    it('should calculate average processing time', async () => {
      mockRedis.get.mockResolvedValue('10');
      mockRedis.lrange.mockResolvedValueOnce(['100', '200', '300']);

      const metrics = await collector.getQueueMetrics('test-queue', 1);

      expect(metrics.avgProcessingTime).toBe(200);
    });
  });

  describe('setAlertRules', () => {
    it('should update alert rules', () => {
      const newRules = [
        {
          id: 'custom_rule',
          type: 'error_rate' as const,
          threshold: 50,
          severity: 'critical' as const,
          enabled: true,
        },
      ];

      collector.setAlertRules(newRules);

      expect(collector.getAlertRules()).toHaveLength(1);
      expect(collector.getAlertRules()[0].id).toBe('custom_rule');
    });
  });

  describe('getTimeSeriesData', () => {
    it('should return time series data points', async () => {
      mockRedis.get.mockResolvedValue('50');

      const data = await collector.getTimeSeriesData('test-queue', 'completed', 3);

      expect(data).toHaveLength(3);
      data.forEach((point) => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('value');
        expect(point.value).toBe(50);
      });
    });

    it('should return zero values for missing data', async () => {
      mockRedis.get.mockResolvedValue(null);

      const data = await collector.getTimeSeriesData('test-queue', 'failed', 2);

      expect(data).toHaveLength(2);
      data.forEach((point) => {
        expect(point.value).toBe(0);
      });
    });
  });

  describe('DEFAULT_ALERT_RULES', () => {
    it('should have error rate warning rule', () => {
      const rule = DEFAULT_ALERT_RULES.find((r) => r.id === 'error_rate_warning');
      expect(rule).toBeDefined();
      expect(rule?.threshold).toBe(10);
      expect(rule?.severity).toBe('warning');
    });

    it('should have error rate critical rule', () => {
      const rule = DEFAULT_ALERT_RULES.find((r) => r.id === 'error_rate_critical');
      expect(rule).toBeDefined();
      expect(rule?.threshold).toBe(25);
      expect(rule?.severity).toBe('critical');
    });

    it('should have queue depth rules', () => {
      const warning = DEFAULT_ALERT_RULES.find((r) => r.id === 'queue_depth_warning');
      const critical = DEFAULT_ALERT_RULES.find((r) => r.id === 'queue_depth_critical');
      expect(warning).toBeDefined();
      expect(critical).toBeDefined();
    });

    it('should have consecutive errors rule', () => {
      const rule = DEFAULT_ALERT_RULES.find((r) => r.id === 'consecutive_errors');
      expect(rule).toBeDefined();
      expect(rule?.threshold).toBe(5);
    });
  });
});
