import { JoomBaseClient } from '../base-client';
import { JoomApiResponse, JoomApiListResponse, JoomApiEmptyResponse } from '../shared-types';
import { Document, LinkProductsInput, UnlinkProductsInput, DocumentLink } from './types';

export class JoomDocumentsClient extends JoomBaseClient {
  async getDocument(params: { id: string }): Promise<JoomApiResponse<Document>> {
    return this.request<JoomApiResponse<Document>>({
      method: 'GET',
      path: '/documents',
      query: { id: params.id },
    });
  }

  async retrieveDocuments(params?: { limit?: number; updatedFrom?: string }): Promise<JoomApiListResponse<Document>> {
    return this.request<JoomApiListResponse<Document>>({
      method: 'GET',
      path: '/documents/multi',
      query: { limit: params?.limit, updatedFrom: params?.updatedFrom },
    });
  }

  async linkProducts(input: LinkProductsInput): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/documents/linkProducts',
      body: input,
    });
  }

  async unlinkProducts(input: UnlinkProductsInput): Promise<JoomApiEmptyResponse> {
    return this.request<JoomApiEmptyResponse>({
      method: 'POST',
      path: '/documents/unlinkProducts',
      body: input,
    });
  }

  async getDocumentLinks(params: { productId?: string; productSku?: string }): Promise<JoomApiListResponse<DocumentLink>> {
    return this.request<JoomApiListResponse<DocumentLink>>({
      method: 'GET',
      path: '/documents/links',
      query: { productId: params.productId, productSku: params.productSku },
    });
  }
}

