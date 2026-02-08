import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions
const { mockSendMail, mockCreateTransport } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
  mockCreateTransport: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
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

describe('Email Sender', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isEmailConfigured', () => {
    it('should return true when all SMTP vars are set', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
      const { isEmailConfigured } = await import('../../lib/email-sender');

      expect(isEmailConfigured()).toBe(true);
    });

    it('should return false when SMTP_HOST is missing', async () => {
      delete process.env.SMTP_HOST;
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
      const { isEmailConfigured } = await import('../../lib/email-sender');

      expect(isEmailConfigured()).toBe(false);
    });

    it('should return false when SMTP_USER is missing', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      delete process.env.SMTP_USER;
      process.env.SMTP_PASS = 'password';
      const { isEmailConfigured } = await import('../../lib/email-sender');

      expect(isEmailConfigured()).toBe(false);
    });

    it('should return false when SMTP_PASS is missing', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      delete process.env.SMTP_PASS;
      const { isEmailConfigured } = await import('../../lib/email-sender');

      expect(isEmailConfigured()).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('should return error when not configured', async () => {
      delete process.env.SMTP_HOST;
      const { sendEmail } = await import('../../lib/email-sender');

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not configured');
    });

    it('should send email successfully', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
      process.env.SMTP_PORT = '587';

      mockSendMail.mockResolvedValueOnce({
        messageId: 'msg-123',
      });

      const { sendEmail } = await import('../../lib/email-sender');

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          text: 'Test message',
          html: '<p>Test message</p>',
        })
      );
    });

    it('should handle array of recipients', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';

      mockSendMail.mockResolvedValueOnce({ messageId: 'msg-456' });

      const { sendEmail } = await import('../../lib/email-sender');

      const result = await sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com, user2@example.com',
        })
      );
    });

    it('should handle send errors', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';

      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const { sendEmail } = await import('../../lib/email-sender');

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });

    it('should use secure connection for port 465', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
      process.env.SMTP_PORT = '465';

      mockSendMail.mockResolvedValueOnce({ messageId: 'msg-789' });

      const { sendEmail } = await import('../../lib/email-sender');

      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test',
      });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      );
    });
  });

  describe('sendTemplatedEmail', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password';
      mockSendMail.mockResolvedValue({ messageId: 'template-msg' });
    });

    it('should send INVENTORY_OUT_OF_STOCK template', async () => {
      const { sendTemplatedEmail } = await import('../../lib/email-sender');

      const result = await sendTemplatedEmail('INVENTORY_OUT_OF_STOCK', {
        title: 'Test Product',
        source: 'Amazon',
        marketplace: 'eBay',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('在庫切れ'),
        })
      );
    });

    it('should send LISTING_FAILED template', async () => {
      const { sendTemplatedEmail } = await import('../../lib/email-sender');

      const result = await sendTemplatedEmail('LISTING_FAILED', {
        title: 'Test Product',
        error: 'Invalid category',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('出品失敗'),
        })
      );
    });

    it('should send ORDER_RECEIVED template', async () => {
      const { sendTemplatedEmail } = await import('../../lib/email-sender');

      const result = await sendTemplatedEmail('ORDER_RECEIVED', {
        orderId: 'ORDER-123',
        title: 'Test Product',
        amount: 9999,
      });

      expect(result.success).toBe(true);
      // ORDER_RECEIVED uses generic template
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('ORDER_RECEIVED'),
        })
      );
    });

    it('should send to custom recipients', async () => {
      const { sendTemplatedEmail } = await import('../../lib/email-sender');

      await sendTemplatedEmail(
        'INVENTORY_OUT_OF_STOCK',
        { title: 'Test' },
        ['custom1@example.com', 'custom2@example.com']
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'custom1@example.com, custom2@example.com',
        })
      );
    });

    it('should handle batch templates', async () => {
      const { sendTemplatedEmail } = await import('../../lib/email-sender');

      const result = await sendTemplatedEmail('INVENTORY_OUT_OF_STOCK_BATCH', {
        count: 5,
        items: [{ title: 'Product 1' }, { title: 'Product 2' }],
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('5件'),
        })
      );
    });

    it('should use default subject for unknown template', async () => {
      const { sendTemplatedEmail } = await import('../../lib/email-sender');

      const result = await sendTemplatedEmail('UNKNOWN_TEMPLATE', {
        key: 'value',
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });
  });
});
