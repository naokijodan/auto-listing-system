import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock dependencies
vi.mock('@rakuda/database', async () => {
  return {
    prisma: {
      backupJob: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'backup-1',
            type: 'full',
            status: 'completed',
            size: 1024000,
            storage: 's3',
            path: 's3://backups/backup-1.tar.gz',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'backup-1',
          type: 'full',
          status: 'completed',
        }),
        create: vi.fn().mockResolvedValue({
          id: 'backup-2',
          type: 'incremental',
          status: 'pending',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'backup-1',
          status: 'completed',
        }),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { size: 10240000 },
        }),
      },
      backupSchedule: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'sched-1',
            name: 'Daily Backup',
            cronExpression: '0 2 * * *',
            type: 'full',
            storage: 's3',
            retentionDays: 30,
            isActive: true,
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'sched-1',
          name: 'Daily Backup',
          isActive: true,
        }),
        create: vi.fn().mockResolvedValue({
          id: 'sched-2',
          name: 'Weekly Backup',
          cronExpression: '0 3 * * 0',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'sched-1',
          isActive: false,
        }),
        delete: vi.fn().mockResolvedValue({ id: 'sched-1' }),
        count: vi.fn().mockResolvedValue(3),
      },
      recoveryPoint: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rp-1',
            backupJobId: 'backup-1',
            name: 'Recovery Point 1',
            createdAt: new Date(),
            isVerified: true,
            metadata: {},
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'rp-1',
          backupJobId: 'backup-1',
          isVerified: true,
        }),
        count: vi.fn().mockResolvedValue(5),
      },
      restoreJob: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'restore-1',
            recoveryPointId: 'rp-1',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ]),
        create: vi.fn().mockResolvedValue({
          id: 'restore-2',
          recoveryPointId: 'rp-1',
          status: 'pending',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'restore-1',
          status: 'completed',
        }),
        count: vi.fn().mockResolvedValue(2),
      },
    },
  };
});

vi.mock('@rakuda/logger', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
import { backupRecoveryRouter } from '../../routes/backup-recovery';

describe('Backup Recovery API', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/backup-recovery', backupRecoveryRouter);
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status || 500).json({ success: false, error: err.message });
    });
  });

  describe('GET /api/backup-recovery/stats', () => {
    it('should return backup statistics', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/backup-recovery/jobs', () => {
    it('should return backup jobs', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/jobs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/jobs?status=completed');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/jobs?type=full');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/backup-recovery/jobs', () => {
    it('should create a backup job', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/jobs')
        .send({
          type: 'full',
          storage: 's3',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should accept incremental backup', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/jobs')
        .send({
          type: 'incremental',
          storage: 's3',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/backup-recovery/schedules', () => {
    it('should return backup schedules', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/schedules');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/backup-recovery/schedules', () => {
    it('should create a backup schedule', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/schedules')
        .send({
          name: 'Weekly Backup',
          cronExpression: '0 3 * * 0',
          type: 'full',
          storage: 's3',
          retentionDays: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should require name', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/schedules')
        .send({
          cronExpression: '0 3 * * 0',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/backup-recovery/schedules/:id', () => {
    it('should update a schedule', async () => {
      const response = await request(app)
        .put('/api/backup-recovery/schedules/sched-1')
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/backup-recovery/schedules/:id', () => {
    it('should delete a schedule', async () => {
      const response = await request(app)
        .delete('/api/backup-recovery/schedules/sched-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/backup-recovery/recovery-points', () => {
    it('should return recovery points', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/recovery-points');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/backup-recovery/restore', () => {
    it('should start a restore job', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/restore')
        .send({
          recoveryPointId: 'rp-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require recoveryPointId', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/restore')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/backup-recovery/verify/:id', () => {
    it('should verify a backup', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/verify/backup-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/backup-recovery/restore-jobs', () => {
    it('should return restore jobs', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/restore-jobs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});
