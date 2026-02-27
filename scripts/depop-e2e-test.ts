/**
 * RAKUDA - Depop E2E テストスクリプト
 *
 * テスト商品1件でDepop出品フローを確認:
 *   認証確認 → 商品作成 → 翻訳 → Depop出品 → 確認
 *
 * 前提条件:
 *   - Docker containers (postgres, redis, minio) が起動中
 *   - Depop APIキーが設定済み
 *
 * 使い方:
 *   npx tsx scripts/depop-e2e-test.ts
 *   npx tsx scripts/depop-e2e-test.ts --dry-run  (API呼び出しなしで検証のみ)
 *   npx tsx scripts/depop-e2e-test.ts --cleanup   (テストデータを削除)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env') });

const API_BASE = `http://localhost:${process.env.API_PORT || 3010}`;
const DRY_RUN = process.argv.includes('--dry-run');
const CLEANUP = process.argv.includes('--cleanup');

const TEST_PRODUCT = {
  sourceType: 'mercari',
  sourceItemId: `e2e-depop-${Date.now()}`,
  sourceUrl: 'https://jp.mercari.com/item/e2e-test-depop',
  title: 'ナイキ エアジョーダン1 レトロ ハイ OG シカゴ 2015',
  description: 'ナイキ エアジョーダン1 レトロ ハイ OG シカゴ 2015年復刻モデルです。着用5回程度、ソール減り少なめ。サイズ27cm。箱・タグ付き。',
  price: 55000,
  images: [
    'https://static.mercdn.net/item/detail/orig/photos/m11223344_1.jpg',
    'https://static.mercdn.net/item/detail/orig/photos/m11223344_2.jpg',
  ],
  category: 'スニーカー',
  brand: 'NIKE',
  condition: 'USED',
  weight: 500,
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
    headers: { 'Content-Type': 'application/json' },
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

async function runStep(name: string, fn: () => Promise<any>): Promise<any> {
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

  await runStep('Depop認証状態確認', async () => {
    const { data } = await apiCall('GET', '/api/depop/settings', undefined, [200]);
    if (!data.apiKey && !data.isConfigured) {
      throw new Error(
        'Depop APIキー未設定。先にセットアップを完了してください:\n' +
        '  1. npx tsx scripts/setup-depop-credentials.ts\n' +
        '  2. .envにDEPOP_API_KEYを設定'
      );
    }
    return data;
  });

  await runStep('Depop接続テスト', async () => {
    const { data } = await apiCall(
      'POST',
      '/api/depop/settings/test-connection',
      undefined,
      [200]
    );
    if (!data.success) {
      throw new Error(`Depop API接続失敗: ${data.error || 'Unknown error'}`);
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

  const enrichmentResult = await runStep(
    'エンリッチメント完了待機 (翻訳・属性抽出)',
    async () => {
      const maxWait = 120_000;
      const pollInterval = 3_000;
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

  if (enrichmentResult.status === 'READY_TO_REVIEW') {
    await runStep('エンリッチメントタスク承認', async () => {
      const { data } = await apiCall(
        'POST',
        `/api/enrichment/tasks/${enrichmentResult.id}/approve`,
        undefined,
        [200]
      );
      return data;
    });
  }

  return enrichmentResult.id;
}

async function publishToDepop(productId: string): Promise<void> {
  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Depop出品スキップ - APIは呼ばれません');
    return;
  }

  await runStep('Depop出品実行', async () => {
    const { data } = await apiCall(
      'POST',
      '/api/depop/publish',
      { productId },
      [200, 202]
    );

    console.log(`  Job ID: ${data.jobId || 'N/A'}`);
    console.log(`  Listing ID: ${data.listingId || 'N/A'}`);
    return data;
  });

  await runStep('Depop出品完了待機', async () => {
    const maxWait = 60_000;
    const pollInterval = 5_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const { data: listData } = await apiCall(
        'GET',
        `/api/depop/listings?productId=${productId}`,
        undefined,
        [200]
      );

      const listing = listData.listings?.[0];
      if (!listing) {
        console.log(`  Listing not found yet (${Math.round((Date.now() - startTime) / 1000)}s)`);
        await new Promise((r) => setTimeout(r, pollInterval));
        continue;
      }

      console.log(`  Status: ${listing.status} (${Math.round((Date.now() - startTime) / 1000)}s)`);

      if (listing.status === 'ACTIVE') {
        console.log(`  Depop Product ID: ${listing.depopProductId || 'N/A'}`);
        return listing;
      }

      if (listing.status === 'ERROR') {
        throw new Error(`Publishing failed: ${listing.errorMessage || 'Unknown error'}`);
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    throw new Error('Publishing timed out after 1 minute');
  });
}

async function cleanup(productId?: string): Promise<void> {
  if (productId) {
    await runStep('テスト商品削除', async () => {
      try {
        await apiCall('DELETE', `/api/products/${productId}`, undefined, [200, 204, 404]);
        return { deleted: true };
      } catch {
        console.log('  (スキップ)');
        return { deleted: false };
      }
    });
  }
}

function printSummary(): void {
  console.log('\n========================================');
  console.log('  Depop E2E テスト結果サマリー');
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
    console.log('\n  [DRY RUN モード] 実際のDepop APIは呼ばれていません');
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
  console.log('  RAKUDA - Depop E2E Test');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : CLEANUP ? 'CLEANUP' : 'FULL'}`);
  console.log(`  API: ${API_BASE}`);
  console.log('========================================');

  let productId: string | undefined;

  try {
    await checkPrerequisites();

    if (CLEANUP) {
      console.log('\n  クリーンアップモード: e2e-depopデータを検索中...');
      const { data } = await apiCall(
        'GET',
        '/api/products?search=e2e-depop&limit=10',
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

    productId = await createProduct();
    await waitForEnrichment(productId);
    await publishToDepop(productId);
    printSummary();
  } catch (error: any) {
    console.error(`\nFATAL: ${error.message}`);
    printSummary();
    process.exit(1);
  }
}

main();
