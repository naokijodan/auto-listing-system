#!/usr/bin/env npx tsx
/**
 * テスト用商品データ生成スクリプト
 *
 * 使用方法:
 *   npx tsx scripts/seed-test-products.ts [count]
 *
 * 例:
 *   npx tsx scripts/seed-test-products.ts 10    # 10件生成
 *   npx tsx scripts/seed-test-products.ts       # デフォルト5件
 */

import { prisma, ProductStatus, ProcessStatus } from '@rakuda/database';

const SAMPLE_PRODUCTS = [
  {
    title: 'ヴィンテージ セイコー 自動巻き腕時計 1970年代',
    titleEn: 'Vintage Seiko Automatic Watch 1970s',
    description: '1970年代のセイコー自動巻き腕時計です。オーバーホール済み、動作良好。',
    descriptionEn: 'Vintage Seiko automatic watch from the 1970s. Recently serviced, runs great.',
    price: 25000,
    category: 'watches',
    brand: 'Seiko',
    condition: 'good',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m12345678901_1.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m12345678901_2.jpg',
    ],
  },
  {
    title: 'カシオ G-SHOCK DW-5600 デジタル腕時計',
    titleEn: 'Casio G-SHOCK DW-5600 Digital Watch',
    description: 'カシオのG-SHOCK DW-5600です。傷あり、電池交換済み。',
    descriptionEn: 'Casio G-SHOCK DW-5600. Some scratches, battery replaced.',
    price: 8500,
    category: 'watches',
    brand: 'Casio',
    condition: 'fair',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m23456789012_1.jpg',
    ],
  },
  {
    title: 'オメガ シーマスター プロフェッショナル 300m',
    titleEn: 'Omega Seamaster Professional 300m',
    description: 'オメガ シーマスター プロフェッショナル 300m防水。箱・保証書付き。',
    descriptionEn: 'Omega Seamaster Professional 300m water resistant. Includes box and warranty card.',
    price: 350000,
    category: 'watches',
    brand: 'Omega',
    condition: 'like_new',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m34567890123_1.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m34567890123_2.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m34567890123_3.jpg',
    ],
  },
  {
    title: 'グランドセイコー SBGA211 スプリングドライブ',
    titleEn: 'Grand Seiko SBGA211 Spring Drive',
    description: 'グランドセイコー SBGA211 スプリングドライブ。雪白文字盤。美品。',
    descriptionEn: 'Grand Seiko SBGA211 Spring Drive. Snowflake dial. Excellent condition.',
    price: 480000,
    category: 'watches',
    brand: 'Grand Seiko',
    condition: 'like_new',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m45678901234_1.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m45678901234_2.jpg',
    ],
  },
  {
    title: 'ルイヴィトン モノグラム 長財布 M60017',
    titleEn: 'Louis Vuitton Monogram Wallet M60017',
    description: 'ルイヴィトン モノグラム 長財布。使用感あり、内側に汚れあり。',
    descriptionEn: 'Louis Vuitton Monogram long wallet. Shows wear, some stains inside.',
    price: 35000,
    category: 'fashion',
    brand: 'Louis Vuitton',
    condition: 'fair',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m56789012345_1.jpg',
    ],
  },
  {
    title: 'エルメス カレ90 シルクスカーフ',
    titleEn: 'Hermes Carre 90 Silk Scarf',
    description: 'エルメス カレ90 シルクスカーフ。未使用に近い状態。',
    descriptionEn: 'Hermes Carre 90 silk scarf. Near new condition.',
    price: 42000,
    category: 'fashion',
    brand: 'Hermes',
    condition: 'like_new',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m67890123456_1.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m67890123456_2.jpg',
    ],
  },
  {
    title: 'シャネル マトラッセ ショルダーバッグ',
    titleEn: 'Chanel Matelasse Shoulder Bag',
    description: 'シャネル マトラッセ ショルダーバッグ。ラムスキン、ゴールド金具。',
    descriptionEn: 'Chanel Matelasse shoulder bag. Lambskin leather with gold hardware.',
    price: 580000,
    category: 'fashion',
    brand: 'Chanel',
    condition: 'good',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m78901234567_1.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m78901234567_2.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m78901234567_3.jpg',
    ],
  },
  {
    title: 'ソニー WH-1000XM5 ワイヤレスヘッドホン',
    titleEn: 'Sony WH-1000XM5 Wireless Headphones',
    description: 'ソニー WH-1000XM5 ノイズキャンセリングヘッドホン。ブラック。',
    descriptionEn: 'Sony WH-1000XM5 noise cancelling headphones. Black color.',
    price: 38000,
    category: 'electronics',
    brand: 'Sony',
    condition: 'like_new',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m89012345678_1.jpg',
    ],
  },
  {
    title: 'ニコン D850 デジタル一眼レフカメラ ボディ',
    titleEn: 'Nikon D850 Digital SLR Camera Body',
    description: 'ニコン D850 ボディのみ。シャッター数約15000回。美品。',
    descriptionEn: 'Nikon D850 body only. Shutter count approx 15000. Excellent condition.',
    price: 280000,
    category: 'electronics',
    brand: 'Nikon',
    condition: 'like_new',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m90123456789_1.jpg',
      'https://static.mercdn.net/item/detail/orig/photos/m90123456789_2.jpg',
    ],
  },
  {
    title: '任天堂 Switch 有機ELモデル ホワイト',
    titleEn: 'Nintendo Switch OLED Model White',
    description: '任天堂 Switch 有機ELモデル。ホワイト。箱・付属品完備。',
    descriptionEn: 'Nintendo Switch OLED Model. White. Complete with box and accessories.',
    price: 32000,
    category: 'electronics',
    brand: 'Nintendo',
    condition: 'like_new',
    images: [
      'https://static.mercdn.net/item/detail/orig/photos/m01234567890_1.jpg',
    ],
  },
];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function main() {
  const count = parseInt(process.argv[2] || '5', 10);
  console.log('\n============================================================');
  console.log('Test Product Seeder');
  console.log('============================================================');
  console.log(`Creating ${count} test products...`);

  try {
    // ソース取得（メルカリ）
    let source = await prisma.source.findFirst({
      where: { name: 'メルカリ' },
    });

    if (!source) {
      source = await prisma.source.create({
        data: {
          name: 'メルカリ',
          type: 'MERCARI',
          url: 'https://mercari.com',
        },
      });
      log('Created Mercari source');
    }

    let created = 0;
    for (let i = 0; i < count; i++) {
      const template = SAMPLE_PRODUCTS[i % SAMPLE_PRODUCTS.length];
      const suffix = i >= SAMPLE_PRODUCTS.length ? ` #${Math.floor(i / SAMPLE_PRODUCTS.length) + 1}` : '';

      const product = await prisma.product.create({
        data: {
          sourceId: source.id,
          sourceItemId: `test-${Date.now()}-${i}`,
          sourceUrl: `https://mercari.com/jp/items/test${i}`,
          sourceHash: `hash-${Date.now()}-${i}`,
          title: template.title + suffix,
          titleEn: template.titleEn + suffix,
          description: template.description,
          descriptionEn: template.descriptionEn,
          price: template.price + (i * 100),
          category: template.category,
          brand: template.brand,
          condition: template.condition,
          weight: 200 + (i * 50),
          images: template.images,
          processedImages: template.images, // テスト用に同じURLを使用
          status: ProductStatus.APPROVED,
          translationStatus: ProcessStatus.COMPLETED,
          imageStatus: ProcessStatus.COMPLETED,
          attributes: {
            brand: template.brand,
            condition: template.condition,
            category: template.category,
          },
          scrapedAt: new Date(),
        },
      });

      log(`Created: ${product.titleEn?.slice(0, 50)}...`);
      created++;
    }

    console.log('\n============================================================');
    console.log('RESULT');
    console.log('============================================================');
    console.log(`Created ${created} test products`);
    console.log('\nNext steps:');
    console.log('  1. Run batch publish dry-run: npm run joom:batch-publish:dry');
    console.log('  2. Run batch publish: npm run joom:batch-publish');
    console.log('============================================================\n');

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
