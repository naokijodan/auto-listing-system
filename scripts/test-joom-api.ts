#!/usr/bin/env npx tsx
/**
 * Phase 41-B: Joom API接続テスト
 */

import { prisma } from '@rakuda/database';

const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3';

async function testJoomApi() {
  console.log('='.repeat(60));
  console.log('Phase 41-B: Joom API接続テスト');
  console.log('='.repeat(60));

  // 1. 認証情報取得
  console.log('\n[1] 認証情報を取得...');
  const credential = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'JOOM', isActive: true }
  });

  if (!credential) {
    console.log('❌ Joom認証情報が見つかりません');
    await prisma.$disconnect();
    return;
  }

  const creds = credential.credentials as any;
  console.log('✅ 認証情報を取得しました');
  console.log('  - Token長:', creds.accessToken?.length || 0);

  // 2. API接続テスト (POST /products/get でテスト - Joom v3形式)
  console.log('\n[2] API接続テスト...');
  try {
    // Joom v3 APIはPOSTベースのRPC形式を使用
    const response = await fetch(`${JOOM_API_BASE}/products/get`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ limit: 1 }),
    });

    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API接続成功');
      console.log('  - Response:', JSON.stringify(data).slice(0, 200));
    } else {
      const errorText = await response.text();
      console.log('❌ API接続失敗');
      console.log('  - Error:', errorText.slice(0, 500));

      // 401の場合はトークン更新が必要
      if (response.status === 401) {
        console.log('\n⚠️ トークンが無効または期限切れです');
        console.log('   リフレッシュトークンで更新を試みます...');

        if (creds.refreshToken) {
          await refreshToken(creds);
        } else {
          console.log('❌ リフレッシュトークンがありません。再認証が必要です。');
        }
      }
    }
  } catch (error: any) {
    console.log('❌ ネットワークエラー:', error.message);
  }

  await prisma.$disconnect();
  console.log('\n' + '='.repeat(60));
}

async function refreshToken(creds: any) {
  console.log('\n[3] トークン更新...');

  // Joom OAuth token refresh
  const tokenUrl = 'https://api-merchant.joom.com/api/v3/oauth/token';

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
        client_id: creds.clientId || process.env.JOOM_CLIENT_ID || '',
        client_secret: creds.clientSecret || process.env.JOOM_CLIENT_SECRET || '',
      }).toString(),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ トークン更新成功');

      // DBを更新
      await prisma.marketplaceCredential.updateMany({
        where: { marketplace: 'JOOM' },
        data: {
          credentials: {
            ...creds,
            accessToken: data.access_token,
            refreshToken: data.refresh_token || creds.refreshToken,
            expiresAt: data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000).toISOString()
              : null,
          },
        },
      });
      console.log('✅ DB更新完了');
    } else {
      const errorText = await response.text();
      console.log('❌ トークン更新失敗:', errorText);
    }
  } catch (error: any) {
    console.log('❌ トークン更新エラー:', error.message);
  }
}

testJoomApi().catch(console.error);
