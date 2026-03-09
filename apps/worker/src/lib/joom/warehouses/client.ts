import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiListResponse, JoomApiEmptyResponse } from '../shared-types';
import {
  Warehouse, CreateWarehouseInput, UpdateWarehouseInput,
  WarehouseAvailability, UpdateAvailabilityItem,
} from './types';

export class JoomWarehousesClient extends JoomBaseClient {
  async getProductAvailability(params: {
    id?: string;
    sku?: string;
    limit?: number;
    warehouseId?: string[];
    warehouseLabel?: string[];
  }): Promise<JoomApiListResponse<WarehouseAvailability>> {
    return this.request<JoomApiListResponse<WarehouseAvailability>>({
      method: 'GET',
      path: '/products/warehouses',
      query: {
        id: params.id,
        sku: params.sku,
        limit: params.limit,
        warehouseId: params.warehouseId,
        warehouseLabel: params.warehouseLabel,
      },
    });
  }

  async updateProductAvailability(
    params: { id?: string; sku?: string },
    input: { items: UpdateAvailabilityItem[] }
  ): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/warehouses/update',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }

  async getWarehouse(params: { id: string }): Promise<JoomApiResponse<Warehouse>> {
    return this.request<JoomApiResponse<Warehouse>>({
      method: 'GET',
      path: '/warehouses',
      query: { id: params.id },
    });
  }

  async retrieveWarehouses(params?: { limit?: number }): Promise<JoomApiListResponse<Warehouse>> {
    return this.request<JoomApiListResponse<Warehouse>>({
      method: 'GET',
      path: '/warehouses/multi',
      query: { limit: params?.limit },
    });
  }

  async createWarehouse(input: CreateWarehouseInput): Promise<JoomApiResponse<Warehouse>> {
    return this.request<JoomApiResponse<Warehouse>>({
      method: 'POST',
      path: '/warehouses/create',
      body: input,
    });
  }

  async updateWarehouse(
    params: { id: string },
    input: UpdateWarehouseInput
  ): Promise<JoomApiResponse<Warehouse>> {
    return this.request<JoomApiResponse<Warehouse>>({
      method: 'POST',
      path: '/warehouses/update',
      query: { id: params.id },
      body: input,
    });
  }
}

