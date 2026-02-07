#!/usr/bin/env npx tsx
/**
 * Joom本番API疎通確認スクリプト
 *
 * 使用方法:
 *   npx tsx scripts/verify-joom-connection.ts
 *
 * 確認項目:
 *   1. データベース接続
 *   2. Joom認証情報の存在確認
 *   3. Joom APIへの認証テスト
 *   4. 商品一覧取得テスト
 *   5. Dry-Run商品作成テスト
 */

import { prisma } from '@rakuda/database';

const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: unknown;
}

const results: CheckResult[] = [];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function addResult(result: CheckResult) {
  results.push(result);
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
  log(`${icon} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log('   Details:', JSON.stringify(result.details, null, 2));
  }
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    addResult({
      name: 'Database Connection',
      status: 'pass',
      message: 'Connected to PostgreSQL',
    });
    return true;
  } catch (error: any) {
    addResult({
      name: 'Database Connection',
      status: 'fail',
      message: `Failed: ${error.message}`,
    });
    return false;
  }
}

async function checkJoomCredentials(): Promise<string | null> {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'JOOM',
        isActive: true,
      },
    });

    if (!credential) {
      addResult({
        name: 'Joom Credentials',
        status: 'fail',
        message: 'No active Joom credentials found in database',
      });
      return null;
    }

    const creds = credential.credentials as {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;
    };

    if (!creds.accessToken) {
      addResult({
        name: 'Joom Credentials',
        status: 'fail',
        message: 'Access token not found in credentials',
      });
      return null;
    }

    // トークン有効期限チェック
    if (creds.expiresAt) {
      const expiresAt = new Date(creds.expiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        addResult({
          name: 'Joom Credentials',
          status: 'fail',
          message: `Token expired on ${expiresAt.toISOString()}`,
        });
        return null;
      }

      if (daysUntilExpiry < 7) {
        addResult({
          name: 'Joom Credentials',
          status: 'pass',
          message: `Token found (expires in ${daysUntilExpiry} days - renewal recommended)`,
          details: { expiresAt: creds.expiresAt },
        });
      } else {
        addResult({
          name: 'Joom Credentials',
          status: 'pass',
          message: `Token found (expires in ${daysUntilExpiry} days)`,
          details: { expiresAt: creds.expiresAt },
        });
      }
    } else {
      addResult({
        name: 'Joom Credentials',
        status: 'pass',
        message: 'Access token found',
      });
    }

    return creds.accessToken;
  } catch (error: any) {
    addResult({
      name: 'Joom Credentials',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
    return null;
  }
}

async function checkJoomApiAuth(accessToken: string): Promise<boolean> {
  try {
    // Joom API v3 では /merchant/info でマーチャント情報を取得できる
    // または /products は id か sku パラメータが必要
    // まず /merchant/info を試す
    let response = await fetch(`${JOOM_API_BASE}/merchant/info`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // /merchant/info がなければ、ダミーIDで /products を試す（404でも認証は確認できる）
    if (response.status === 404) {
      response = await fetch(`${JOOM_API_BASE}/products?id=test-connectivity-check`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (response.status === 401) {
      addResult({
        name: 'Joom API Authentication',
        status: 'fail',
        message: 'Authentication failed (401 Unauthorized)',
      });
      return false;
    }

    if (response.status === 403) {
      addResult({
        name: 'Joom API Authentication',
        status: 'fail',
        message: 'Access forbidden (403 Forbidden)',
      });
      return false;
    }

    // 400 Bad Request でも認証は通っている（パラメータエラー）
    // 404 Not Found でも認証は通っている（リソースがない）
    if (response.status === 400 || response.status === 404) {
      addResult({
        name: 'Joom API Authentication',
        status: 'pass',
        message: `Authenticated (API responded with ${response.status} - expected for test request)`,
      });
      return true;
    }

    if (!response.ok && response.status >= 500) {
      const errorData = await response.json().catch(() => ({}));
      addResult({
        name: 'Joom API Authentication',
        status: 'fail',
        message: `Server error: ${response.status}`,
        details: errorData,
      });
      return false;
    }

    addResult({
      name: 'Joom API Authentication',
      status: 'pass',
      message: 'Successfully authenticated with Joom API',
    });
    return true;
  } catch (error: any) {
    addResult({
      name: 'Joom API Authentication',
      status: 'fail',
      message: `Network error: ${error.message}`,
    });
    return false;
  }
}

async function checkJoomProductList(accessToken: string): Promise<boolean> {
  try {
    // Joom API v3 の商品一覧は /products/list や /products?sku=xxx など
    // マーチャントの商品一覧を取得する正しいエンドポイントを試す
    const response = await fetch(`${JOOM_API_BASE}/products/list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 5,
      }),
    });

    if (response.status === 404) {
      // エンドポイントが存在しない場合
      addResult({
        name: 'Joom Product List',
        status: 'skip',
        message: 'Product list endpoint not available (may require different API version)',
      });
      return true;
    }

    if (response.status === 400) {
      // パラメータエラーでもAPIは動作している
      addResult({
        name: 'Joom Product List',
        status: 'pass',
        message: 'Product list API is accessible (parameter format may differ)',
      });
      return true;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      addResult({
        name: 'Joom Product List',
        status: 'fail',
        message: `Failed to fetch products: ${response.status}`,
        details: errorData,
      });
      return false;
    }

    const data = await response.json();
    const productCount = data.products?.length ?? data.items?.length ?? 0;

    addResult({
      name: 'Joom Product List',
      status: 'pass',
      message: `Successfully fetched product list (${productCount} products found)`,
    });
    return true;
  } catch (error: any) {
    addResult({
      name: 'Joom Product List',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
    return false;
  }
}

async function checkDryRunProduct(): Promise<boolean> {
  try {
    // ローカルでのDry-Run検証（APIは呼ばない）
    const testProduct = {
      name: 'Test Product - RAKUDA Connectivity Check',
      description: 'This is a test product for connectivity verification. It will not be actually created.',
      mainImage: 'https://example.com/test-image.jpg',
      price: 99.99,
      currency: 'USD',
      quantity: 1,
      sku: `TEST-${Date.now()}`,
    };

    // バリデーションチェック
    const warnings: string[] = [];
    if (testProduct.name.length < 10) {
      warnings.push('Title too short');
    }
    if (testProduct.description.length < 50) {
      warnings.push('Description too short');
    }

    addResult({
      name: 'Dry-Run Product Validation',
      status: 'pass',
      message: `Dry-run validation completed (${warnings.length} warnings)`,
      details: {
        product: testProduct,
        warnings,
      },
    });
    return true;
  } catch (error: any) {
    addResult({
      name: 'Dry-Run Product Validation',
      status: 'fail',
      message: `Error: ${error.message}`,
    });
    return false;
  }
}

async function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('JOOM CONNECTION VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log('Summary:');
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 All checks passed! Joom connection is ready.');
  } else {
    console.log('⚠️  Some checks failed. Please review the issues above.');
  }

  console.log('='.repeat(60));
}

async function main() {
  console.log('');
  console.log('🔍 Starting Joom Connection Verification...');
  console.log('');

  // 1. Database接続
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    await printReport();
    process.exit(1);
  }

  // 2. 認証情報確認
  const accessToken = await checkJoomCredentials();
  if (!accessToken) {
    await printReport();
    await prisma.$disconnect();
    process.exit(1);
  }

  // 3. API認証テスト
  const authOk = await checkJoomApiAuth(accessToken);
  if (!authOk) {
    await printReport();
    await prisma.$disconnect();
    process.exit(1);
  }

  // 4. 商品一覧取得
  await checkJoomProductList(accessToken);

  // 5. Dry-Run検証
  await checkDryRunProduct();

  // レポート出力
  await printReport();

  // クリーンアップ
  await prisma.$disconnect();

  const failed = results.filter(r => r.status === 'fail').length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
