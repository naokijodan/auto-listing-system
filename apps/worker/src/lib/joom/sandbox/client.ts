import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiEmptyResponse } from '../shared-types';
import { CreateSandboxOrderInput, ApproveSandboxProductInput, CategorizeSandboxProductInput, SandboxOrder, SandboxProductResult } from './types';

export class JoomSandboxClient extends JoomBaseClient {
  async createOrder(input: CreateSandboxOrderInput): Promise<JoomApiResponse<SandboxOrder>> {
    return this.request<JoomApiResponse<SandboxOrder>>({
      method: 'POST',
      path: '/sandbox/orders/create',
      body: input,
    });
  }

  async approveProduct(input: ApproveSandboxProductInput): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/sandbox/products/approve',
      body: input,
    });
  }

  async categorizeProduct(input: CategorizeSandboxProductInput): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/sandbox/products/categorize',
      body: input,
    });
  }
}

