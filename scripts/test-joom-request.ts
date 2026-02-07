#!/usr/bin/env npx tsx
/**
 * Joom APIリクエスト形式のデバッグスクリプト
 */

import { prisma } from '@rakuda/database';

const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3';

async function testJoomRequest() {
  console.log('='.repeat(60));
  console.log('Joom API Request Format Debug');
  console.log('='.repeat(60));

  // 認証情報取得
  const credential = await prisma.marketplaceCredential.findFirst({
    where: { marketplace: 'JOOM', isActive: true },
  });

  if (!credential) {
    console.log('❌ No Joom credentials found');
    await prisma.$disconnect();
    return;
  }

  const creds = credential.credentials as any;

  // 最小限のリクエストボディでテスト
  // Joom API v3 - 画像URLの様々な形式を試す
  const imageUrl = 'https://static.mercdn.net/item/detail/orig/photos/m53059935090_1.jpg';
  const minimalRequest = {
    name: 'Test Product RAKUDA v6',
    description: 'This is a test product description for API format testing. Ships from Japan with careful packaging.',
    // 複数の画像フィールド形式を同時に試す
    orig_main_image_url: imageUrl,  // snake_case
    origMainImageUrl: imageUrl,     // camelCase
    mainImage: imageUrl,            // simple camelCase
    main_image: imageUrl,           // simple snake_case
    mainImageUrl: imageUrl,         // another variant
    extra_images: [
      'https://static.mercdn.net/item/detail/orig/photos/m53059935090_2.jpg',
    ],
    sku: 'TEST-SKU-006',
    parent_sku: 'TEST-SKU-006',
    tags: ['Japanese', 'Authentic'],
    variants: [
      {
        sku: 'TEST-SKU-006-V1',
        price: '64.97',
        inventory: 1,
        shippingPrice: '7.00',
        shippingWeight: 200,
        // バリアントにも画像を設定
        origMainImageUrl: imageUrl,
        mainImage: imageUrl,
      },
    ],
  };

  console.log('\n📤 Sending minimal request:');
  console.log(JSON.stringify(minimalRequest, null, 2));

  try {
    const response = await fetch(`${JOOM_API_BASE}/products/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(minimalRequest),
    });

    const responseText = await response.text();
    console.log('\n📥 Response:');
    console.log('Status:', response.status);

    try {
      const data = JSON.parse(responseText);
      console.log(JSON.stringify(data, null, 2));
    } catch {
      console.log('Raw:', responseText);
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }

  await prisma.$disconnect();
}

testJoomRequest().catch(console.error);
