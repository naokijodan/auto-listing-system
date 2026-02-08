#!/usr/bin/env npx ts-node

/**
 * eBay Sandbox 動作確認スクリプト
 *
 * 使用方法:
 *   npx ts-node scripts/verify-ebay-sandbox.ts
 *
 * 環境変数:
 *   DATABASE_URL - PostgreSQL接続URL
 *   EBAY_ENV=sandbox (省略可、デフォルトsandbox)
 *
 * 前提条件:
 *   - eBay Sandbox アカウント作成済み
 *   - eBay Developer Portal でアプリ登録済み
 *   - MarketplaceCredential テーブルにeBay認証情報登録済み
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'ebay-sandbox-verify' });

// ========================================
// Types
// ========================================

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration: number;
  details?: any;
}

interface EbayCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  devId?: string;
}

// ========================================
// Constants
// ========================================

const EBAY_SANDBOX_AUTH = 'https://auth.sandbox.ebay.com';
const EBAY_SANDBOX_API = 'https://api.sandbox.ebay.com';

// テスト用商品データ
const TEST_PRODUCT = {
  sku: `RAKUDA-TEST-${Date.now()}`,
  title: 'Test Product - RAKUDA Sandbox Verification',
  description: '<p>This is a test product created by RAKUDA system verification script.</p>',
  categoryId: '31387', // Wristwatches
  condition: 'USED_EXCELLENT',
  price: 99.99,
  quantity: 1,
  imageUrls: [
    'https://picsum.photos/800/800', // プレースホルダー画像
  ],
};

// ========================================
// Helper Functions
// ========================================

function logResult(result: TestResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
  console.log(`${icon} ${result.name}: ${result.message} (${result.duration}ms)`);
  if (result.details && result.status === 'fail') {
    console.log('   詳細:', JSON.stringify(result.details, null, 2).split('\n').join('\n   '));
  }
}

async function runTest(
  name: string,
  testFn: () => Promise<{ success: boolean; message: string; details?: any }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const { success, message, details } = await testFn();
    return {
      name,
      status: success ? 'pass' : 'fail',
      message,
      duration: Date.now() - start,
      details,
    };
  } catch (error: any) {
    return {
      name,
      status: 'fail',
      message: error.message,
      duration: Date.now() - start,
      details: { error: error.stack },
    };
  }
}

// ========================================
// eBay API Functions
// ========================================

async function getCredentials(): Promise<EbayCredentials | null> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: {
      marketplace: 'EBAY',
      isActive: true,
    },
  });

  if (!credential) {
    return null;
  }

  return credential.credentials as EbayCredentials;
}

async function refreshAccessToken(credentials: EbayCredentials): Promise<string | null> {
  if (!credentials.refreshToken) {
    return credentials.accessToken || null;
  }

  const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');

  const response = await fetch(`${EBAY_SANDBOX_AUTH}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    log.error({ type: 'token_refresh_failed', error: data });
    return null;
  }

  // DBを更新
  await prisma.marketplaceCredential.updateMany({
    where: { marketplace: 'EBAY', isActive: true },
    data: {
      credentials: {
        ...credentials,
        accessToken: data.access_token,
      },
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

async function ebayApiRequest(
  accessToken: string,
  method: string,
  endpoint: string,
  body?: any
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${EBAY_SANDBOX_API}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Language': 'en-US',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = {};
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

// ========================================
// Test Cases
// ========================================

const tests: Array<{
  name: string;
  run: (ctx: { accessToken: string; sku: string; offerId?: string }) => Promise<{ success: boolean; message: string; details?: any }>;
}> = [
  {
    name: '1. 認証情報確認',
    run: async () => {
      const credentials = await getCredentials();
      if (!credentials) {
        return {
          success: false,
          message: 'eBay認証情報がDBに登録されていません',
          details: { hint: 'POST /api/marketplaces/credentials でeBay認証情報を登録してください' },
        };
      }
      return {
        success: true,
        message: `Client ID: ${credentials.clientId.substring(0, 10)}...`,
      };
    },
  },
  {
    name: '2. アクセストークン取得',
    run: async (ctx) => {
      const credentials = await getCredentials();
      if (!credentials) {
        return { success: false, message: '認証情報なし' };
      }

      const token = await refreshAccessToken(credentials);
      if (!token) {
        return {
          success: false,
          message: 'アクセストークン取得失敗',
          details: { hint: 'Refresh Tokenが無効か期限切れの可能性があります' },
        };
      }

      ctx.accessToken = token;
      return {
        success: true,
        message: 'トークン取得成功',
      };
    },
  },
  {
    name: '3. Sell Account API疎通確認',
    run: async ({ accessToken }) => {
      const result = await ebayApiRequest(accessToken, 'GET', '/sell/account/v1/privilege');

      if (result.ok) {
        return {
          success: true,
          message: 'Sell Account APIへのアクセス成功',
          details: result.data,
        };
      }

      return {
        success: false,
        message: `API呼び出し失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '4. Inventory Item 作成',
    run: async ({ accessToken, sku }) => {
      const result = await ebayApiRequest(
        accessToken,
        'PUT',
        `/sell/inventory/v1/inventory_item/${sku}`,
        {
          product: {
            title: TEST_PRODUCT.title,
            description: TEST_PRODUCT.description,
            imageUrls: TEST_PRODUCT.imageUrls,
          },
          condition: TEST_PRODUCT.condition,
        }
      );

      // 204 No Content or 200 = success
      if (result.ok || result.status === 204) {
        return {
          success: true,
          message: `インベントリアイテム作成成功 (SKU: ${sku})`,
        };
      }

      return {
        success: false,
        message: `作成失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '5. Inventory Item 取得確認',
    run: async ({ accessToken, sku }) => {
      const result = await ebayApiRequest(
        accessToken,
        'GET',
        `/sell/inventory/v1/inventory_item/${sku}`
      );

      if (result.ok) {
        return {
          success: true,
          message: 'インベントリアイテム取得成功',
          details: { sku: result.data.sku, title: result.data.product?.title },
        };
      }

      return {
        success: false,
        message: `取得失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '6. Offer 作成',
    run: async (ctx) => {
      const result = await ebayApiRequest(
        ctx.accessToken,
        'POST',
        '/sell/inventory/v1/offer',
        {
          sku: ctx.sku,
          marketplaceId: 'EBAY_US',
          format: 'FIXED_PRICE',
          categoryId: TEST_PRODUCT.categoryId,
          pricingSummary: {
            price: {
              value: TEST_PRODUCT.price.toString(),
              currency: 'USD',
            },
          },
          availableQuantity: TEST_PRODUCT.quantity,
          listingDescription: TEST_PRODUCT.description,
        }
      );

      if (result.ok && result.data.offerId) {
        ctx.offerId = result.data.offerId;
        return {
          success: true,
          message: `オファー作成成功 (ID: ${result.data.offerId})`,
        };
      }

      // サンドボックスではポリシー未設定エラーがよくある
      if (result.data?.errors?.[0]?.errorId === 25002) {
        return {
          success: false,
          message: 'ポリシー未設定エラー（サンドボックスでは正常）',
          details: {
            hint: 'サンドボックスでFulfillment/Payment/Returnポリシーを設定してください',
            url: 'https://sandbox.ebay.com/epsupport/return-policy/display/return-policy.htm',
          },
        };
      }

      return {
        success: false,
        message: `作成失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '7. Offer 取得確認',
    run: async ({ accessToken, offerId }) => {
      if (!offerId) {
        return { success: false, message: 'オファーIDがありません（前のテストで失敗）' };
      }

      const result = await ebayApiRequest(
        accessToken,
        'GET',
        `/sell/inventory/v1/offer/${offerId}`
      );

      if (result.ok) {
        return {
          success: true,
          message: 'オファー取得成功',
          details: {
            offerId: result.data.offerId,
            status: result.data.status,
            sku: result.data.sku,
          },
        };
      }

      return {
        success: false,
        message: `取得失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '8. Offer 公開（出品）',
    run: async ({ accessToken, offerId }) => {
      if (!offerId) {
        return { success: false, message: 'オファーIDがありません（前のテストで失敗）' };
      }

      const result = await ebayApiRequest(
        accessToken,
        'POST',
        `/sell/inventory/v1/offer/${offerId}/publish`
      );

      if (result.ok && result.data.listingId) {
        return {
          success: true,
          message: `出品成功！ (Listing ID: ${result.data.listingId})`,
          details: {
            listingId: result.data.listingId,
            viewUrl: `https://sandbox.ebay.com/itm/${result.data.listingId}`,
          },
        };
      }

      // 共通エラー: ポリシー未設定
      if (result.data?.errors?.[0]?.errorId === 25002 ||
          result.data?.errors?.[0]?.errorId === 25006) {
        return {
          success: false,
          message: 'ポリシー未設定エラー（サンドボックスでは正常）',
          details: {
            hint: 'Business Policiesを有効化し、ポリシーを設定してください',
            error: result.data.errors?.[0]?.message,
          },
        };
      }

      return {
        success: false,
        message: `出品失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '9. 在庫更新',
    run: async ({ accessToken, sku }) => {
      const result = await ebayApiRequest(
        accessToken,
        'POST',
        `/sell/inventory/v1/inventory_item/${sku}/update_availability`,
        {
          shipToLocationAvailability: {
            quantity: 5,
          },
        }
      );

      // サンドボックスでは在庫ロケーション未設定エラーがよくある
      if (result.ok || result.status === 204) {
        return {
          success: true,
          message: '在庫更新成功 (quantity: 5)',
        };
      }

      if (result.status === 400 && result.data?.errors?.[0]?.errorId === 25001) {
        return {
          success: false,
          message: '在庫ロケーション未設定（サンドボックスでは正常）',
          details: {
            hint: 'Inventory Locationを先に作成する必要があります',
          },
        };
      }

      return {
        success: false,
        message: `更新失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '10. 注文一覧取得',
    run: async ({ accessToken }) => {
      const result = await ebayApiRequest(
        accessToken,
        'GET',
        '/sell/fulfillment/v1/order?limit=5'
      );

      if (result.ok) {
        const orderCount = result.data.orders?.length || 0;
        return {
          success: true,
          message: `注文取得成功 (${orderCount}件)`,
          details: { total: result.data.total || 0 },
        };
      }

      return {
        success: false,
        message: `取得失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '11. カテゴリ検索（Taxonomy API）',
    run: async ({ accessToken }) => {
      const result = await ebayApiRequest(
        accessToken,
        'GET',
        '/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=watch'
      );

      if (result.ok) {
        const suggestions = result.data.categorySuggestions || [];
        return {
          success: true,
          message: `カテゴリ検索成功 (${suggestions.length}件)`,
          details: suggestions.slice(0, 3).map((s: any) => ({
            id: s.category?.categoryId,
            name: s.category?.categoryName,
          })),
        };
      }

      return {
        success: false,
        message: `検索失敗 (${result.status})`,
        details: result.data,
      };
    },
  },
  {
    name: '12. クリーンアップ（Inventory Item削除）',
    run: async ({ accessToken, sku }) => {
      const result = await ebayApiRequest(
        accessToken,
        'DELETE',
        `/sell/inventory/v1/inventory_item/${sku}`
      );

      if (result.ok || result.status === 204) {
        return {
          success: true,
          message: `テストデータ削除成功 (SKU: ${sku})`,
        };
      }

      // 削除失敗は警告レベル
      return {
        success: true, // テスト自体は成功扱い
        message: `削除スキップ (${result.status})`,
        details: result.data,
      };
    },
  },
];

// ========================================
// Main
// ========================================

async function main() {
  console.log('========================================');
  console.log('eBay Sandbox 動作確認スクリプト');
  console.log('========================================\n');
  console.log(`テストSKU: ${TEST_PRODUCT.sku}\n`);

  const context = {
    accessToken: '',
    sku: TEST_PRODUCT.sku,
    offerId: undefined as string | undefined,
  };

  const results: TestResult[] = [];
  let hasFailure = false;

  for (const test of tests) {
    // 前のテストで致命的なエラーがあった場合はスキップ
    if (hasFailure && test.name.includes('Offer') && !context.offerId) {
      const skipResult: TestResult = {
        name: test.name,
        status: 'skip',
        message: '前のテストで失敗したためスキップ',
        duration: 0,
      };
      results.push(skipResult);
      logResult(skipResult);
      continue;
    }

    const result = await runTest(test.name, () => test.run(context));
    results.push(result);
    logResult(result);

    // 認証系の失敗は以降のテストを中止
    if (result.status === 'fail' && (test.name.includes('認証') || test.name.includes('トークン'))) {
      hasFailure = true;
    }

    // テスト間に少し待機（レート制限対策）
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 結果サマリー
  console.log('\n========================================');
  console.log('テスト結果サマリー');
  console.log('========================================');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log(`✅ 成功: ${passed}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`⏭️ スキップ: ${skipped}`);

  // 推奨アクション
  if (failed > 0) {
    console.log('\n========================================');
    console.log('推奨アクション');
    console.log('========================================');

    const hasAuthIssue = results.some(r => r.status === 'fail' && r.name.includes('トークン'));
    const hasPolicyIssue = results.some(r =>
      r.status === 'fail' && r.details?.hint?.includes('ポリシー')
    );

    if (hasAuthIssue) {
      console.log('\n1. 認証の問題:');
      console.log('   - eBay Developer Portalで新しいUser Tokenを取得');
      console.log('   - URL: https://developer.ebay.com/my/auth/?env=sandbox');
    }

    if (hasPolicyIssue) {
      console.log('\n2. ビジネスポリシーの問題:');
      console.log('   - Sandboxでポリシーを設定:');
      console.log('   - Fulfillment: https://sandbox.ebay.com/epsupport/shipping/display/shipping.htm');
      console.log('   - Payment: https://sandbox.ebay.com/epsupport/payment/display/payment.htm');
      console.log('   - Return: https://sandbox.ebay.com/epsupport/return-policy/display/return-policy.htm');
    }
  }

  // DB接続を閉じる
  await prisma.$disconnect();

  // 終了コード
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('実行エラー:', error);
  prisma.$disconnect();
  process.exit(1);
});
