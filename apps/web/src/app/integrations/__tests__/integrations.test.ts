import { describe, it, expect } from 'vitest';
import {
  IntegrationSchema,
  IntegrationTypeSchema,
  StatsSchema,
  IntegrationsResponseSchema,
} from '../types';

describe('IntegrationSchema', () => {
  it('validates a correct Integration object', () => {
    const data = {
      id: 'int_1',
      type: 'shopify',
      name: 'Shopify Store',
      description: 'Primary store',
      status: 'ACTIVE',
      syncEnabled: true,
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'SUCCESS',
      totalSynced: 123,
      totalErrors: 2,
      successRate: 98.4,
      createdAt: new Date().toISOString(),
      _count: { syncLogs: 10, webhookLogs: 3 },
    };
    const r = IntegrationSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const invalid = {
      // id missing
      type: 'shopify',
      name: 'Test',
      status: 'ACTIVE',
      syncEnabled: true,
      totalSynced: 0,
      totalErrors: 0,
      successRate: 0,
      createdAt: new Date().toISOString(),
    } as unknown; // ensure no any
    const r = IntegrationSchema.safeParse(invalid);
    expect(r.success).toBe(false);
  });
});

describe('IntegrationTypeSchema', () => {
  it('validates a correct IntegrationType', () => {
    const data = {
      value: 'shopify',
      label: 'Shopify',
      description: 'Shopify integration',
      features: ['orders', 'products'],
      authType: 'oauth',
    };
    const r = IntegrationTypeSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it('fails when features is not an array', () => {
    const invalid = {
      value: 'x',
      label: 'X',
      description: 'desc',
      features: 'not-array',
      authType: 'api_key',
    } as unknown;
    const r = IntegrationTypeSchema.safeParse(invalid);
    expect(r.success).toBe(false);
  });
});

describe('StatsSchema', () => {
  it('validates a correct Stats object', () => {
    const data = {
      total: 5,
      active: 3,
      inactive: 2,
      byType: { shopify: 2, stripe: 1 },
      syncSuccessRate: 95,
      recentSyncs: [
        {
          id: 'sync_1',
          status: 'SUCCESS',
          startedAt: new Date().toISOString(),
          integration: { name: 'Shopify Store', type: 'shopify' },
        },
      ],
    };
    const r = StatsSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it('fails when recentSyncs has invalid item', () => {
    const invalid = {
      total: 1,
      active: 1,
      inactive: 0,
      byType: {},
      syncSuccessRate: 100,
      recentSyncs: [
        {
          id: 'x',
          status: 'SUCCESS',
          startedAt: new Date().toISOString(),
          // missing integration field
        },
      ],
    } as unknown;
    const r = StatsSchema.safeParse(invalid);
    expect(r.success).toBe(false);
  });
});

describe('IntegrationsResponseSchema', () => {
  it('validates a list of integrations in response', () => {
    const data = {
      data: [
        {
          id: 'int_1',
          type: 'shopify',
          name: 'Shopify Store',
          status: 'ACTIVE',
          syncEnabled: true,
          totalSynced: 0,
          totalErrors: 0,
          successRate: 0,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    const r = IntegrationsResponseSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it('fails when data is not an array', () => {
    const invalid = {
      data: { id: 'not-array' },
    } as unknown;
    const r = IntegrationsResponseSchema.safeParse(invalid);
    expect(r.success).toBe(false);
  });
});

