import { prisma } from '@rakuda/database'
import { logger } from '@rakuda/logger'
import type { JoomApiConfig, JoomApiError, RequestOptions, HttpMethod } from './shared-types'

const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 30000
const RATE_LIMIT_PER_SECOND = 10

const log = logger.child({ module: 'joom-base-client' })

type AnyRecord = Record<string, any>

function toQueryString(params?: AnyRecord): string {
  if (!params) return ''
  const filtered: AnyRecord = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue
    filtered[k] = Array.isArray(v) ? v.join(',') : v
  }
  const sp = new URLSearchParams(filtered as Record<string, string>)
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

function makeError(message: string, statusCode?: number, details?: any): JoomApiError {
  return {
    name: 'JoomApiError',
    message,
    ...(statusCode !== undefined ? { statusCode } : {}),
    ...(details !== undefined ? { details } : {}),
  } as unknown as JoomApiError
}

export class JoomBaseClient {
  private cachedToken?: string
  private cachedTokenExpiry?: number
  private timestamps: number[] = []

  constructor() {
    this.timestamps = []
  }

  private async getCredentials(): Promise<JoomApiConfig & { tokenExpiresAt?: Date | null }> {
    const row = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'JOOM', isActive: true },
    })
    if (!row) {
      throw makeError('Joom credentials not found or inactive')
    }
    const creds = row.credentials as Record<string, any>
    return {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      accessToken: creds.accessToken,
      refreshToken: creds.refreshToken,
      tokenExpiresAt: row.tokenExpiresAt,
    } as JoomApiConfig & { tokenExpiresAt?: Date | null }
  }

  private async ensureAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.cachedToken && this.cachedTokenExpiry && this.cachedTokenExpiry > now) {
      return this.cachedToken
    }
    const cfg = await this.getCredentials()
    const token = cfg.accessToken
    if (!token) {
      throw makeError('Joom access token not configured')
    }
    // Use DB row's tokenExpiresAt for cache expiry
    const expiresAt = (cfg as any).tokenExpiresAt
    const expiryMs = expiresAt ? new Date(expiresAt as any).getTime() : now + 60_000
    this.cachedToken = token
    this.cachedTokenExpiry = Math.max(now + 30_000, expiryMs) // ensure minimal TTL
    return token
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const windowMs = 1000
    // remove timestamps older than window
    this.timestamps = this.timestamps.filter((t) => now - t < windowMs)
    if (this.timestamps.length >= RATE_LIMIT_PER_SECOND) {
      const earliest = this.timestamps[0]
      const waitMs = windowMs - (now - earliest)
      if (waitMs > 0) await this.sleep(waitMs)
    }
    this.timestamps.push(Date.now())
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private shouldRetry(statusCode: number, attempt: number): boolean {
    return (
      attempt < MAX_RETRIES &&
      (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504)
    )
  }

  private calculateRetryDelay(attempt: number): number {
    const base = INITIAL_RETRY_DELAY * Math.pow(2, attempt)
    const jitter = 0.5 + Math.random()
    return Math.min(MAX_RETRY_DELAY, Math.floor(base * jitter))
  }

  private async logApiCall(
    method: HttpMethod,
    endpoint: string,
    requestBody: any,
    statusCode: number | undefined,
    responseBody: any,
    success: boolean,
    errorMessage: string | undefined,
    duration: number,
    joomProductId?: string,
    productId?: string
  ): Promise<void> {
    try {
      await prisma.joomApiLog.create({
        data: {
          method: method as unknown as string,
          endpoint,
          requestBody: requestBody ?? null,
          statusCode: statusCode ?? null,
          responseBody: responseBody ?? null,
          success,
          errorMessage: errorMessage ?? null,
          duration,
          joomProductId: joomProductId ?? null,
          productId: productId ?? null,
        } as any,
      })
    } catch (err) {
      log.warn({ err }, 'Failed to persist Joom API log')
    }
  }

  protected async request<T>(options: RequestOptions): Promise<T> {
    await this.waitForRateLimit()
    const token = await this.ensureAccessToken()
    const baseUrl = JOOM_API_BASE
    const endpoint = `${options.path || ''}`
    const url = `${baseUrl}${endpoint}${toQueryString(options.query as AnyRecord)}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: options.accept || 'application/json',
      ...(options.headers as AnyRecord),
    }
    const hasBody = options.body !== undefined && options.body !== null
    if (hasBody) headers['Content-Type'] = 'application/json'

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const start = Date.now()
      let resp: Response | undefined
      let respText: string | undefined
      try {
        resp = await fetch(url, {
          method: (options.method || 'GET') as string,
          headers,
          body: hasBody ? JSON.stringify(options.body) : undefined,
        })
        const duration = Date.now() - start
        const ct = resp.headers.get('content-type') || ''
        respText = await resp.text()
        const parseJson = () => {
          try { return respText && ct.includes('application/json') ? JSON.parse(respText) : (respText as any) } catch { return respText as any }
        }
        if (resp.ok) {
          const data = parseJson() as T
          await this.logApiCall(
            (options.method || 'GET') as HttpMethod,
            endpoint,
            options.body,
            resp.status,
            data,
            true,
            undefined,
            duration,
            (options as any).joomProductId,
            (options as any).productId
          )
          return data
        }

        const status = resp.status
        const body = parseJson()
        const msg = `Joom API ${options.method} ${endpoint} failed with ${status}`
        await this.logApiCall(
          (options.method || 'GET') as HttpMethod,
          endpoint,
          options.body,
          status,
          body,
          false,
          msg,
          duration,
          (options as any).joomProductId,
          (options as any).productId
        )

        if (this.shouldRetry(status, attempt)) {
          const delay = this.calculateRetryDelay(attempt)
          log.warn({ status, attempt, delay, endpoint }, 'Joom API retrying request')
          await this.sleep(delay)
          continue
        }

        throw makeError(msg, status, body)
      } catch (err: any) {
        const duration = Date.now() - start
        if (resp === undefined) {
          await this.logApiCall(
            (options.method || 'GET') as HttpMethod,
            endpoint,
            options.body,
            undefined,
            null,
            false,
            err?.message || 'Network/Fetch error',
            duration,
            (options as any).joomProductId,
            (options as any).productId
          )
        }
        if (attempt < MAX_RETRIES) {
          const delay = this.calculateRetryDelay(attempt)
          log.warn({ attempt, delay, endpoint, err }, 'Joom API retry after error')
          await this.sleep(delay)
          continue
        }
        throw makeError(err?.message || 'Joom API request failed')
      }
    }
    throw makeError('Joom API max retries exceeded')
  }
}

export default JoomBaseClient
