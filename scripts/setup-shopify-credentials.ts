#!/usr/bin/env npx tsx

import { prisma } from '@rakuda/database';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function setupShopifyCredentials() {
  console.log('='.repeat(60));
  console.log('Shopify認証情報セットアップ');
  console.log('='.repeat(60));

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.log('\n❌ エラー: 環境変数が設定されていません');
    console.log('\n.envファイルに以下を追加してください:');
    console.log('  SHOPIFY_API_KEY=your_api_key');
    console.log('  SHOPIFY_API_SECRET=your_api_secret');
    await prisma.$disconnect();
    process.exit(1);
  }

  const shopArg = process.argv[2];
  if (!shopArg || !shopArg.endsWith('.myshopify.com')) {
    console.log('\n❌ エラー: ショップドメインを指定してください (.myshopify.com 必須)');
    console.log('\n使用例:');
    console.log('  npx tsx scripts/setup-shopify-credentials.ts your-shop.myshopify.com');
    await prisma.$disconnect();
    process.exit(1);
  }

  const shop = shopArg.toLowerCase();

  console.log('\n[1] 既存のShopify認証情報を確認...');
  const existing = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'SHOPIFY' },
  });

  if (existing) {
    console.log('  既存の認証情報が見つかりました。更新します...');
    await prisma.marketplaceCredential.update({
      where: { id: existing.id },
      data: {
        credentials: {
          apiKey,
          apiSecret,
          shop,
        },
        isActive: true,
      },
    });
    console.log('✅ 認証情報を更新しました');
  } else {
    console.log('  新規作成します...');
    await prisma.marketplaceCredential.create({
      data: {
        marketplace: 'SHOPIFY',
        name: 'default',
        credentials: {
          apiKey,
          apiSecret,
          shop,
        },
        isActive: true,
      },
    });
    console.log('✅ 認証情報を作成しました');
  }

  console.log('\n[2] OAuth認証URLを生成...');
  const state = crypto.randomBytes(16).toString('hex');
  const scopes = 'read_products,write_products,read_inventory,write_inventory,read_orders,write_orders';
  const redirectUri = 'http://localhost:3010/api/shopify/callback';
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', apiKey);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  await prisma.oAuthState.create({
    data: {
      state,
      provider: 'SHOPIFY',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata: { shop, scopes, redirectUri },
    },
  });
  console.log('✅ OAuthStateをDBに保存しました');

  console.log('\n📋 次のステップ:');
  console.log('  1. APIサーバーを起動: npm run dev');
  console.log('  2. 以下のURLにアクセスしてShopifyで認証:');
  console.log('');
  console.log(`  ${authUrl.toString()}`);
  console.log('');
  console.log('  3. 認証後、コールバックURLにリダイレクトされ、トークンがDBに保存されます');

  await prisma.$disconnect();
  console.log('\n' + '='.repeat(60));
}

setupShopifyCredentials().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});

