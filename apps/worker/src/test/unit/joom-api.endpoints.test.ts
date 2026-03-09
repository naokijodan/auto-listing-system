import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';
import { JoomApiClient } from '../../lib/joom/compat';

describe('JoomApiClient endpoints', () => {
  let client: JoomApiClient;

  beforeEach(() => {
    client = new JoomApiClient();
    // Mock credentials to bypass ensureAccessToken early checks when request is stubbed
    mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
      id: '1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: { accessToken: 'test-access-token' },
    });
  });

  it('calls /orders/multi with updatedFrom', async () => {
    const spy = vi.spyOn(client as any, 'request').mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await client.getOrders();
    expect(spy).toHaveBeenCalled();
    const [method, endpoint] = spy.mock.calls[0] as [string, string];
    expect(method).toBe('GET');
    expect(endpoint.startsWith('/orders/multi?')).toBe(true);
    expect(endpoint.includes('updatedFrom=')).toBe(true);
  });

  it('calls /orders/unfulfilled for unfulfilled orders', async () => {
    const spy = vi.spyOn(client as any, 'request').mockResolvedValue({ success: true, data: { orders: [], total: 0 } });
    await client.getUnfulfilledOrders({ limit: 10 });
    expect(spy).toHaveBeenCalled();
    const [method, endpoint] = spy.mock.calls[0] as [string, string];
    expect(method).toBe('GET');
    expect(endpoint.startsWith('/orders/unfulfilled')).toBe(true);
  });

  it('calls /orders?id= for getOrder', async () => {
    const spy = vi.spyOn(client as any, 'request').mockResolvedValue({ success: true, data: {} });
    await client.getOrder('ORDER-123');
    expect(spy).toHaveBeenCalled();
    const [method, endpoint] = spy.mock.calls[0] as [string, string];
    expect(method).toBe('GET');
    expect(endpoint).toBe('/orders?id=ORDER-123');
  });
});
