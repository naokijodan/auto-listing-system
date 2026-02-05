/**
 * 通知テンプレート管理
 *
 * Phase 26: アクション誘導型アラートシステム
 */

import { AlertEventType, AlertSeverity } from '@rakuda/schema';

// テンプレート定義
export interface NotificationTemplate {
  eventType: AlertEventType;
  severity: AlertSeverity;
  defaultChannels: ('email' | 'slack')[];
  email: {
    subjectTemplate: string;
  };
  slack: {
    emoji: string;
    color: string;
  };
  deepLinkType: DeepLinkType;
}

type DeepLinkType = 'product' | 'listing' | 'inventory' | 'pricing' | 'orders' | 'jobs' | 'none';

// イベントタイプ別テンプレート設定
export const NOTIFICATION_TEMPLATES: Record<AlertEventType, NotificationTemplate> = {
  INVENTORY_OUT_OF_STOCK: {
    eventType: 'INVENTORY_OUT_OF_STOCK',
    severity: 'critical',
    defaultChannels: ['email', 'slack'],
    email: {
      subjectTemplate: '【RAKUDA】在庫切れアラート: {{title}}',
    },
    slack: {
      emoji: '🚨',
      color: 'danger',
    },
    deepLinkType: 'inventory',
  },
  PRICE_DROP_DETECTED: {
    eventType: 'PRICE_DROP_DETECTED',
    severity: 'warning',
    defaultChannels: ['slack'],
    email: {
      subjectTemplate: '【RAKUDA】価格変動アラート: {{title}}',
    },
    slack: {
      emoji: '📉',
      color: 'warning',
    },
    deepLinkType: 'pricing',
  },
  LISTING_FAILED: {
    eventType: 'LISTING_FAILED',
    severity: 'critical',
    defaultChannels: ['email', 'slack'],
    email: {
      subjectTemplate: '【RAKUDA】出品失敗: {{title}}',
    },
    slack: {
      emoji: '❌',
      color: 'danger',
    },
    deepLinkType: 'listing',
  },
  COMPETITOR_PRICE_CHANGE: {
    eventType: 'COMPETITOR_PRICE_CHANGE',
    severity: 'info',
    defaultChannels: ['slack'],
    email: {
      subjectTemplate: '【RAKUDA】競合価格変動: {{title}}',
    },
    slack: {
      emoji: '👀',
      color: '#439FE0',
    },
    deepLinkType: 'pricing',
  },
  ORDER_RECEIVED: {
    eventType: 'ORDER_RECEIVED',
    severity: 'info',
    defaultChannels: ['slack'],
    email: {
      subjectTemplate: '【RAKUDA】新規注文: {{orderId}}',
    },
    slack: {
      emoji: '🎉',
      color: 'good',
    },
    deepLinkType: 'orders',
  },
  SCRAPE_ERROR: {
    eventType: 'SCRAPE_ERROR',
    severity: 'warning',
    defaultChannels: ['email'],
    email: {
      subjectTemplate: '【RAKUDA】スクレイプエラー: {{source}}',
    },
    slack: {
      emoji: '⚠️',
      color: 'warning',
    },
    deepLinkType: 'jobs',
  },
};

// Deep Link ルート定義
interface DeepLinkRoutes {
  product: string;
  listing: string;
  inventory: string;
  pricing: string;
  orders: string;
  jobs: string;
}

const DEEP_LINK_ROUTES: DeepLinkRoutes = {
  product: '/products/{{id}}',
  listing: '/listings/{{id}}',
  inventory: '/inventory',
  pricing: '/pricing/recommendations',
  orders: '/orders',
  jobs: '/jobs',
};

/**
 * Deep Linkを生成
 */
