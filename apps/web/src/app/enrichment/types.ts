import { z } from 'zod';
import {
  Clock,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

// Status Enum
export const EnrichmentStatus = z.enum([
  'PENDING',
  'PROCESSING',
  'READY_TO_REVIEW',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
  'FAILED',
]);
export type EnrichmentStatus = z.infer<typeof EnrichmentStatus>;

// Label Type Definitions
export interface StatusLabel {
  label: string;
  color: string;
  icon:
    | typeof Clock
    | typeof Loader2
    | typeof Eye
    | typeof CheckCircle
    | typeof XCircle
    | typeof Sparkles
    | typeof AlertCircle;
}

export type StatusLabels = Record<string, StatusLabel>;

// Status Config
export const statusConfig: StatusLabels = {
  PENDING: {
    label: '待機中',
    color:
      'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    icon: Clock,
  },
  PROCESSING: {
    label: '処理中',
    color:
      'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Loader2,
  },
  READY_TO_REVIEW: {
    label: 'レビュー待ち',
    color:
      'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Eye,
  },
  APPROVED: {
    label: '承認済み',
    color:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle,
  },
  REJECTED: {
    label: '却下',
    color:
      'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
  PUBLISHED: {
    label: '出品済み',
    color:
      'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Sparkles,
  },
  FAILED: {
    label: 'エラー',
    color:
      'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
  },
};

// Zod Schemas
export const enrichmentTaskSchema = z.object({
  id: z.string(),
  productId: z.string(),
  status: EnrichmentStatus,
  priority: z.number(),
  validationResult: z.string().optional(),
  translations: z
    .object({
      en: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
        })
        .optional(),
      zh: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  pricing: z
    .object({
      costJpy: z.number(),
      finalPriceUsd: z.number(),
      profitRate: z.number(),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  product: z.object({
    id: z.string(),
    title: z.string(),
    price: z.number(),
    brand: z.string().optional(),
    images: z.array(z.string()).optional(),
  }),
});

export const queueStatsSchema = z.object({
  queueName: z.string(),
  waiting: z.number(),
  active: z.number(),
  completed: z.number(),
  failed: z.number(),
  delayed: z.number(),
  total: z.number(),
});

export const enrichmentStatsSchema = z.object({
  total: z.number(),
  pending: z.number(),
  processing: z.number(),
  approved: z.number(),
  rejected: z.number(),
  readyToReview: z.number(),
  published: z.number(),
  failed: z.number(),
});

export const fullWorkflowResponseSchema = z.object({
  jobId: z.string(),
});

// Types from Schemas
export type EnrichmentTask = z.infer<typeof enrichmentTaskSchema>;
export type QueueStats = z.infer<typeof queueStatsSchema>;
export type EnrichmentStats = z.infer<typeof enrichmentStatsSchema>;
export type FullWorkflowResponse = z.infer<typeof fullWorkflowResponseSchema>;

