import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiListResponse, JoomApiEmptyResponse } from '../shared-types';
import { CreatePickupRequestInput, PickupRequest, PickupBox } from './types';

export class JoomPickupRequestsClient extends JoomBaseClient {
  async createPickupRequest(input: CreatePickupRequestInput): Promise<JoomApiResponse<PickupRequest>> {
    return this.request<JoomApiResponse<PickupRequest>>({
      method: 'POST',
      path: '/pickups/requests/create',
      body: input,
    });
  }

  async retrievePickupRequests(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<PickupRequest>> {
    return this.request<JoomApiListResponse<PickupRequest>>({
      method: 'GET',
      path: '/pickups/requests/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async getPickupRequest(params: { id: string }): Promise<JoomApiResponse<PickupRequest>> {
    return this.request<JoomApiResponse<PickupRequest>>({
      method: 'GET',
      path: '/pickups/requests',
      query: { id: params.id },
    });
  }

  async cancelPickupRequest(params: { id: string }): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/pickups/requests/cancel',
      query: { id: params.id },
    });
  }

  async generateBoxLabels(params: { id: string }): Promise<Buffer> {
    return this.request<Buffer>({
      method: 'POST',
      path: '/pickups/requests/generateBoxLabels',
      query: { id: params.id },
      accept: 'application/pdf',
    });
  }

  async retrievePickupBoxes(params: { requestId: string }): Promise<JoomApiListResponse<PickupBox>> {
    return this.request<JoomApiListResponse<PickupBox>>({
      method: 'GET',
      path: '/pickups/requests/boxes/multi',
      query: { requestId: params.requestId },
    });
  }
}

