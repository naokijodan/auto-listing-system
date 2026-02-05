import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app';
import { mockPrisma } from '../setup';

const app = createTestApp();

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return empty array when no notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const response = await request(app).get('/api/notifications');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toEqual({
        total: 0,
        limit: 50,
        offset: 0,
      });
      expect(response.body.unreadCount).toBe(0);
    });

    it('should return notifications with pagination', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'JOB_COMPLETED',
          title: 'Job Completed',
          message: 'Scrape job completed successfully',
          severity: 'INFO',
          isRead: false,
          createdAt: new Date(),
        },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const response = await request(app).get('/api/notifications');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.unreadCount).toBe(1);
    });

    it('should filter by unreadOnly', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await request(app).get('/api/notifications?unreadOnly=true');

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isRead: false },
        })
      );
    });

    it('should filter by type', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await request(app).get('/api/notifications?type=ERROR');

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'ERROR' },
        })
      );
    });

    it('should support pagination parameters', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(100);

      const response = await request(app).get('/api/notifications?limit=10&offset=20');

      expect(response.body.pagination).toEqual({
        total: 100,
        limit: 10,
        offset: 20,
      });
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const response = await request(app).get('/api/notifications/unread-count');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(5);
    });

    it('should return 0 when no unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);

      const response = await request(app).get('/api/notifications/unread-count');

      expect(response.body.data.count).toBe(0);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'notif-1',
        isRead: true,
        readAt: new Date(),
      };
      mockPrisma.notification.update.mockResolvedValue(mockNotification);

      const response = await request(app).patch('/api/notifications/notif-1/read');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const response = await request(app).patch('/api/notifications/read-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { isRead: false },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should handle case with no unread notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app).patch('/api/notifications/read-all');

      expect(response.status).toBe(200);
      expect(response.body.data.updatedCount).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      mockPrisma.notification.delete.mockResolvedValue({ id: 'notif-1' });

      const response = await request(app).delete('/api/notifications/notif-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification deleted');
    });
  });

  describe('POST /api/notifications', () => {
    it('should create notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'JOB_COMPLETED',
        title: 'Job Completed',
        message: 'Scrape job completed successfully',
        severity: 'INFO',
      };
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const response = await request(app)
        .post('/api/notifications')
        .send({
          type: 'JOB_COMPLETED',
          title: 'Job Completed',
          message: 'Scrape job completed successfully',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('notif-1');
    });

    it('should create notification with optional fields', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        severity: 'ERROR',
        productId: 'product-1',
        metadata: { foo: 'bar' },
      });

      const response = await request(app)
        .post('/api/notifications')
        .send({
          type: 'ERROR',
          title: 'Error',
          message: 'Something went wrong',
          severity: 'ERROR',
          productId: 'product-1',
          metadata: { foo: 'bar' },
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .send({
          type: 'JOB_COMPLETED',
          // Missing title and message
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when type is missing', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .send({
          title: 'Test',
          message: 'Test message',
        });

      expect(response.status).toBe(400);
    });
  });
});
