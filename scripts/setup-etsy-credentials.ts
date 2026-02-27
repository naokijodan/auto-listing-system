#!/usr/bin/env npx tsx
/**
 * Etsy認証情報セットアップスクリプト
 *
 * 使用方法:
 *   1. .envファイルに以下を追加:
 *      ETSY_API_KEY=your_etsy_api_key
 *   2. スクリプト実行:
 *      npx tsx scripts/setup-etsy-credentials.ts
 *   3. OAuth認証URLにアクセスして認可コードを取得
 */

import { prisma } from '@rakuda/database';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function setupEtsyCredentials() {
  console.log('='.repeat(60));
  console.log('Etsy認証情報セットアップ');
  console.log('='.repeat(60));

  const apiKey = process.env.ETSY_API_KEY;

  if (!apiKey) {
    console.log('\n❌ エラー: 環境変数が設定されていません');
    console.log('\n.envファイルに以下を追加してください:');
    console.log('  ETSY_API_KEY=your_etsy_api_key');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n[1] 既存のEtsy認証情報を確認...');
  const existing = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'ETSY' },
  });

  if (existing) {
    console.log('  既存の認証情報が見つかりました。更新します...');
    await prisma.marketplaceCredential.update({
      where: { id: existing.id },
      data: {
        credentials: {
          apiKey,
        },
        isActive: true,
      },
    });
    console.log('✅ 認証情報を更新しました');
  } else {
    console.log('  新規作成します...');
    await prisma.marketplaceCredential.create({
      data: {
        marketplace: 'ETSY',
        name: 'default',
        credentials: {
          apiKey,
        },
        isActive: true,
      },
    });
    console.log('✅ 認証情報を作成しました');
  }

  console.log('\n[2] OAuth認証URLを生成...');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  const redirectUri = 'http://localhost:3010/api/etsy/callback';
  const scopes = [
    'listings_r', 'listings_w', 'listings_d',
    'transactions_r', 'transactions_w',
    'shops_r', 'shops_w',
    'profile_r',
    'email_r',
  ].join(' ');

  const authUrl = new URL('https://www.etsy.com/oauth/connect');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', apiKey);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  await prisma.oAuthState.create({
    data: {
      state,
      provider: 'ETSY',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      metadata: { codeVerifier, redirectUri, scopes },
    },
  });
  console.log('✅ OAuthStateをDBに保存しました');

  console.log('\n📋 次のステップ:');
  console.log('  1. APIサーバーを起動: npm run dev');
  console.log('  2. 以下のURLにアクセスしてEtsyで認証:');
  console.log('');
  console.log(`  ${authUrl.toString()}`);
  console.log('');
  console.log('  3. 認証後、コールバックURLにリダイレクトされ、トークンがDBに保存されます');
  console.log('');
  console.log('  🔐 code_verifier（バックアップ）:');
  console.log(`  ${codeVerifier}`);

  await prisma.$disconnect();
  console.log('\n' + '='.repeat(60));
}

setupEtsyCredentials().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});

