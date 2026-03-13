import { z } from 'zod';

// TypeScript interfaces
export interface Integration {
  id: string;
  type: string;
  name: string;
  description?: string;
  status: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  totalSynced: number;
  totalErrors: number;
  successRate: number;
  createdAt: string;
  _count?: {
    syncLogs: number;
    webhookLogs: number;
  };
}

export interface IntegrationType {
  value: string;
  label: string;
  description: string;
  features: string[];
  authType: string;
}

export interface Stats {
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
  syncSuccessRate: number;
  recentSyncs: Array<{
    id: string;
    status: string;
    startedAt: string;
    integration: { name: string; type: string };
  }>;
}

// Zod Schemas
export const IntegrationSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.string(),
  syncEnabled: z.boolean(),
  lastSyncAt: z.string().optional(),
  lastSyncStatus: z.string().optional(),
  totalSynced: z.number(),
  totalErrors: z.number(),
  successRate: z.number(),
  createdAt: z.string(),
  _count: z
    .object({
      syncLogs: z.number(),
      webhookLogs: z.number(),
    })
    .optional(),
});

export const IntegrationTypeSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string(),
  features: z.array(z.string()),
  authType: z.string(),
});

export const StatsSchema = z.object({
  total: z.number(),
  active: z.number(),
  inactive: z.number(),
  byType: z.record(z.number()),
  syncSuccessRate: z.number(),
  recentSyncs: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      startedAt: z.string(),
      integration: z.object({
        name: z.string(),
        type: z.string(),
      }),
    })
  ),
});

export const IntegrationsResponseSchema = z.object({
  data: z.array(IntegrationSchema),
});

export type IntegrationResponse = z.infer<typeof IntegrationsResponseSchema>;

