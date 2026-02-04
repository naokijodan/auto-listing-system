import { z } from 'zod';

/**
 * 環境変数スキーマ定義
 * アプリケーション起動時にバリデーション
 */
const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // S3 / MinIO
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('us-east-1'),

  // Proxy (optional)
  PROXY_HOST: z.string().optional(),
  PROXY_PORT: z.string().optional(),
  PROXY_USER: z.string().optional(),
  PROXY_PASS: z.string().optional(),

  // OpenAI (optional)
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),

  // Joom (optional)
  JOOM_MERCHANT_ID: z.string().optional(),
  JOOM_API_KEY: z.string().optional(),

  // eBay (optional)
  EBAY_CLIENT_ID: z.string().optional(),
  EBAY_CLIENT_SECRET: z.string().optional(),
  EBAY_REFRESH_TOKEN: z.string().optional(),

  // Ports
  API_PORT: z.string().default('3000'),
  BULL_BOARD_PORT: z.string().default('3001'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * 環境変数をパースしてバリデーション
 * 失敗時はエラーをスロー
 */
export function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    throw new Error('Invalid environment variables');
  }

  return result.data;
}

/**
 * 開発環境かどうか
 */
export function isDevelopment(env: Env): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * 本番環境かどうか
 */
export function isProduction(env: Env): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * プロキシが設定されているかどうか
 */
export function hasProxy(env: Env): boolean {
  return !!(env.PROXY_HOST && env.PROXY_PORT);
}

/**
 * プロキシURLを構築
 */
export function getProxyUrl(env: Env): string | null {
  if (!hasProxy(env)) return null;

  const auth = env.PROXY_USER && env.PROXY_PASS
    ? `${env.PROXY_USER}:${env.PROXY_PASS}@`
    : '';

  return `http://${auth}${env.PROXY_HOST}:${env.PROXY_PORT}`;
}
