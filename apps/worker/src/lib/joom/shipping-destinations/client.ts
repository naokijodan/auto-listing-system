import { JoomBaseClient } from '../base-client';
import { JoomApiListResponse, JoomApiEmptyResponse } from '../shared-types';
import {
  VariantShippingDestination,
  ProductShippingDestination,
  UpdateVariantDestinationItem,
  UpdateProductDestinationItem,
  RemoveVariantDestinationItem,
  RemoveProductDestinationItem,
} from './types';

export class JoomShippingDestinationsClient extends JoomBaseClient {
  async getVariantDestinations(params: {
    id?: string;
    sku?: string;
    limit?: number;
  }): Promise<JoomApiListResponse<VariantShippingDestination>> {
    return this.request<JoomApiListResponse<VariantShippingDestination>>({
      method: 'GET',
      path: '/products/destinations',
      query: { id: params.id, sku: params.sku, limit: params.limit },
    });
  }

  async getProductDestinations(params: {
    id?: string;
    sku?: string;
    limit?: number;
  }): Promise<JoomApiListResponse<ProductShippingDestination>> {
    return this.request<JoomApiListResponse<ProductShippingDestination>>({
      method: 'GET',
      path: '/products/destinations/defaults',
      query: { id: params.id, sku: params.sku, limit: params.limit },
    });
  }

  async updateVariantDestinations(
    params: { id?: string; sku?: string },
    input: { items: UpdateVariantDestinationItem[] }
  ): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/destinations/update',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }

  async updateProductDestinations(
    params: { id?: string; sku?: string },
    input: { items: UpdateProductDestinationItem[] }
  ): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/destinations/defaults/update',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }

  async removeVariantDestinations(
    params: { id?: string; sku?: string },
    input: { items: RemoveVariantDestinationItem[] }
  ): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/destinations/remove',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }

  async removeProductDestinations(
    params: { id?: string; sku?: string },
    input: { items: RemoveProductDestinationItem[] }
  ): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/destinations/defaults/remove',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }
}

