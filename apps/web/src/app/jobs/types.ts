import { z } from 'zod'

export type StatusFilter = 'all' | 'completed' | 'failed' | 'active' | 'waiting'
export type QueueFilter = 'all' | string

export const jobTypeLabels: Record<string, string> = {
  scrape: 'スクレイピング',
  translate: '翻訳',
  image: '画像処理',
  publish: '出品',
  inventory: '在庫',
  pricing: '価格',
  joom: 'Joom',
  ebay: 'eBay',
  notification: '通知',
}

export const jobTypeColors: Record<string, string> = {
  scrape: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  translate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  image: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  publish: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  inventory: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400',
  pricing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  joom: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ebay: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  notification: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
}

// Zodスキーマ
export const QueueStatSchema = z.object({
  name: z.string(),
  waiting: z.number(),
  active: z.number(),
  completed: z.number(),
  failed: z.number(),
  delayed: z.number().optional(),
  paused: z.number().optional(),
})

export const JobLogSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  queueName: z.string(),
  jobType: z.string(),
  status: z.string(),
  attempts: z.number(),
  result: z.unknown().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  completedAt: z.string().nullable().optional(),
})

export const JobLogsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(JobLogSchema),
  pagination: z
    .object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    })
    .optional(),
})

export const QueueStatsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(QueueStatSchema),
})

