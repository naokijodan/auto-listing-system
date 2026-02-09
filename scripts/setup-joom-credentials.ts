#!/usr/bin/env npx tsx
/**
 * Joom認証情報セットアップスクリプト
 *
 * 使用方法:
 *   1. .envファイルに以下を追加:
 *      JOOM_CLIENT_ID=your_client_id
 *      JOOM_CLIENT_SECRET=your_client_secret
 *   2. スクリプト実行:
 *      npx tsx scripts/setup-joom-credentials.ts
 *   3. OAuth認証URLにアクセスしてトークンを取得
 */

import { prisma } from '@rakuda/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupJoomCredentials() {
  console.log('='.repeat(60));
  console.log('Joom認証情報セットアップ');
  console.log('='.repeat(60));

  const clientId = process.env.JOOM_CLIENT_ID;
  const clientSecret = process.env.JOOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('\n❌ エラー: 環境変数が設定されていません');
    console.log('\n.envファイルに以下を追加してください:');
    console.log('  JOOM_CLIENT_ID=your_client_id');
    console.log('  JOOM_CLIENT_SECRET=your_client_secret');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n[1] 既存のJoom認証情報を確認...');
  const existing = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'JOOM' },
  });

  if (existing) {
    console.log('  既存の認証情報が見つかりました。更新します...');
    await prisma.marketplaceCredential.update({
      where: { id: existing.id },
      data: {
        credentials: {
          clientId,
          clientSecret,
        },
        isActive: true,
      },
    });
    console.log('✅ 認証情報を更新しました');
  } else {
    console.log('  新規作成します...');
    await prisma.marketplaceCredential.create({
      data: {
        marketplace: 'JOOM',
        name: 'default',
        credentials: {
          clientId,
          clientSecret,
        },
        isActive: true,
      },
    });
    console.log('✅ 認証情報を作成しました');
  }

  console.log('\n[2] OAuth認証URLを生成...');
  const redirectUri = process.env.JOOM_REDIRECT_URI || 'http://localhost:3000/api/auth/joom/callback';
  const authUrl = new URL('https://api-merchant.joom.com/api/v2/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', 'manual_setup');

  console.log('\n📋 次のステップ:');
  console.log('  1. APIサーバーを起動: npm run dev');
  console.log('  2. 以下のURLにアクセスしてJoomで認証:');
  console.log('');
  console.log(`  ${authUrl.toString()}`);
  console.log('');
  console.log('  3. 認証後、コールバックURLにリダイレクトされ、トークンがDBに保存されます');
  console.log('');
  console.log('  または、APIエンドポイントを使用:');
  console.log('  GET http://localhost:3000/api/auth/joom/authorize');

  await prisma.$disconnect();
  console.log('\n' + '='.repeat(60));
}

setupJoomCredentials().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
