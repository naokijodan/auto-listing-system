import { Request } from 'express';

/**
 * Express Request拡張型定義
 * ミドルウェアで追加されるカスタムプロパティを型安全に使用するための定義
 */

declare global {
  namespace Express {
    interface Request {
      /** リクエストID（request-loggerミドルウェアで設定） */
      requestId?: string;
      /** 認証済みフラグ（authミドルウェアで設定） */
      authenticated?: boolean;
      /** クライアントIP（authミドルウェアで設定） */
      clientIp?: string;
    }
  }
}

export {};
