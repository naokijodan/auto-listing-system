import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiListResponse, JoomApiEmptyResponse } from '../shared-types';
import { PickupAddress, CreatePickupAddressInput, UpdatePickupAddressInput } from './types';

export class JoomPickupAddressesClient extends JoomBaseClient {
  async getPickupAddress(params: { id: string }): Promise<JoomApiResponse<PickupAddress>> {
    return this.request<JoomApiResponse<PickupAddress>>({
      method: 'GET',
      path: '/pickupAddresses',
      query: { id: params.id },
    });
  }

  async getAllPickupAddresses(): Promise<JoomApiListResponse<PickupAddress>> {
    return this.request<JoomApiListResponse<PickupAddress>>({
      method: 'GET',
      path: '/pickupAddresses/all',
    });
  }

  async createPickupAddress(input: CreatePickupAddressInput): Promise<JoomApiResponse<PickupAddress>> {
    return this.request<JoomApiResponse<PickupAddress>>({
      method: 'POST',
      path: '/pickupAddresses/create',
      body: input,
    });
  }

  async updatePickupAddress(
    params: { id: string },
    input: UpdatePickupAddressInput
  ): Promise<JoomApiResponse<PickupAddress>> {
    return this.request<JoomApiResponse<PickupAddress>>({
      method: 'POST',
      path: '/pickupAddresses/update',
      query: { id: params.id },
      body: input,
    });
  }

  async removePickupAddress(params: { id: string }): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/pickupAddresses/remove',
      query: { id: params.id },
    });
  }
}

