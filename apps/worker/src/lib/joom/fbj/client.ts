import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiListResponse, JoomApiEmptyResponse } from '../shared-types';
import { FbjReplenishment, UpdateForecastCountInput, FbjInbound, CreateInboundInput, SplitReplenishmentInput } from './types';

export class JoomFbjClient extends JoomBaseClient {
  async retrieveReplenishments(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<FbjReplenishment>> {
    return this.request<JoomApiListResponse<FbjReplenishment>>({
      method: 'GET',
      path: '/fbj/replenishments/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async updateForecastCount(input: UpdateForecastCountInput): Promise<JoomApiResponse<FbjReplenishment>> {
    return this.request<JoomApiResponse<FbjReplenishment>>({
      method: 'POST',
      path: '/fbj/replenishments/updateForecastCount',
      body: input,
    });
  }

  async acceptReplenishment(params: { id: string }): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/fbj/replenishments/accept',
      query: { id: params.id },
    });
  }

  async cancelReplenishment(params: { id: string }): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/fbj/replenishments/cancel',
      query: { id: params.id },
    });
  }

  async reviewReplenishment(params: { id: string }): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/fbj/replenishments/review',
      query: { id: params.id },
    });
  }

  async completeReplenishment(params: { id: string }): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/fbj/replenishments/complete',
      query: { id: params.id },
    });
  }

  async generateReplenishmentLabel(params: { id: string }): Promise<Buffer> {
    return this.request<Buffer>({
      method: 'POST',
      path: '/fbj/replenishments/generateLabel',
      query: { id: params.id },
      accept: 'application/pdf',
    });
  }

  async splitReplenishment(input: SplitReplenishmentInput): Promise<JoomApiResponse<FbjReplenishment>> {
    return this.request<JoomApiResponse<FbjReplenishment>>({
      method: 'POST',
      path: '/fbj/replenishments/split',
      body: input,
    });
  }

  async retrieveInbounds(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<FbjInbound>> {
    return this.request<JoomApiListResponse<FbjInbound>>({
      method: 'GET',
      path: '/fbj/inbounds/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async createInbound(input: CreateInboundInput): Promise<JoomApiResponse<FbjInbound>> {
    return this.request<JoomApiResponse<FbjInbound>>({
      method: 'POST',
      path: '/fbj/inbounds/create',
      body: input,
    });
  }

  async removeInbound(params: { id: string }): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/fbj/inbounds/remove',
      query: { id: params.id },
    });
  }

  async generateConsignmentNote(params: { id: string }): Promise<Buffer> {
    return this.request<Buffer>({
      method: 'POST',
      path: '/fbj/inbounds/generateConsignmentNote',
      query: { id: params.id },
      accept: 'application/pdf',
    });
  }
}
