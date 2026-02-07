#!/usr/bin/env npx tsx
/**
 * Joom認証情報確認スクリプト
 */

import { prisma } from '@rakuda/database';

async function checkJoomCredentials() {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'JOOM' }
  });

  if (!credential) {
    console.log('❌ Joom認証情報が見つかりません');
    await prisma.$disconnect();
    return;
  }

  const creds = credential.credentials as any;
  console.log('✅ Joom認証情報:');
  console.log('  - ID:', credential.id);
  console.log('  - Active:', credential.isActive);
  console.log('  - Has Access Token:', !!creds.accessToken);
  console.log('  - Has Refresh Token:', !!creds.refreshToken);
  console.log('  - Token Expires:', creds.expiresAt || 'Not set');
  console.log('  - Updated:', credential.updatedAt);

  // トークンの有効期限チェック
  if (creds.expiresAt) {
    const expiresAt = new Date(creds.expiresAt);
    const now = new Date();
    if (expiresAt > now) {
      const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log('  - 有効期限まで:', daysLeft, '日');
    } else {
      console.log('  - ⚠️ トークン期限切れ');
    }
  }

  await prisma.$disconnect();
}

checkJoomCredentials().catch(console.error);
