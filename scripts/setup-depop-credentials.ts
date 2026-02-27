#!/usr/bin/env npx tsx
/**
 * Depop認証情報セットアップスクリプト
 *
 * 使用方法:
 *   1. .envファイルに以下を追加:
 *      DEPOP_API_KEY=your_depop_api_key
 *   2. スクリプト実行:
 *      npx tsx scripts/setup-depop-credentials.ts
 *   3. 接続テストの結果を確認
 */

import { prisma } from '@rakuda/database';
import * as dotenv from 'dotenv';
import { DepopApiClient } from '../apps/worker/src/lib/depop-api';

dotenv.config();

async function setupDepopCredentials() {
  console.log('='.repeat(60));
  console.log('Depop認証情報セットアップ');
  console.log('='.repeat(60));

  const apiKey = process.env.DEPOP_API_KEY;

  if (!apiKey) {
    console.log('\n❌ エラー: 環境変数が設定されていません');
    console.log('\n.envファイルに以下を追加してください:');
    console.log('  DEPOP_API_KEY=your_depop_api_key');
    console.log('\n📋 Depop APIキーの入手方法:');
    console.log('  Depop Partner PortalでAPIパートナー申請を行い、承認後にAPIキーを取得してください。');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n[1] 既存のDepop認証情報を確認...');
  const existing = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'DEPOP' },
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
        marketplace: 'DEPOP',
        name: 'default',
        credentials: {
          apiKey,
        },
        isActive: true,
      },
    });
    console.log('✅ 認証情報を作成しました');
  }

  console.log('\n[2] 接続テストを実行...');
  try {
    const client = new DepopApiClient();
    const ok = await client.testConnection();
    if (ok) {
      console.log('✅ Depop APIへの接続に成功しました');
    } else {
      console.log('⚠️ Depop API接続に失敗しました。APIキーと権限をご確認ください。');
    }
  } catch (error: any) {
    console.log('❌ 接続テスト中にエラーが発生しました:', error.message);
  }

  console.log('\n📋 次のステップ:');
  console.log('  - Depop Partner PortalでAPIパートナー申請を行い、APIキーを取得');
  console.log('  - 取得したAPIキーを.envのDEPOP_API_KEYに設定');
  console.log('  - 必要に応じて出品/注文の機能をテスト');

  await prisma.$disconnect();
  console.log('\n' + '='.repeat(60));
}

setupDepopCredentials().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});