export function generateDeepLink(
  type: DeepLinkType,
  params: Record<string, string> = {}
): string {
  const baseUrl = process.env.WEB_APP_URL || 'http://localhost:3001';

  if (type === 'none') {
    return baseUrl;
  }

  let path = DEEP_LINK_ROUTES[type] || '/';

  // パラメータを置換
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`{{${key}}}`, encodeURIComponent(value));
  });

  // 未置換のプレースホルダーをクエリパラメータに変換
  const unreplacedPattern = /\{\{(\w+)\}\}/g;
  const queryParams: string[] = [];

  path = path.replace(unreplacedPattern, (_, key) => {
    if (params[key]) {
      queryParams.push(`${key}=${encodeURIComponent(params[key])}`);
    }
    return '';
  });

  // クエリパラメータを追加
  if (Object.keys(params).length > 0) {
    const additionalParams = Object.entries(params)
      .filter(([key]) => !path.includes(key))
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
    queryParams.push(...additionalParams);
  }

  if (queryParams.length > 0) {
    path += path.includes('?') ? '&' : '?';
    path += queryParams.join('&');
  }

  return `${baseUrl}${path}`;
}

/**
 * イベントタイプからDeep Linkを生成
 */
export function generateDeepLinkForEvent(
  eventType: AlertEventType,
  data: Record<string, unknown>
): string {
  const template = NOTIFICATION_TEMPLATES[eventType];
  if (!template) {
    return process.env.WEB_APP_URL || 'http://localhost:3001';
  }

  const params: Record<string, string> = {};

  // データからパラメータを抽出
  if (data.productId) params.id = String(data.productId);
  if (data.listingId) params.id = String(data.listingId);
  if (data.orderId) params.orderId = String(data.orderId);
  if (data.status) params.status = String(data.status);
  if (data.filter) params.filter = String(data.filter);

  return generateDeepLink(template.deepLinkType, params);
}

/**
 * テンプレート変数を置換
 */
export function interpolate(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
}

/**
 * 重要度に応じた色を取得
 */
export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    critical: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
  };
  return colors[severity] || colors.info;
}

/**
 * 重要度に応じたSlack色を取得
 */
export function getSeveritySlackColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    critical: 'danger',
    warning: 'warning',
    info: 'good',
  };
  return colors[severity] || colors.info;
}

/**
 * デフォルトのアラートルールを取得（初期設定用）
 */
export function getDefaultAlertRules(): Array<{
  name: string;
  eventType: AlertEventType;
  severity: AlertSeverity;
  channels: ('email' | 'slack')[];
  cooldownMinutes: number;
  batchWindowMinutes: number;
}> {
  return [
    {
      name: '在庫切れ通知',
      eventType: 'INVENTORY_OUT_OF_STOCK',
      severity: 'critical',
      channels: ['email', 'slack'],
      cooldownMinutes: 60,
      batchWindowMinutes: 5,
    },
    {
      name: '価格急変通知（±20%以上）',
      eventType: 'PRICE_DROP_DETECTED',
      severity: 'warning',
      channels: ['slack'],
      cooldownMinutes: 30,
      batchWindowMinutes: 10,
    },
    {
      name: '出品失敗通知',
      eventType: 'LISTING_FAILED',
      severity: 'critical',
      channels: ['email', 'slack'],
      cooldownMinutes: 0,
      batchWindowMinutes: 0,
    },
    {
      name: '競合価格変動通知',
      eventType: 'COMPETITOR_PRICE_CHANGE',
      severity: 'info',
      channels: ['slack'],
      cooldownMinutes: 60,
      batchWindowMinutes: 15,
    },
    {
      name: '新規注文通知',
      eventType: 'ORDER_RECEIVED',
      severity: 'info',
      channels: ['slack'],
      cooldownMinutes: 0,
      batchWindowMinutes: 0,
    },
    {
      name: 'スクレイプエラー通知',
      eventType: 'SCRAPE_ERROR',
      severity: 'warning',
      channels: ['email'],
      cooldownMinutes: 30,
      batchWindowMinutes: 5,
    },
  ];
}
