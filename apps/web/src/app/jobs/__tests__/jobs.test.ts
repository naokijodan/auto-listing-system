import { describe, it, expect } from 'vitest'
import {
  JobLogsResponseSchema,
  QueueStatsResponseSchema,
  QueueStatSchema,
  JobLogSchema,
  jobTypeLabels,
  jobTypeColors,
} from '../types'

describe('QueueStatSchema', () => {
  it('正常なキュー統計をパースできる', () => {
    const valid = { name: 'publish', waiting: 5, active: 2, completed: 100, failed: 3 }
    expect(QueueStatSchema.safeParse(valid).success).toBe(true)
  })

  it('delayed/pausedがオプショナルで動く', () => {
    const valid = { name: 'translate', waiting: 0, active: 0, completed: 50, failed: 0, delayed: 2, paused: 1 }
    expect(QueueStatSchema.safeParse(valid).success).toBe(true)
  })

  it('必須フィールドが欠けている場合を拒否する', () => {
    const invalid = { name: 'publish', waiting: 5 }
    expect(QueueStatSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('JobLogSchema', () => {
  const validJob = {
    id: 'log-001',
    jobId: 'job-001',
    queueName: 'publish',
    jobType: 'joom-publish',
    status: 'completed',
    attempts: 1,
    result: { marketplace: 'JOOM' },
    errorMessage: null,
    createdAt: '2026-03-14T00:00:00Z',
  }

  it('正常なジョブログをパースできる', () => {
    expect(JobLogSchema.safeParse(validJob).success).toBe(true)
  })

  it('resultがnullでもパースできる', () => {
    const job = { ...validJob, result: null }
    expect(JobLogSchema.safeParse(job).success).toBe(true)
  })

  it('必須フィールドが欠けている場合を拒否する', () => {
    const { jobId, ...missing } = validJob
    expect(JobLogSchema.safeParse(missing as unknown).success).toBe(false)
  })
})

describe('QueueStatsResponseSchema', () => {
  it('正常なレスポンスをパースできる', () => {
    const valid = {
      success: true,
      data: [{ name: 'publish', waiting: 0, active: 0, completed: 10, failed: 0 }],
    }
    expect(QueueStatsResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('空配列でもパースできる', () => {
    const valid = { success: true, data: [] }
    expect(QueueStatsResponseSchema.safeParse(valid).success).toBe(true)
  })
})

describe('JobLogsResponseSchema', () => {
  it('正常なレスポンスをパースできる', () => {
    const valid = {
      success: true,
      data: [],
      pagination: { total: 0, limit: 50, offset: 0 },
    }
    expect(JobLogsResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('pagination省略時もパースできる', () => {
    const valid = { success: true, data: [] }
    expect(JobLogsResponseSchema.safeParse(valid).success).toBe(true)
  })
})

describe('jobTypeLabels', () => {
  it('9つのジョブタイプが定義されている', () => {
    expect(Object.keys(jobTypeLabels)).toHaveLength(9)
  })

  it('各ジョブタイプにラベルがある', () => {
    for (const label of Object.values(jobTypeLabels)) {
      expect(label).toBeTruthy()
    }
  })
})

describe('jobTypeColors', () => {
  it('9つのジョブタイプが定義されている', () => {
    expect(Object.keys(jobTypeColors)).toHaveLength(9)
  })

  it('各ジョブタイプに色クラスがある', () => {
    for (const color of Object.values(jobTypeColors)) {
      expect(color).toContain('bg-')
      expect(color).toContain('text-')
    }
  })
})
