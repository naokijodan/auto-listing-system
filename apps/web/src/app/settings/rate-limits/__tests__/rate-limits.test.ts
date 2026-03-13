import { describe, it, expect } from 'vitest';
import {
  RateLimitConfigSchema,
  RateLimitStatusSchema,
} from '../types';

describe('RateLimitConfigSchema', () => {
  it('accepts a valid config', () => {
    const valid = {
      domain: 'example.com',
      requestsPerWindow: 50,
      windowMs: 120000,
      minDelayMs: 1000,
    };
    expect(RateLimitConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects too low requestsPerWindow', () => {
    const invalid = {
      domain: 'example.com',
      requestsPerWindow: 0,
      windowMs: 120000,
      minDelayMs: 1000,
    };
    expect(RateLimitConfigSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects too high requestsPerWindow', () => {
    const invalid = {
      domain: 'example.com',
      requestsPerWindow: 101,
      windowMs: 120000,
      minDelayMs: 1000,
    };
    expect(RateLimitConfigSchema.safeParse(invalid).success).toBe(false);
  });

  it('checks windowMs min/max boundaries', () => {
    const minOk = {
      domain: 'example.com',
      requestsPerWindow: 10,
      windowMs: 10000,
      minDelayMs: 500,
    };
    const maxOk = { ...minOk, windowMs: 300000 };
    const belowMin = { ...minOk, windowMs: 9999 };
    const aboveMax = { ...minOk, windowMs: 300001 };

    expect(RateLimitConfigSchema.safeParse(minOk).success).toBe(true);
    expect(RateLimitConfigSchema.safeParse(maxOk).success).toBe(true);
    expect(RateLimitConfigSchema.safeParse(belowMin).success).toBe(false);
    expect(RateLimitConfigSchema.safeParse(aboveMax).success).toBe(false);
  });

  it('checks minDelayMs min/max boundaries', () => {
    const base = {
      domain: 'example.com',
      requestsPerWindow: 10,
      windowMs: 10000,
      minDelayMs: 500,
    };
    const belowMin = { ...base, minDelayMs: 499 };
    const aboveMax = { ...base, minDelayMs: 30001 };

    expect(RateLimitConfigSchema.safeParse(base).success).toBe(true);
    expect(RateLimitConfigSchema.safeParse(belowMin).success).toBe(false);
    expect(RateLimitConfigSchema.safeParse(aboveMax).success).toBe(false);
  });
});

describe('RateLimitStatusSchema', () => {
  const validStatus = {
    domain: 'example.com',
    config: {
      domain: 'example.com',
      requestsPerWindow: 20,
      windowMs: 60000,
      minDelayMs: 1000,
    },
    currentCount: 5,
    limit: 20,
    remaining: 15,
    canRequest: true,
    resetMs: 5000,
  };

  it('accepts a valid status', () => {
    expect(RateLimitStatusSchema.safeParse(validStatus).success).toBe(true);
  });

  it('rejects negative currentCount', () => {
    const invalid = { ...validStatus, currentCount: -1 };
    expect(RateLimitStatusSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { domain, ...rest } = validStatus;
    const invalid = rest; // domain missing
    // @ts-expect-error intentional missing field for validation test
    expect(RateLimitStatusSchema.safeParse(invalid).success).toBe(false);
  });
});

