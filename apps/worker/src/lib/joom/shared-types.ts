export type Money = string; // e.g. "4.52" - NEVER use number for prices

export type JoomId = string; // Pattern: ^\d+\-\d+\-\d+\-\d+\-\d+|[a-f\d]{24}

export interface ImageProcessed {
  height: number;
  url: string;
  width: number;
}

export interface ImageBundleWithState {
  imageState?: string; // e.g. "blockedImages"
  origUrl?: string;
  processed?: ImageProcessed[];
}

export interface Paging {
  next?: string; // URL for next page
}

export interface JoomApiResponse<T> {
  data: T;
}

export interface JoomApiListResponse<T> {
  paging?: Paging;
  data: {
    items: T[];
  };
}

export interface JoomApiCountResponse {
  data: {
    count: number;
  };
}

export interface JoomApiEmptyResponse {
  // Empty response for delete/approve/cancel operations
}

export class JoomApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'JoomApiError';
  }
}

export interface JoomApiConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  baseUrl?: string; // default: https://api-merchant.joom.com/api/v3
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  accept?: string; // default: application/json, can be application/pdf
}

