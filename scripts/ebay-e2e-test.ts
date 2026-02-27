/**
 * RAKUDA - eBay E2E テストスクリプト
 *
 * テスト商品1件でSandbox環境のフルフローを確認:
 *   商品作成 → 翻訳 → eBay出品 → 確認
 *
 * 前提条件:
 *   - Docker containers (postgres, redis, minio) が起動中
 *   - eBay Sandbox OAuth が完了済み (.env に認証情報設定済み)
 *   - ビジネスポリシーが作成済み
 *
 * 使い方:
 *   npx tsx scripts/ebay-e2e-test.ts
 *   npx tsx scripts/ebay-e2e-test.ts --dry-run  (API呼び出しなしで検証のみ)
 *   npx tsx scripts/ebay-e2e-test.ts --cleanup   (テストデータを削除)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// .env 読み込み
config({ path: resolve(__dirname, '..', '.env') });

const API_BASE = `http://localhost:${process.env.API_PORT || 3010}`;
const DRY_RUN = process.argv.includes('--dry-run');
const CLEANUP = process.argv.includes('--cleanup');

// テスト商品データ（メルカリの架空商品をシミュレート）
const TEST_PRODUCT = {
  sourceType: 'mercari',
  sourceItemId: `e2e-test-${Date.now()}`,
  sourceUrl: 'https://jp.mercari.com/item/e2e-test-item',
  title: 'セイコー プレザージュ 自動巻き 腕時計 SARX055',
  description: 'セイコー プレザージュ SARX055 自動巻き腕時計です。目立つ傷なく良い状態です。箱、保証書付き。ケース径40.5mm、ステンレススチール。',
  price: 45000,
  images: [
    'https://static.mercdn.net/item/detail/orig/photos/m12345678_1.jpg',
    'https://static.mercdn.net/item/detail/orig/photos/m12345678_2.jpg',
  ],
  category: '腕時計',
  brand: 'SEIKO',
  condition: 'USED',
  weight: 300,
  sellerId: 'e2e-test-seller',
  sellerName: 'E2E Test Seller',
};

interface StepResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

const results: StepResult[] = [];

async function apiCall(
  method: string,
  path: string,
  body?: any,
  expectedStatuses: number[] = [200, 201, 202]
): Promise<{ status: number; data: any }> {
  const url = `${API_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.API_KEY ? { 'X-API-Key': process.env.API_KEY } : {}),
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `API ${method} ${path} returned ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return { status: response.status, data };
}

async function runStep(
  name: string,
  fn: () => Promise<any>
): Promise<any> {
  const start = Date.now();
  console.log(`\n--- ${name} ---`);

  try {
    const data = await fn();
    const duration = Date.now() - start;
    results.push({ step: name, success: true, data, duration });
    console.log(`  OK (${duration}ms)`);
    return data;
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ step: name, success: false, error: error.message, duration });
    console.error(`  FAILED: ${error.message}`);
    throw error;
  }
}

async function checkPrerequisites(): Promise<void> {
  await runStep('APIヘルスチェック', async () => {
    const { data } = await apiCall('GET', '/api/health', undefined, [200]);
    if (data.status !== 'ok' && data.status !== 'healthy') {
      throw new Error(`API not healthy: ${JSON.stringify(data)}`);
    }
    return data;
  });

  await runStep('eBay認証状態確認', async () => {
    const { data } = await apiCall('GET', '/api/ebay/status', undefined, [200]);
    if (!data.connected) {
      throw new Error(
        'eBay未接続。先にOAuthフローを完了してください:\n' +
        '  1. npm run dev\n' +
        '  2. ブラウザで http://localhost:3000/api/ebay/auth を開く\n' +
        '  3. eBay Sandboxアカウントでログイン'
      );
    }
    if (data.isExpired) {
      console.log('  Token expired, refreshing...');
      await apiCall('POST', '/api/ebay/refresh', undefined, [200]);
    }
    return data;
  });
}

async function createProduct(): Promise<string> {
  const result = await runStep('商品作成 (Chrome拡張シミュレート)', async () => {
    const { data } = await apiCall('POST', '/api/products', TEST_PRODUCT);

    if (!data.success || !data.data?.id) {
      throw new Error(`Product creation failed: ${JSON.stringify(data)}`);
    }

    console.log(`  Product ID: ${data.data.id}`);
    console.log(`  Title: ${data.data.title}`);
    console.log(`  Price: ¥${data.data.price}`);
    return data.data;
  });

  return result.id;
}

async function waitForEnrichment(productId: string): Promise<string> {
  // まずエンリッチメントタスクを作成
  const task = await runStep('エンリッチメントタスク作成', async () => {
    const { data } = await apiCall('POST', '/api/enrichment/tasks', {
      productId,
      priority: 0,
      async: true,
    });
    console.log(`  Task ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);
    return data;
  });

  // エンリッチメント完了を待機
  const enrichmentResult = await runStep(
    'エンリッチメント完了待機 (翻訳・属性抽出)',
    async () => {
      const maxWait = 120_000; // 2分
      const pollInterval = 3_000; // 3秒
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const { data } = await apiCall(
          'GET',
          `/api/enrichment/tasks/${task.id}`,
          undefined,
          [200]
        );

        console.log(`  Status: ${data.status} (${Math.round((Date.now() - startTime) / 1000)}s)`);

        if (data.status === 'READY_TO_REVIEW' || data.status === 'APPROVED') {
          console.log(`  Title (EN): ${data.translations?.en?.title || 'N/A'}`);
          console.log(`  Price (USD): $${data.pricing?.finalPriceUsd || 'N/A'}`);
          return { id: data.id, status: data.status };
        }

        if (data.status === 'FAILED') {
          throw new Error(`Enrichment failed: ${data.errorMessage || 'Unknown error'}`);
        }

        await new Promise((r) => setTimeout(r, pollInterval));
      }

      throw new Error('Enrichment timed out after 2 minutes');
    }
  );

  // 自動承認されていない場合のみ承認ステップ実行
  if (enrichmentResult.status === 'READY_TO_REVIEW') {
    await runStep('エンリッチメントタスク承認', async () => {
      const { data } = await apiCall(
        'POST',
        `/api/enrichment/tasks/${enrichmentResult.id}/approve`,
        undefined,
        [200]
      );
      console.log(`  Status: ${data.status || 'APPROVED'}`);
      return data;
    });
  } else {
    console.log(`\n--- エンリッチメントタスク承認 ---`);
    console.log(`  スキップ (自動承認済み: ${enrichmentResult.status})`);
  }

  return enrichmentResult.id;
}

async function createAndPublishListing(
  productId: string,
  enrichmentTaskId: string
): Promise<{ listingId: string; jobId?: string }> {
  // eBayリスティング作成
  const listing = await runStep('eBayリスティング作成 (DRAFT)', async () => {
    const { data } = await apiCall('POST', '/api/ebay-listings/listings', {
      productId,
      categoryId: '31387', // Wristwatches (Sandbox用デフォルト)
      conditionId: '3000', // Used
      quantity: 1,
      itemSpecifics: {
        'Type': ['Wristwatch'],
        'Brand': ['Seiko'],
        'Model': ['Presage SARX055'],
        'Movement': ['Automatic'],
        'Case Material': ['Stainless Steel'],
        'Case Size': ['40.5 mm'],
        'Department': ['Men'],
      },
    });

    if (!data.id) {
      throw new Error(`Listing creation failed: ${JSON.stringify(data)}`);
    }

    console.log(`  Listing ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Price: $${data.listingPrice}`);
    return data;
  });

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] 出品スキップ - eBay APIは呼ばれません');
    return { listingId: listing.id };
  }

  // プレビュー（バリデーション）
  await runStep('出品プレビュー (バリデーション)', async () => {
    const { data } = await apiCall(
      'POST',
      `/api/ebay-listings/listings/${listing.id}/preview`,
      undefined,
      [200]
    );

    if (data.validation?.errors?.length > 0) {
      console.log(`  Warnings: ${JSON.stringify(data.validation.warnings)}`);
      throw new Error(`Validation errors: ${JSON.stringify(data.validation.errors)}`);
    }

    console.log(`  Valid: ${data.validation?.isValid ?? 'N/A'}`);
    if (data.estimatedFees) {
      console.log(`  Estimated fees: $${data.estimatedFees.total}`);
    }
    return data;
  });

  // 出品実行
  const publishResult = await runStep('eBay Sandbox に出品', async () => {
    const { data } = await apiCall(
      'POST',
      `/api/ebay-listings/listings/${listing.id}/publish`,
      undefined,
      [200, 202]
    );

    console.log(`  Job ID: ${data.jobId || 'N/A'}`);
    console.log(`  Status: ${data.status}`);
    return data;
  });

  // 出品完了待機
  await runStep('出品完了待機', async () => {
    const maxWait = 60_000; // 1分
    const pollInterval = 5_000; // 5秒
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const { data } = await apiCall(
        'GET',
        `/api/ebay-listings/listings/${listing.id}`,
        undefined,
        [200]
      );

      console.log(`  Status: ${data.status} (${Math.round((Date.now() - startTime) / 1000)}s)`);

      if (data.status === 'ACTIVE') {
        console.log(`  eBay Item ID: ${data.marketplaceListingId}`);
        console.log(`  eBay URL: https://www.sandbox.ebay.com/itm/${data.marketplaceListingId}`);
        return data;
      }

      if (data.status === 'ERROR') {
        throw new Error(`Publishing failed: ${data.errorMessage || 'Unknown error'}`);
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    throw new Error('Publishing timed out after 1 minute');
  });

  return { listingId: listing.id, jobId: publishResult.jobId };
}

async function cleanup(productId?: string, listingId?: string): Promise<void> {
  if (listingId) {
    await runStep('リスティング削除', async () => {
      try {
        await apiCall('DELETE', `/api/ebay-listings/listings/${listingId}`, undefined, [200, 204, 404]);
        return { deleted: true };
      } catch {
        console.log('  (スキップ - リスティングが見つからない)');
        return { deleted: false };
      }
    });
  }

  if (productId) {
    await runStep('テスト商品削除', async () => {
      try {
        await apiCall('DELETE', `/api/products/${productId}`, undefined, [200, 204, 404]);
        return { deleted: true };
      } catch {
        console.log('  (スキップ - 商品が見つからない)');
        return { deleted: false };
      }
    });
  }
}

function printSummary(): void {
  console.log('\n========================================');
  console.log('  eBay E2E テスト結果サマリー');
  console.log('========================================\n');

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  for (const r of results) {
    const icon = r.success ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`  ${icon} ${r.step} (${r.duration}ms)`);
    if (r.error) {
      console.log(`         ${r.error}`);
    }
  }

  console.log(`\n  合計: ${passed} passed, ${failed} failed (${totalDuration}ms)`);

  if (DRY_RUN) {
    console.log('\n  [DRY RUN モード] 実際のeBay APIは呼ばれていません');
  }

  if (failed > 0) {
    console.log('\n  一部のステップが失敗しました。上記のエラーを確認してください。');
    process.exit(1);
  } else {
    console.log('\n  全ステップ成功');
  }
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  RAKUDA - eBay E2E Test');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : CLEANUP ? 'CLEANUP' : 'FULL'}`);
  console.log(`  API: ${API_BASE}`);
  console.log(`  Sandbox: ${process.env.EBAY_ENV || process.env.EBAY_SANDBOX || 'not set'}`);
  console.log('========================================');

  let productId: string | undefined;
  let listingId: string | undefined;

  try {
    // 前提条件チェック
    await checkPrerequisites();

    if (CLEANUP) {
      // クリーンアップモード: テストデータの検索と削除
      console.log('\n  クリーンアップモード: e2e-testデータを検索中...');
      const { data } = await apiCall(
        'GET',
        '/api/products?search=e2e-test&limit=10',
        undefined,
        [200]
      );
      if (data.data?.length > 0) {
        for (const product of data.data) {
          console.log(`  削除対象: ${product.id} - ${product.title}`);
          await cleanup(product.id);
        }
      } else {
        console.log('  テストデータなし');
      }
      printSummary();
      return;
    }

    // Step 1: 商品作成
    productId = await createProduct();

    // Step 2: エンリッチメント（翻訳・属性抽出）
    const enrichmentTaskId = await waitForEnrichment(productId);

    // Step 3: eBay出品
    const { listingId: lid } = await createAndPublishListing(productId, enrichmentTaskId);
    listingId = lid;

    // 結果表示
    printSummary();
  } catch (error: any) {
    console.error(`\nFATAL: ${error.message}`);
    printSummary();
    process.exit(1);
  }
}

main();
