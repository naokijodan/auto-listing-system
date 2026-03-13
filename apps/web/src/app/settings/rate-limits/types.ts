import { z } from 'zod';

// Rate limit configuration for a domain
export const RateLimitConfigSchema = z.object({
  domain: z.string().min(1),
  // UI constraints
  requestsPerWindow: z.number().min(1).max(100),
  windowMs: z.number().min(10_000).max(300_000),
  minDelayMs: z.number().min(500).max(30_000),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// Runtime status for a domain's limiter
export const RateLimitStatusSchema = z.object({
  domain: z.string().min(1),
  config: RateLimitConfigSchema,
  currentCount: z.number().min(0),
  limit: z.number().min(1),
  remaining: z.number().min(0),
  canRequest: z.boolean(),
  resetMs: z.number().min(0),
});

export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;

// Optional response schemas for SWR parsing
export const ConfigsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(RateLimitConfigSchema),
});
export type ConfigsResponse = z.infer<typeof ConfigsResponseSchema>;

export const StatusResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(RateLimitStatusSchema),
});
export type StatusResponse = z.infer<typeof StatusResponseSchema>;

