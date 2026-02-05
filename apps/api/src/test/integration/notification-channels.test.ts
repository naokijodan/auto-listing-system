import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockPrisma } from '../setup';
import { notificationChannelsRouter } from '../../routes/notification-channels';
import { errorHandler } from '../../middleware/error-handler';

describe('Notification Channels API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/notification-channels', notificationChannelsRouter);
  app.use(errorHandler);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notification-channels', () => {
    it('should return all notification channels with masked credentials', async () => {
      const mockChannels = [
        {
          id: 'channel-1',
          channel: 'SLACK',
          name: 'Main Slack',
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXXXX',
          token: null,
          enabledTypes: ['ORDER_RECEIVED', 'ORDER_PAID'],
          minSeverity: 'INFO',
          isActive: true,
          lastUsedAt: new Date(),
          lastError: null,
          errorCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'channel-2',
          channel: 'LINE',
          name: 'LINE Notify',
          webhookUrl: null,
          token: 'secret-line-token',
          enabledTypes: ['SYSTEM_ERROR'],
          minSeverity: 'ERROR',
          isActive: true,
          lastUsedAt: null,
          lastError: null,
          errorCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.notificationChannel.findMany.mockResolvedValue(mockChannels);

      const response = await request(app).get('/api/notification-channels');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      // Credentials should be masked
      expect(response.body.data[0].webhookUrl).toContain('...');
      expect(response.body.data[1].token).toBe('***masked***');
    });
  });

  describe('GET /api/notification-channels/:id', () => {
    it('should return channel details', async () => {
      const mockChannel = {
        id: 'channel-1',
        channel: 'DISCORD',
        name: 'Discord Alerts',
        webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef',
        token: null,
        enabledTypes: ['ORDER_RECEIVED'],
        minSeverity: 'INFO',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationChannel.findUnique.mockResolvedValue(mockChannel);

      const response = await request(app).get('/api/notification-channels/channel-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('channel-1');
    });

    it('should return 404 for non-existent channel', async () => {
      mockPrisma.notificationChannel.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/notification-channels/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/notification-channels', () => {
    it('should create Slack channel', async () => {
      const newChannel = {
        id: 'new-channel',
        channel: 'SLACK',
        name: 'New Slack Channel',
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
        token: null,
        enabledTypes: ['ORDER_RECEIVED', 'JOB_FAILED'],
        minSeverity: 'INFO',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationChannel.create.mockResolvedValue(newChannel);

      const response = await request(app)
        .post('/api/notification-channels')
        .send({
          channel: 'SLACK',
          name: 'New Slack Channel',
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
          enabledTypes: ['ORDER_RECEIVED', 'JOB_FAILED'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.channel).toBe('SLACK');
    });

    it('should create LINE channel', async () => {
      const newChannel = {
        id: 'line-channel',
        channel: 'LINE',
        name: 'LINE Alerts',
        webhookUrl: null,
        token: 'line-token-xxx',
        enabledTypes: ['SYSTEM_ERROR'],
        minSeverity: 'ERROR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.notificationChannel.create.mockResolvedValue(newChannel);

      const response = await request(app)
        .post('/api/notification-channels')
        .send({
          channel: 'LINE',
          name: 'LINE Alerts',
          token: 'line-token-xxx',
          enabledTypes: ['SYSTEM_ERROR'],
          minSeverity: 'ERROR',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.channel).toBe('LINE');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/notification-channels')
        .send({ channel: 'SLACK' }); // missing name and webhookUrl

      expect(response.status).toBe(400);
    });

    it('should return 400 for Slack without webhookUrl', async () => {
      const response = await request(app)
        .post('/api/notification-channels')
        .send({
          channel: 'SLACK',
          name: 'Test',
          // missing webhookUrl
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for LINE without token', async () => {
      const response = await request(app)
        .post('/api/notification-channels')
        .send({
          channel: 'LINE',
          name: 'Test',
          // missing token
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/notification-channels/:id', () => {
    it('should update channel', async () => {
      const existingChannel = {
        id: 'channel-1',
        channel: 'SLACK',
        name: 'Old Name',
        isActive: true,
      };

      const updatedChannel = {
        ...existingChannel,
        name: 'New Name',
        isActive: false,
      };

      mockPrisma.notificationChannel.findUnique.mockResolvedValue(existingChannel);
      mockPrisma.notificationChannel.update.mockResolvedValue(updatedChannel);

      const response = await request(app)
        .patch('/api/notification-channels/channel-1')
        .send({
          name: 'New Name',
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 404 for non-existent channel', async () => {
      mockPrisma.notificationChannel.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/notification-channels/non-existent')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/notification-channels/:id', () => {
    it('should delete channel', async () => {
      const existingChannel = {
        id: 'channel-1',
        channel: 'SLACK',
        name: 'To Delete',
      };

      mockPrisma.notificationChannel.findUnique.mockResolvedValue(existingChannel);
      mockPrisma.notificationChannel.delete.mockResolvedValue(existingChannel);

      const response = await request(app).delete('/api/notification-channels/channel-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 for non-existent channel', async () => {
      mockPrisma.notificationChannel.findUnique.mockResolvedValue(null);

      const response = await request(app).delete('/api/notification-channels/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/notification-channels/:id/test', () => {
    it('should test Slack channel successfully', async () => {
      const channel = {
        id: 'channel-1',
        channel: 'SLACK',
        name: 'Test Slack',
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
        token: null,
      };

      mockPrisma.notificationChannel.findUnique.mockResolvedValue(channel);
      mockPrisma.notificationChannel.update.mockResolvedValue(channel);

      // Mock fetch for Slack
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const response = await request(app).post('/api/notification-channels/channel-1/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent channel', async () => {
      mockPrisma.notificationChannel.findUnique.mockResolvedValue(null);

      const response = await request(app).post('/api/notification-channels/non-existent/test');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/notification-channels/config/event-types', () => {
    it('should return available event types', async () => {
      const response = await request(app).get('/api/notification-channels/config/event-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('value');
      expect(response.body.data[0]).toHaveProperty('label');
      expect(response.body.data[0]).toHaveProperty('category');
    });
  });

  describe('GET /api/notification-channels/stats/summary', () => {
    it('should return notification channel statistics', async () => {
      const mockChannels = [
        { id: '1', channel: 'SLACK', isActive: true, errorCount: 0 },
        { id: '2', channel: 'SLACK', isActive: true, errorCount: 1 },
        { id: '3', channel: 'DISCORD', isActive: false, errorCount: 0 },
        { id: '4', channel: 'LINE', isActive: true, errorCount: 0 },
      ];

      mockPrisma.notificationChannel.findMany.mockResolvedValue(mockChannels);

      const response = await request(app).get('/api/notification-channels/stats/summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalChannels).toBe(4);
      expect(response.body.data.activeChannels).toBe(3);
      expect(response.body.data.byType.SLACK).toBe(2);
      expect(response.body.data.byType.DISCORD).toBe(1);
      expect(response.body.data.byType.LINE).toBe(1);
      expect(response.body.data.channelsWithErrors).toBe(1);
    });
  });
});
