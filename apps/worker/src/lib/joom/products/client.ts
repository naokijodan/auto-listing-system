import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiListResponse, JoomApiCountResponse, JoomApiEmptyResponse } from '../shared-types';
import {
  Product, CreateProductInput, UpdateProductInput, RemoveProductInput,
  RemoveVariantsInput, GenerateEuLabelsInput, ColorWithName,
  CategoryWithTakeRate, CategoryRequirements, CategoryAttributeValues,
  JoomSelectProposal
} from './types';

/**
 * Products client for Joom API v3. Implements all product endpoints.
 */
export class JoomProductsClient extends JoomBaseClient {
  async getProduct(params: { id?: string; sku?: string }): Promise<JoomApiResponse<Product>> {
    return this.request<JoomApiResponse<Product>>({
      method: 'GET',
      path: '/products',
      query: { id: params.id, sku: params.sku },
    });
  }

  async retrieveProducts(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<Product>> {
    return this.request<JoomApiListResponse<Product>>({
      method: 'GET',
      path: '/products/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async retrieveProductCount(params?: { updatedFrom?: string }): Promise<JoomApiCountResponse> {
    return this.request<JoomApiCountResponse>({
      method: 'GET',
      path: '/products/multi/count',
      query: { updatedFrom: params?.updatedFrom },
    });
  }

  async getPublishedProducts(params: { ids: string[] }): Promise<JoomApiListResponse<Product>> {
    return this.request<JoomApiListResponse<Product>>({
      method: 'GET',
      path: '/products/published',
      query: { ids: params.ids },
    });
  }

  async createProduct(input: CreateProductInput): Promise<JoomApiResponse<Product>> {
    return this.request<JoomApiResponse<Product>>({
      method: 'POST',
      path: '/products/create',
      body: input,
    });
  }

  async updateProduct(
    params: { id?: string; sku?: string },
    input: UpdateProductInput
  ): Promise<JoomApiResponse<Product>> {
    return this.request<JoomApiResponse<Product>>({
      method: 'POST',
      path: '/products/update',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }

  async changeProductStore(
    params: { id?: string; sku?: string },
    storeId: string
  ): Promise<JoomApiResponse<Product>> {
    return this.request<JoomApiResponse<Product>>({
      method: 'POST',
      path: '/products/changeStore',
      query: { id: params.id, sku: params.sku },
      body: { storeId },
    });
  }

  async removeProduct(
    params: { id?: string; sku?: string },
    input?: RemoveProductInput
  ): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/remove',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }

  async removeProductVariants(
    params: { id?: string; sku?: string },
    input: RemoveVariantsInput
  ): Promise<JoomApiResponse<Product>> {
    return this.request<JoomApiResponse<Product>>({
      method: 'POST',
      path: '/products/removeVariants',
      query: { id: params.id, sku: params.sku },
      body: input,
    });
  }

  async generateEuLabels(input: GenerateEuLabelsInput): Promise<Buffer> {
    return this.request<Buffer>({
      method: 'POST',
      path: '/products/generateEuLabels',
      body: input,
      accept: 'application/pdf',
    });
  }

  async getProductColors(): Promise<JoomApiListResponse<ColorWithName>> {
    return this.request<JoomApiListResponse<ColorWithName>>({
      method: 'GET',
      path: '/productColors',
    });
  }

  async getCategories(): Promise<JoomApiListResponse<CategoryWithTakeRate>> {
    return this.request<JoomApiListResponse<CategoryWithTakeRate>>({
      method: 'GET',
      path: '/productCategories',
    });
  }

  async getCategoryRequirements(params: { id?: string; locale?: string }): Promise<JoomApiResponse<CategoryRequirements>> {
    return this.request<JoomApiResponse<CategoryRequirements>>({
      method: 'GET',
      path: '/productCategories/requirements',
      query: { id: params.id, locale: params.locale },
    });
  }

  async getCategoryAttributeValues(params: { id?: string }): Promise<CategoryAttributeValues[]> {
    const resp = await this.request<{ data: CategoryAttributeValues[] }>({
      method: 'GET',
      path: '/productCategories/attributeValues',
      query: { id: params.id },
    });
    return resp.data;
  }

  async getApprovedJoomSelectProposals(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<JoomSelectProposal>> {
    return this.request<JoomApiListResponse<JoomSelectProposal>>({
      method: 'GET',
      path: '/products/joomSelectProposals/approved/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async getPendingJoomSelectProposals(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<JoomSelectProposal>> {
    return this.request<JoomApiListResponse<JoomSelectProposal>>({
      method: 'GET',
      path: '/products/joomSelectProposals/pending/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async getRemovedJoomSelectProposals(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<JoomSelectProposal>> {
    return this.request<JoomApiListResponse<JoomSelectProposal>>({
      method: 'GET',
      path: '/products/joomSelectProposals/removed/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async approveJoomSelectProposal(id: string): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/joomSelectProposals/approve',
      body: { id },
    });
  }

  async cancelJoomSelectProposal(id: string): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/products/joomSelectProposals/cancel',
      body: { id },
    });
  }
}

export default JoomProductsClient;

