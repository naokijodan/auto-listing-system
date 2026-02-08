import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions
const {
  mockSendTemplatedEmail,
  mockIsEmailConfigured,
  mockSendTemplatedSlackMessage,
  mockIsSlackConfigured,
  mockUpdateAlertLogStatus,
  mockProcessBatch,
} = vi.hoisted(() => ({
  mockSendTemplatedEmail: vi.fn(),
  mockIsEmailConfigured: vi.fn(),
  mockSendTemplatedSlackMessage: vi.fn(),
  mockIsSlackConfigured: vi.fn(),
  mockUpdateAlertLogStatus: vi.fn(),
  mockProcessBatch: vi.fn(),
}));

vi.mock('../../lib/email-sender', () => ({
  sendTemplatedEmail: mockSendTemplatedEmail,
  isEmailConfigured: mockIsEmailConfigured,
}));

vi.mock('../../lib/slack-sender', () => ({
  sendTemplatedSlackMessage: mockSendTemplatedSlackMessage,
  isSlackConfigured: mockIsSlackConfigured,
}));

vi.mock('../../lib/alert-manager', () => ({
  alertManager: {
    updateAlertLogStatus: mockUpdateAlertLogStatus,
    processBatch: mockProcessBatch,
  },
}));

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Import after mocks
import { processNotificationJob } from '../../processors/notification';

describe('Notification Processor', () => {
  const createMockJob = (name: string, data: any) => ({
    id: 'test-job-id',
    name,
    data,
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processNotificationJob', () => {
    it('should throw error for unknown job type', async () => {
      const job = createMockJob('unknown-type', {});

      await expect(processNotificationJob(job)).rejects.toThrow(
        'Unknown notification job type: unknown-type'
      );
    });
  });

  describe('send-notification job', () => {
    describe('email channel', () => {
      it('should send email when configured', async () => {
        mockIsEmailConfigured.mockReturnValue(true);
        mockSendTemplatedEmail.mockResolvedValue({ success: true });

        const job = createMockJob('send-notification', {
          channel: 'email',
          template: 'order-received',
          data: { orderId: 'order-123' },
        });

        const result = await processNotificationJob(job);

        expect(result.success).toBe(true);
        expect(result.channel).toBe('email');
        expect(mockSendTemplatedEmail).toHaveBeenCalledWith('order-received', {
          orderId: 'order-123',
        });
      });

      it('should return error when email not configured', async () => {
        mockIsEmailConfigured.mockReturnValue(false);

        const job = createMockJob('send-notification', {
          channel: 'email',
          template: 'order-received',
          data: {},
        });

        const result = await processNotificationJob(job);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email not configured');
        expect(mockSendTemplatedEmail).not.toHaveBeenCalled();
      });

      it('should include deepLink in email data', async () => {
        mockIsEmailConfigured.mockReturnValue(true);
        mockSendTemplatedEmail.mockResolvedValue({ success: true });

        const job = createMockJob('send-notification', {
          channel: 'email',
          template: 'order-received',
          data: { orderId: 'order-123' },
          deepLink: 'https://app.example.com/orders/123',
        });

        await processNotificationJob(job);

        expect(mockSendTemplatedEmail).toHaveBeenCalledWith('order-received', {
          orderId: 'order-123',
          deepLink: 'https://app.example.com/orders/123',
        });
      });
    });

    describe('slack channel', () => {
      it('should send slack message when configured', async () => {
        mockIsSlackConfigured.mockReturnValue(true);
        mockSendTemplatedSlackMessage.mockResolvedValue({ success: true });

        const job = createMockJob('send-notification', {
          channel: 'slack',
          template: 'alert-triggered',
          data: { alertName: 'High Error Rate' },
        });

        const result = await processNotificationJob(job);

        expect(result.success).toBe(true);
        expect(result.channel).toBe('slack');
        expect(mockSendTemplatedSlackMessage).toHaveBeenCalledWith(
          'alert-triggered',
          { alertName: 'High Error Rate' },
          undefined
        );
      });

      it('should return error when slack not configured', async () => {
        mockIsSlackConfigured.mockReturnValue(false);

        const job = createMockJob('send-notification', {
          channel: 'slack',
          template: 'alert-triggered',
          data: {},
        });

        const result = await processNotificationJob(job);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Slack not configured');
        expect(mockSendTemplatedSlackMessage).not.toHaveBeenCalled();
      });
    });

    describe('unknown channel', () => {
      it('should return error for unknown channel', async () => {
        const job = createMockJob('send-notification', {
          channel: 'unknown-channel',
          template: 'test',
          data: {},
        });

        const result = await processNotificationJob(job);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown channel: unknown-channel');
      });
    });

    describe('alert log update', () => {
      it('should update alert log status on success', async () => {
        mockIsEmailConfigured.mockReturnValue(true);
        mockSendTemplatedEmail.mockResolvedValue({ success: true });
        mockUpdateAlertLogStatus.mockResolvedValue(undefined);

        const job = createMockJob('send-notification', {
          channel: 'email',
          template: 'order-received',
          data: {},
          alertLogId: 'alert-log-123',
        });

        await processNotificationJob(job);

        expect(mockUpdateAlertLogStatus).toHaveBeenCalledWith(
          'alert-log-123',
          'sent',
          undefined
        );
      });

      it('should update alert log status on failure', async () => {
        mockIsEmailConfigured.mockReturnValue(false);
        mockUpdateAlertLogStatus.mockResolvedValue(undefined);

        const job = createMockJob('send-notification', {
          channel: 'email',
          template: 'order-received',
          data: {},
          alertLogId: 'alert-log-456',
        });

        await processNotificationJob(job);

        expect(mockUpdateAlertLogStatus).toHaveBeenCalledWith(
          'alert-log-456',
          'failed',
          'Email not configured'
        );
      });

      it('should not update alert log when alertLogId not provided', async () => {
        mockIsEmailConfigured.mockReturnValue(true);
        mockSendTemplatedEmail.mockResolvedValue({ success: true });

        const job = createMockJob('send-notification', {
          channel: 'email',
          template: 'order-received',
          data: {},
        });

        await processNotificationJob(job);

        expect(mockUpdateAlertLogStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('process-batch job', () => {
    it('should process batch job', async () => {
      mockProcessBatch.mockResolvedValue(undefined);

      const job = createMockJob('process-batch', {
        ruleId: 'rule-123',
        eventType: 'order.created',
        batchKey: 'batch-key-456',
      });

      const result = await processNotificationJob(job);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(mockProcessBatch).toHaveBeenCalledWith(
        'rule-123',
        'order.created',
        'batch-key-456'
      );
    });
  });
});
