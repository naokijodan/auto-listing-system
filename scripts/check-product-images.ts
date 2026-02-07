#!/usr/bin/env npx tsx
/**
 * 商品画像URLの確認スクリプト
 */

import { prisma, ProductStatus } from '@rakuda/database';

async function checkProductImages() {
  console.log('='.repeat(60));
  console.log('商品画像URL確認');
  console.log('='.repeat(60));

  const products = await prisma.product.findMany({
    where: {
      status: {
        in: [ProductStatus.READY_TO_REVIEW, ProductStatus.APPROVED, ProductStatus.ACTIVE],
      },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n商品数: ${products.length}\n`);

  for (const product of products) {
    console.log(`\n--- ${product.title?.slice(0, 50)}... ---`);
    console.log(`ID: ${product.id}`);
    console.log(`Status: ${product.status}`);

    const images = (product.images || []) as string[];
    const processedImages = (product.processedImages || []) as string[];

    console.log(`\n元画像 (${images.length}件):`);
    for (const img of images.slice(0, 3)) {
      const isLocal = img.includes('localhost') || img.includes('127.0.0.1');
      console.log(`  ${isLocal ? '❌ LOCAL' : '✅ EXTERNAL'}: ${img.slice(0, 80)}...`);
    }

    console.log(`\n処理済み画像 (${processedImages.length}件):`);
    for (const img of processedImages.slice(0, 3)) {
      const isLocal = img.includes('localhost') || img.includes('127.0.0.1');
      console.log(`  ${isLocal ? '❌ LOCAL' : '✅ EXTERNAL'}: ${img.slice(0, 80)}...`);
    }
  }

  // 外部URLを持つ商品を探す
  console.log('\n\n='.repeat(60));
  console.log('外部URL画像を持つ商品を検索...');

  const allProducts = await prisma.product.findMany({
    where: {
      status: {
        in: [ProductStatus.READY_TO_REVIEW, ProductStatus.APPROVED, ProductStatus.ACTIVE],
      },
    },
  });

  const productsWithExternalImages = allProducts.filter(p => {
    const images = [...(p.images as string[] || []), ...(p.processedImages as string[] || [])];
    return images.some(img =>
      img && !img.includes('localhost') && !img.includes('127.0.0.1') && img.startsWith('http')
    );
  });

  console.log(`外部URL画像を持つ商品: ${productsWithExternalImages.length}件`);

  for (const p of productsWithExternalImages.slice(0, 5)) {
    console.log(`  - ${p.id}: ${p.title?.slice(0, 40)}...`);
  }

  await prisma.$disconnect();
}

checkProductImages().catch(console.error);
