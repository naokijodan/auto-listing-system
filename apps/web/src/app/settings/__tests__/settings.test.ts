import { describe, it, expect } from 'vitest';
import {
  marketplaceOverviewSchema,
  connectionTestResultSchema,
  syncScheduleConfigSchema,
  syncScheduleSchema,
  marketplaceOverviewResponseSchema,
  syncSchedulesResponseSchema,
} from '../types';

describe('settings/types zod schemas', () => {
  describe('marketplaceOverviewSchema', () => {
    it('parses valid overview', () => {
      const data = {
        ebay: { connected: true, tokenExpired: null, environment: 'production', listings: { ACTIVE: 2 } },
        joom: { connected: false, listings: { ACTIVE: 0, SOLD: 1 } },
      };
      expect(() => marketplaceOverviewSchema.parse(data)).not.toThrow();
    });

    it('fails when missing required keys', () => {
      const bad = { ebay: { connected: true, tokenExpired: null, environment: 'production', listings: {} } } as unknown;
      expect(() => marketplaceOverviewSchema.parse(bad)).toThrow();
    });
  });

  describe('connectionTestResultSchema', () => {
    it('accepts success result', () => {
      const v = { success: true, status: 'OK', message: 'done' };
      expect(() => connectionTestResultSchema.parse(v)).not.toThrow();
    });

    it('accepts failure result with optional fields', () => {
      const v = { success: false, status: 'NG', message: 'bad', environment: 'sandbox', tokenExpired: true };
      expect(() => connectionTestResultSchema.parse(v)).not.toThrow();
    });

    it('rejects when message is missing', () => {
      const v = { success: true, status: 'OK' } as unknown;
      expect(() => connectionTestResultSchema.parse(v)).toThrow();
    });
  });

  describe('syncScheduleConfigSchema', () => {
    it('parses minimal config', () => {
      expect(() => syncScheduleConfigSchema.parse({ interval: 6, enabled: true })).not.toThrow();
    });

    it('rejects invalid types', () => {
      expect(() => syncScheduleConfigSchema.parse({ interval: '6', enabled: true } as unknown)).toThrow();
    });
  });

  describe('syncScheduleSchema', () => {
    const base = {
      marketplace: 'JOOM',
      inventory: { interval: 6, enabled: true },
      orders: { interval: 6, enabled: true },
      prices: { interval: 6, enabled: true },
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('accepts JOOM', () => {
      expect(() => syncScheduleSchema.parse(base)).not.toThrow();
    });

    it('accepts EBAY', () => {
      expect(() => syncScheduleSchema.parse({ ...base, marketplace: 'EBAY' })).not.toThrow();
    });

    it('rejects unknown marketplace', () => {
      expect(() => syncScheduleSchema.parse({ ...base, marketplace: 'AMAZON' } as unknown)).toThrow();
    });
  });

  describe('response schemas', () => {
    it('parses overview ApiResponse', () => {
      const payload = {
        success: true,
        data: {
          ebay: { connected: true, tokenExpired: null, environment: 'production', listings: { ACTIVE: 1 } },
          joom: { connected: true, listings: { ACTIVE: 0 } },
        },
      };
      expect(() => marketplaceOverviewResponseSchema.parse(payload)).not.toThrow();
    });

    it('parses syncSchedules ApiResponse', () => {
      const payload = {
        success: true,
        data: [
          {
            marketplace: 'JOOM',
            inventory: { interval: 6, enabled: true },
            orders: { interval: 6, enabled: true },
            prices: { interval: 6, enabled: true },
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };
      expect(() => syncSchedulesResponseSchema.parse(payload)).not.toThrow();
    });
  });
});

