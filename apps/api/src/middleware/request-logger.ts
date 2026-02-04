import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger } from '@rakuda/logger';

/**
 * リクエストログミドルウェア
 * 各リクエストにユニークIDを付与してログ出力
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  const startTime = Date.now();

  // リクエストIDをヘッダーに設定
  res.setHeader('X-Request-ID', requestId);

  // リクエストにログ出力用のIDを付与
  (req as any).requestId = requestId;

  const log = createRequestLogger(requestId, req.path);

  // リクエスト開始ログ
  log.info({
    type: 'request',
    method: req.method,
    path: req.path,
    query: req.query,
  });

  // レスポンス完了時にログ出力
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    log.info({
      type: 'response',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}
