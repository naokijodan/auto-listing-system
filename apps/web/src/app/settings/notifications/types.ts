import { z } from 'zod';
import { NotificationChannel } from '@/lib/hooks';

// TypeScript Interfaces
export interface EventType {
  value: string;
  label: string;
  category: string;
}

export interface ChannelFormModalProps {
  channel: NotificationChannel | null;
  eventTypes: EventType[];
  onClose: () => void;
  onSave: () => void;
}

// Shared literal types for form payloads
export type ChannelId = 'SLACK' | 'DISCORD' | 'LINE' | 'EMAIL';
export type Severity = 'INFO' | 'WARNING' | 'ERROR';
export type Marketplace = 'JOOM' | 'EBAY';

export interface ChannelBasePayload {
  channel: ChannelId;
  name: string;
  enabledTypes: string[];
  minSeverity: Severity;
  marketplaceFilter: Marketplace[];
}

export type ChannelCreatePayload =
  | (ChannelBasePayload & { token: string })
  | (ChannelBasePayload & { webhookUrl: string });

export type ChannelUpdatePayload = ChannelBasePayload & {
  token?: string;
  webhookUrl?: string;
};

// Zod Schemas
export const EventTypeSchema = z.object({
  value: z.string(),
  label: z.string(),
  category: z.string(),
});

export const NotificationChannelSchema = z.object({
  id: z.string(),
  channel: z.enum(['SLACK', 'DISCORD', 'LINE', 'EMAIL']),
  name: z.string(),
  webhookUrl: z.string().url().optional(),
  token: z.string().optional(),
  enabledTypes: z.array(z.string()),
  minSeverity: z.enum(['INFO', 'WARNING', 'ERROR']),
  marketplaceFilter: z.array(z.enum(['JOOM', 'EBAY'])),
  isActive: z.boolean(),
  lastUsedAt: z.string().optional(),
  lastError: z.string().optional(),
  errorCount: z.number(),
});

export const NotificationSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(NotificationChannelSchema),
});

// Optional helper schema for event types response (used by page)
export const EventTypesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(EventTypeSchema),
});

export type NotificationChannelType = z.infer<typeof NotificationChannelSchema>;
export type NotificationSettingsResponse = z.infer<typeof NotificationSettingsResponseSchema>;
export type EventTypesResponse = z.infer<typeof EventTypesResponseSchema>;

