#!/usr/bin/env npx tsx
/**
 * Shopify接続テスト（レガシーカスタムアプリ用）
 *
 * レガシーカスタムアプリのアクセストークンをDBに直接保存し、
 * Shopify Admin APIへの接続を検証する。
 *
 * 使い方:
 *   npx tsx scripts/test-shopify-connection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env') });

import { prisma } from '@rakuda/database';

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runStep(name: string, fn: () => Promise<any>): Promise<any> {
  const start = Date.now();
  process.stdout.write(`  ${name}... `);
  try {
    const data = await fn();
    const duration = Date.now() - start;
    results.push({ step: name, success: true, data, duration });
    console.log(`OK (${duration}ms)`);
    return data;
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ step: name, success: false, error: error.message, duration });
    console.log(`FAIL: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  RAKUDA - Shopify接続テスト（レガシーカスタムアプリ）');
  console.log('='.repeat(60));

  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (!shopDomain || !accessToken || !apiKey || !apiSecret) {
    console.error('\n  .envにShopify認証情報が不足しています:');
    console.error('    SHOPIFY_SHOP_DOMAIN, SHOPIFY_ACCESS_TOKEN, SHOPIFY_API_KEY, SHOPIFY_API_SECRET');
    process.exit(1);
  }

  console.log(`\n  Shop: ${shopDomain}`);
  console.log(`  Token: shpat_****${accessToken.slice(-8)}`);
  console.log('');

  try {
    // Step 1: DB接続
    await runStep('DB接続', async () => {
      await prisma.$connect();
      return { connected: true };
    });

    // Step 2: 認証情報をDBに保存（upsert）
    await runStep('認証情報DB保存', async () => {
      const credential = await prisma.marketplaceCredential.upsert({
        where: {
          marketplace_name: { marketplace: 'SHOPIFY', name: 'default' },
        },
        update: {
          credentials: {
            apiKey,
            apiSecret,
            accessToken,
            shop: shopDomain,
            scopes: 'write_products,write_orders,write_inventory,write_shipping,read_locations,write_fulfillments,read_analytics,write_customers',
            apiBase: `https://${shopDomain}/admin/api/2026-01`,
          },
          tokenExpiresAt: null, // レガシーカスタムアプリは永続トークン
          refreshTokenExpiresAt: null,
          isActive: true,
        },
        create: {
          marketplace: 'SHOPIFY',
          name: 'default',
          credentials: {
            apiKey,
            apiSecret,
            accessToken,
            shop: shopDomain,
            scopes: 'write_products,write_orders,write_inventory,write_shipping,read_locations,write_fulfillments,read_analytics,write_customers',
            apiBase: `https://${shopDomain}/admin/api/2026-01`,
          },
          tokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          isActive: true,
        },
      });
      return { id: credential.id, marketplace: credential.marketplace };
    });

    // Step 3: Shop情報取得（API接続テスト）
    const shopInfo = await runStep('Shop情報取得 (GET /shop.json)', async () => {
      const url = `https://${shopDomain}/admin/api/2026-01/shop.json`;
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      const shop = data.shop;
      return {
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        myshopifyDomain: shop.myshopify_domain,
        plan: shop.plan_display_name,
        currency: shop.currency,
        country: shop.country_name,
      };
    });

    console.log(`\n  Shop名: ${shopInfo.name}`);
    console.log(`  ドメイン: ${shopInfo.myshopifyDomain}`);
    console.log(`  プラン: ${shopInfo.plan}`);
    console.log(`  通貨: ${shopInfo.currency}`);
    console.log(`  国: ${shopInfo.country}`);

    // Step 4: 商品一覧取得
    const products = await runStep('商品一覧取得 (GET /products.json)', async () => {
      const url = `https://${shopDomain}/admin/api/2026-01/products.json?limit=5`;
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      return { count: data.products?.length ?? 0, products: data.products ?? [] };
    });

    console.log(`  商品数: ${products.count}件`);

    // Step 5: ロケーション取得
    const locations = await runStep('ロケーション取得 (GET /locations.json)', async () => {
      const url = `https://${shopDomain}/admin/api/2026-01/locations.json`;
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      return {
        count: data.locations?.length ?? 0,
        locations: (data.locations ?? []).map((l: any) => ({
          id: l.id,
          name: l.name,
          active: l.active,
        })),
      };
    });

    console.log(`  ロケーション数: ${locations.count}件`);
    for (const loc of locations.locations) {
      console.log(`    - ${loc.name} (ID: ${loc.id}, active: ${loc.active})`);
    }

    // Step 6: テスト商品作成（draft状態）
    const testProduct = await runStep('テスト商品作成 (POST /products.json)', async () => {
      const url = `https://${shopDomain}/admin/api/2026-01/products.json`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: {
            title: 'RAKUDA Connection Test - DELETE ME',
            body_html: '<p>This is a connection test product created by RAKUDA. Please delete.</p>',
            vendor: 'RAKUDA',
            product_type: 'Test',
            tags: 'rakuda-test, auto-generated',
            status: 'draft',
            variants: [
              {
                price: '0.01',
                sku: 'RAKUDA-TEST-001',
                inventory_quantity: 0,
              },
            ],
          },
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      return {
        id: data.product.id,
        title: data.product.title,
        status: data.product.status,
        handle: data.product.handle,
      };
    });

    console.log(`  作成ID: ${testProduct.id}`);
    console.log(`  ステータス: ${testProduct.status}`);

    // Step 7: テスト商品削除
    await runStep('テスト商品削除 (DELETE /products/:id.json)', async () => {
      const url = `https://${shopDomain}/admin/api/2026-01/products/${testProduct.id}.json`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return { deleted: true };
    });

    // Step 8: Webhook作成テスト（dryrun）
    await runStep('APIスコープ確認', async () => {
      // Access Scopes endpoint
      const url = `https://${shopDomain}/admin/oauth/access_scopes.json`;
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      const data = await response.json();
      const scopes = (data.access_scopes ?? []).map((s: any) => s.handle);
      return { scopes };
    });

  } catch (error: any) {
    // 既にrunStepでログ済み
  } finally {
    await prisma.$disconnect();
  }

  // サマリー
  console.log('\n' + '='.repeat(60));
  console.log('  テスト結果サマリー');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  for (const r of results) {
    const icon = r.success ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`  ${icon} ${r.step} (${r.duration}ms)`);
    if (r.error) {
      console.log(`         ${r.error}`);
    }
  }

  console.log(`\n  合計: ${passed} passed, ${failed} failed (${totalDuration}ms)`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n  Shopify接続テスト全通過。本番出品の準備が整いました。');
  }
}

main();
