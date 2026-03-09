import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiListResponse, JoomApiEmptyResponse } from '../shared-types';
import {
  Order, CancelOrderInput, FulfillOrderInput,
  FulfillOnlineInput, FulfillOnlineResult,
  ModifyTrackingInput, ShippingProvider
} from './types';

export class JoomOrdersClient extends JoomBaseClient {
  async getOrder(params: { id: string }): Promise<JoomApiResponse<Order>> {
    return this.request<JoomApiResponse<Order>>({
      method: 'GET',
      path: '/orders',
      query: { id: params.id },
    });
  }

  async retrieveOrders(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<Order>> {
    return this.request<JoomApiListResponse<Order>>({
      method: 'GET',
      path: '/orders/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async cancelOrder(params: { id: string }, input: CancelOrderInput): Promise<JoomApiResponse<Order>> {
    return this.request<JoomApiResponse<Order>>({
      method: 'POST',
      path: '/orders/cancel',
      query: { id: params.id },
      body: input,
    });
  }

  async fulfillOrder(params: { id: string }, input: FulfillOrderInput): Promise<JoomApiResponse<Order>> {
    return this.request<JoomApiResponse<Order>>({
      method: 'POST',
      path: '/orders/fulfill',
      query: { id: params.id },
      body: input,
    });
  }

  async getUnfulfilledOrders(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<Order>> {
    return this.request<JoomApiListResponse<Order>>({
      method: 'GET',
      path: '/orders/unfulfilled',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async fulfillOnline(input: FulfillOnlineInput): Promise<JoomApiResponse<FulfillOnlineResult>> {
    return this.request<JoomApiResponse<FulfillOnlineResult>>({
      method: 'POST',
      path: '/orders/fulfillOnline',
      body: input,
    });
  }

  async modifyTracking(params: { id: string }, input: ModifyTrackingInput): Promise<JoomApiResponse<Order>> {
    return this.request<JoomApiResponse<Order>>({
      method: 'POST',
      path: '/orders/modifyTracking',
      query: { id: params.id },
      body: input,
    });
  }

  async getShippingLabel(params: { id: string }): Promise<Buffer> {
    return this.request<Buffer>({
      method: 'GET',
      path: '/orders/shippingLabel',
      query: { id: params.id },
      accept: 'application/pdf',
    });
  }

  async generateEuLabels(params: { id: string }): Promise<Buffer> {
    return this.request<Buffer>({
      method: 'GET',
      path: '/orders/generateEuLabels',
      query: { id: params.id },
      accept: 'application/pdf',
    });
  }

  async getShippingProviders(): Promise<JoomApiListResponse<ShippingProvider>> {
    return this.request<JoomApiListResponse<ShippingProvider>>({
      method: 'GET',
      path: '/shippers',
    });
  }
}

