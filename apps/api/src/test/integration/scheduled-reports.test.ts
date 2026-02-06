/**
 * スケジュールレポートAPI統合テスト
 *
 * Phase 36: 統合テスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { scheduledReportsRouter } from '../../routes/scheduled-reports';

// Prisma mock
vi.mock('@rakuda/database', () => ({
  prisma: {
    scheduledReport: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    scheduledReportLog: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// IORedis mock
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      disconnect: vi.fn(),
    })),
  };
});

// BullMQ mock
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'test-job-id' }),
    close: vi.fn(),
  })),
}));

// Logger mock
vi.mock('@rakuda/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { prisma } from '@rakuda/database';

const app = express();
app.use(express.json());
app.use('/api/scheduled-reports', scheduledReportsRouter);

describe('Scheduled Reports API', () => {
  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/scheduled-reports', () => {
    it('should return empty list when no reports exist', async () => {
      (prisma.scheduledReport.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/scheduled-reports')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return list of reports with cron descriptions', async () => {
      const mockReports = [
        {
          id: 'report-1',
          name: 'Daily Summary',
          reportType: 'daily',
          cronExpression: '0 9 * * *',
          timezone: 'Asia/Tokyo',
          isActive: true,
          format: 'markdown',
          createdAt: new Date(),
        },
      ];

      (prisma.scheduledReport.findMany as any).mockResolvedValue(mockReports);

      const res = await request(app)
        .get('/api/scheduled-reports')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].cronDescription).toBe('毎日 9:00');
    });

    it('should filter by isActive', async () => {
      (prisma.scheduledReport.findMany as any).mockResolvedValue([]);

      await request(app)
        .get('/api/scheduled-reports?isActive=true')
        .expect(200);

      expect(prisma.scheduledReport.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by reportType', async () => {
      (prisma.scheduledReport.findMany as any).mockResolvedValue([]);

      await request(app)
        .get('/api/scheduled-reports?reportType=weekly')
        .expect(200);

      expect(prisma.scheduledReport.findMany).toHaveBeenCalledWith({
        where: { reportType: 'weekly' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('POST /api/scheduled-reports', () => {
    it('should create a new scheduled report', async () => {
      const newReport = {
        name: 'Test Report',
        reportType: 'daily',
        cronExpression: '0 9 * * *',
        timezone: 'Asia/Tokyo',
        format: 'markdown',
        emailRecipients: ['test@example.com'],
        deliveryChannels: ['email'],
      };

      const mockCreated = {
        id: 'report-new',
        ...newReport,
        isActive: true,
        nextRunAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.scheduledReport.create as any).mockResolvedValue(mockCreated);

      const res = await request(app)
        .post('/api/scheduled-reports')
        .send(newReport)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('report-new');
      expect(res.body.data.cronDescription).toBe('毎日 9:00');
    });

    it('should reject invalid cron expression', async () => {
      const invalidReport = {
        name: 'Invalid Report',
        reportType: 'daily',
        cronExpression: 'not-a-valid-cron',
      };

      const res = await request(app)
        .post('/api/scheduled-reports')
        .send(invalidReport)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation error');
    });

    it('should reject invalid email format', async () => {
      const invalidReport = {
        name: 'Test Report',
        reportType: 'daily',
        cronExpression: '0 9 * * *',
        emailRecipients: ['not-an-email'],
      };

      const res = await request(app)
        .post('/api/scheduled-reports')
        .send(invalidReport)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/scheduled-reports')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/scheduled-reports/:id', () => {
    it('should return report details with logs', async () => {
      const mockReport = {
        id: 'report-1',
        name: 'Test Report',
        reportType: 'daily',
        cronExpression: '0 9 * * *',
        timezone: 'Asia/Tokyo',
        isActive: true,
        format: 'markdown',
      };

      const mockLogs = [
        {
          id: 'log-1',
          reportId: 'report-1',
          status: 'success',
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ];

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockReport);
      (prisma.scheduledReportLog.findMany as any).mockResolvedValue(mockLogs);

      const res = await request(app)
        .get('/api/scheduled-reports/report-1')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('report-1');
      expect(res.body.data.recentLogs.length).toBe(1);
    });

    it('should return 404 for non-existent report', async () => {
      (prisma.scheduledReport.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/scheduled-reports/non-existent')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Scheduled report not found');
    });
  });

  describe('PUT /api/scheduled-reports/:id', () => {
    it('should update an existing report', async () => {
      const mockExisting = {
        id: 'report-1',
        name: 'Old Name',
        reportType: 'daily',
        cronExpression: '0 9 * * *',
        timezone: 'Asia/Tokyo',
        nextRunAt: new Date(),
      };

      const mockUpdated = {
        ...mockExisting,
        name: 'New Name',
      };

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockExisting);
      (prisma.scheduledReport.update as any).mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put('/api/scheduled-reports/report-1')
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Name');
    });

    it('should return 404 for non-existent report', async () => {
      (prisma.scheduledReport.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .put('/api/scheduled-reports/non-existent')
        .send({ name: 'New Name' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should recalculate nextRunAt when cron changes', async () => {
      const mockExisting = {
        id: 'report-1',
        cronExpression: '0 9 * * *',
        timezone: 'Asia/Tokyo',
        nextRunAt: new Date(),
      };

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockExisting);
      (prisma.scheduledReport.update as any).mockImplementation(({ data }) => {
        return Promise.resolve({
          ...mockExisting,
          ...data,
        });
      });

      await request(app)
        .put('/api/scheduled-reports/report-1')
        .send({ cronExpression: '0 10 * * *' })
        .expect(200);

      expect(prisma.scheduledReport.update).toHaveBeenCalled();
      const updateCall = (prisma.scheduledReport.update as any).mock.calls[0][0];
      expect(updateCall.data.nextRunAt).toBeDefined();
    });
  });

  describe('DELETE /api/scheduled-reports/:id', () => {
    it('should delete report and its logs', async () => {
      const mockReport = {
        id: 'report-1',
        name: 'To Delete',
      };

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockReport);
      (prisma.scheduledReportLog.deleteMany as any).mockResolvedValue({ count: 5 });
      (prisma.scheduledReport.delete as any).mockResolvedValue(mockReport);

      const res = await request(app)
        .delete('/api/scheduled-reports/report-1')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(prisma.scheduledReportLog.deleteMany).toHaveBeenCalledWith({
        where: { reportId: 'report-1' },
      });
    });

    it('should return 404 for non-existent report', async () => {
      (prisma.scheduledReport.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/scheduled-reports/non-existent')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/scheduled-reports/:id/run', () => {
    it('should queue manual report execution', async () => {
      const mockReport = {
        id: 'report-1',
        name: 'Test Report',
      };

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockReport);

      const res = await request(app)
        .post('/api/scheduled-reports/report-1/run')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Report execution started');
      expect(res.body.jobId).toBe('test-job-id');
    });

    it('should return 404 for non-existent report', async () => {
      (prisma.scheduledReport.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/scheduled-reports/non-existent/run')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/scheduled-reports/:id/preview', () => {
    it('should return preview for daily report', async () => {
      const mockReport = {
        id: 'report-1',
        name: 'Daily Report',
        reportType: 'daily',
        format: 'markdown',
        deliveryChannels: ['email'],
        emailRecipients: ['test@example.com'],
      };

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockReport);

      const res = await request(app)
        .get('/api/scheduled-reports/report-1/preview')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.preview.type).toBe('daily');
      expect(res.body.data.preview.note).toContain('プレビュー');
    });

    it('should return preview for weekly report', async () => {
      const mockReport = {
        id: 'report-2',
        name: 'Weekly Report',
        reportType: 'weekly',
        format: 'markdown',
        deliveryChannels: [],
        emailRecipients: [],
      };

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockReport);

      const res = await request(app)
        .get('/api/scheduled-reports/report-2/preview')
        .expect(200);

      expect(res.body.data.preview.type).toBe('weekly');
      expect(res.body.data.preview.period).toBeDefined();
    });
  });

  describe('GET /api/scheduled-reports/:id/logs', () => {
    it('should return execution logs', async () => {
      const mockReport = { id: 'report-1' };
      const mockLogs = [
        { id: 'log-1', reportId: 'report-1', status: 'success', startedAt: new Date() },
        { id: 'log-2', reportId: 'report-1', status: 'failed', startedAt: new Date() },
      ];

      (prisma.scheduledReport.findUnique as any).mockResolvedValue(mockReport);
      (prisma.scheduledReportLog.findMany as any).mockResolvedValue(mockLogs);

      const res = await request(app)
        .get('/api/scheduled-reports/report-1/logs')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      (prisma.scheduledReport.findUnique as any).mockResolvedValue({ id: 'report-1' });
      (prisma.scheduledReportLog.findMany as any).mockResolvedValue([]);

      await request(app)
        .get('/api/scheduled-reports/report-1/logs?limit=5')
        .expect(200);

      expect(prisma.scheduledReportLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('GET /api/scheduled-reports/templates', () => {
    it('should return available templates', async () => {
      const res = await request(app)
        .get('/api/scheduled-reports/templates')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Check template structure
      const template = res.body.data[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('reportType');
      expect(template).toHaveProperty('cronExpression');
      expect(template).toHaveProperty('description');
    });
  });
});
