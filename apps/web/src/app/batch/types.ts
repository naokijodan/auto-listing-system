import { z } from 'zod';

// Zod schemas
export const QueueStatsSchema = z.object({
  waiting: z.number(),
  active: z.number(),
  completed: z.number(),
  failed: z.number(),
  delayed: z.number(),
});

export const FailedJobSchema = z.object({
  id: z.string(),
  queueName: z.string(),
  jobId: z.string(),
  jobName: z.string(),
  error: z.string(),
  attemptsMade: z.number(),
  maxAttempts: z.number(),
  canRetry: z.boolean(),
  retryAfter: z.string().optional(),
  createdAt: z.string(),
  status: z.enum(['PENDING', 'RETRIED', 'ABANDONED']),
});

export const RecoveryStatsSchema = z.object({
  pending: z.number(),
  retried: z.number(),
  abandoned: z.number(),
  byQueue: z.record(z.object({ pending: z.number(), retried: z.number() })),
});

export const SSEQueueStatsMessageSchema = z.object({
  type: z.literal('queue-stats'),
  data: z.record(QueueStatsSchema),
});

export type QueueStats = z.infer<typeof QueueStatsSchema>;
export type FailedJob = z.infer<typeof FailedJobSchema>;
export type RecoveryStats = z.infer<typeof RecoveryStatsSchema>;

