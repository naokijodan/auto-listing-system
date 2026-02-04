import { PrismaClient } from '@prisma/client';

// グローバルでPrismaClientのインスタンスをキャッシュ
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prismaクライアントのシングルトンインスタンス
 * 開発環境でのホットリロード時に複数接続を防止
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 型のエクスポート
export * from '@prisma/client';

// デフォルトエクスポート
export default prisma;
