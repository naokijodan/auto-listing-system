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
            organizationId: 'default',
            name: 'Backup 2026-01-01',
            backupType: 'FULL',
            target: 'DATABASE',
            storage: 'S3',
            status: 'COMPLETED',
            sizeBytes: 1024000,
            compressedSize: 307200,
            storagePath: '/backups/backup-1',
            startedAt: new Date(),
            completedAt: new Date(),
            createdAt: new Date(),
            schedule: { name: 'Daily Backup' },
            _count: { recoveryPoints: 1 },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'backup-1',
          backupType: 'FULL',
          status: 'COMPLETED',
        }),
        create: vi.fn().mockResolvedValue({
          id: 'backup-2',
          organizationId: 'default',
          name: 'Backup 2026-01-02',
          backupType: 'FULL',
          target: 'DATABASE',
          storage: 'S3',
          status: 'RUNNING',
          startedAt: new Date(),
          createdAt: new Date(),
        }),
        update: vi.fn().mockResolvedValue({
          id: 'backup-1',
          status: 'COMPLETED',
        }),
        count: vi.fn().mockResolvedValue(10),
        aggregate: vi.fn().mockResolvedValue({
          _sum: { sizeBytes: 10240000 },
        }),
      },
      backupSchedule: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'sched-1',
            name: 'Daily Backup',
            cronExpression: '0 2 * * *',
            backupType: 'FULL',
            storage: 'S3',
            retentionDays: 30,
            isActive: true,
            createdAt: new Date(),
            _count: { jobs: 5 },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'sched-1',
          name: 'Daily Backup',
          isActive: true,
        }),
        create: vi.fn().mockResolvedValue({
          id: 'sched-2',
          organizationId: 'default',
          name: 'Weekly Backup',
          cronExpression: '0 3 * * 0',
          backupType: 'FULL',
          target: 'DATABASE',
          storage: 'S3',
          retentionDays: 30,
          maxBackups: 10,
          encryptionEnabled: true,
          compressionEnabled: true,
          isActive: true,
          nextRunAt: new Date(),
          createdAt: new Date(),
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
            pointInTime: new Date(),
            isVerified: true,
            backupJob: { name: 'Backup 1', backupType: 'FULL', target: 'DATABASE' },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'rp-1',
          backupJobId: 'backup-1',
          isVerified: true,
          restorable: true,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'rp-1',
          isVerified: true,
          verifiedAt: new Date(),
          verificationStatus: 'VERIFIED',
        }),
        count: vi.fn().mockResolvedValue(5),
      },
      restoreJob: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'restore-1',
            recoveryPointId: 'rp-1',
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
            createdAt: new Date(),
          },
        ]),
        create: vi.fn().mockResolvedValue({
          id: 'restore-2',
          organizationId: 'default',
          recoveryPointId: 'rp-1',
          status: 'RUNNING',
          startedAt: new Date(),
          totalItems: 100,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'restore-1',
          status: 'COMPLETED',
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
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  describe('GET /api/backup-recovery/stats', () => {
    it('should return backup statistics', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalJobs');
      expect(response.body).toHaveProperty('completedJobs');
      expect(response.body).toHaveProperty('failedJobs');
      expect(response.body).toHaveProperty('runningJobs');
      expect(response.body).toHaveProperty('successRate');
      expect(response.body).toHaveProperty('totalSchedules');
      expect(response.body).toHaveProperty('activeSchedules');
      expect(response.body).toHaveProperty('totalRecoveryPoints');
      expect(response.body).toHaveProperty('verifiedPoints');
      expect(response.body).toHaveProperty('totalStorageBytes');
    });
  });

  describe('GET /api/backup-recovery/jobs', () => {
    it('should return backup jobs', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/jobs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('total');
      expect(response.body.jobs).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/jobs?status=completed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/jobs?type=full');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('POST /api/backup-recovery/jobs', () => {
    it('should create a backup job', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/jobs')
        .send({
          name: 'Test Backup',
          backupType: 'FULL',
          storage: 'S3',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'RUNNING');
    });

    it('should accept incremental backup', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/jobs')
        .send({
          name: 'Incremental Backup',
          backupType: 'INCREMENTAL',
          storage: 'S3',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('GET /api/backup-recovery/schedules', () => {
    it('should return backup schedules', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/schedules');

      expect(response.status).toBe(200);
      // Route returns the array directly from findMany
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/backup-recovery/schedules', () => {
    it('should create a backup schedule', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/schedules')
        .send({
          name: 'Weekly Backup',
          cronExpression: '0 3 * * 0',
          backupType: 'FULL',
          storage: 'S3',
          retentionDays: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Weekly Backup');
    });

    it('should use default values when optional fields omitted', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/schedules')
        .send({
          name: 'Minimal Schedule',
        });

      // Route does not validate required fields; it creates with defaults
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
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
      expect(response.body).toHaveProperty('id', 'sched-1');
      expect(response.body).toHaveProperty('isActive', false);
    });
  });

  describe('DELETE /api/backup-recovery/schedules/:id', () => {
    it('should delete a schedule', async () => {
      const response = await request(app)
        .delete('/api/backup-recovery/schedules/sched-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('GET /api/backup-recovery/recovery-points', () => {
    it('should return recovery points', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/recovery-points');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recoveryPoints');
      expect(response.body).toHaveProperty('total');
      expect(response.body.recoveryPoints).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/backup-recovery/restore', () => {
    it('should start a restore job', async () => {
      const response = await request(app)
        .post('/api/backup-recovery/restore')
        .send({
          recoveryPointId: 'rp-1',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('recoveryPointId', 'rp-1');
      expect(response.body).toHaveProperty('status', 'RUNNING');
    });

    it('should return 404 when recovery point not found', async () => {
      const { prisma } = await import('@rakuda/database');
      vi.mocked(prisma.recoveryPoint.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/backup-recovery/restore')
        .send({
          recoveryPointId: 'nonexistent',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Recovery point not found');
    });
  });

  describe('POST /api/backup-recovery/verify/:id', () => {
    it('should verify a recovery point', async () => {
      // Mock Math.random to return > 0.1 so verification succeeds
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const response = await request(app)
        .post('/api/backup-recovery/verify/rp-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('recoveryPoint');

      randomSpy.mockRestore();
    });

    it('should return 404 when recovery point not found', async () => {
      const { prisma } = await import('@rakuda/database');
      vi.mocked(prisma.recoveryPoint.findUnique).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/backup-recovery/verify/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Recovery point not found');
    });
  });

  describe('GET /api/backup-recovery/restore-jobs', () => {
    it('should return restore jobs', async () => {
      const response = await request(app)
        .get('/api/backup-recovery/restore-jobs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('total');
      expect(response.body.jobs).toBeInstanceOf(Array);
    });
  });
});
