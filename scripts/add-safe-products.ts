#!/usr/bin/env npx tsx
/**
 * 安全なカテゴリの追加商品を作成
 */

import { prisma, ProductStatus, ProcessStatus } from '@rakuda/database';
import crypto from 'crypto';

const ADDITIONAL_PRODUCTS = [
  {
    title: 'ティファニー オープンハート ネックレス シルバー',
    titleEn: 'Tiffany Open Heart Necklace Silver',
    description: 'ティファニーのオープンハートネックレス。シルバー925。',
    descriptionEn: 'Tiffany Open Heart Necklace. Sterling Silver 925.',
    price: 35000,
    category: 'jewelry',
    brand: 'Tiffany',
  },
  {
    title: 'カルティエ ラブリング ピンクゴールド',
    titleEn: 'Cartier Love Ring Pink Gold',
    description: 'カルティエのラブリング。18Kピンクゴールド。',
    descriptionEn: 'Cartier Love Ring. 18K Pink Gold.',
    price: 180000,
    category: 'jewelry',
    brand: 'Cartier',
  },
  {
    title: 'ブルガリ ビーゼロワン リング ホワイトゴールド',
    titleEn: 'Bvlgari B.zero1 Ring White Gold',
    description: 'ブルガリ ビーゼロワンリング。18Kホワイトゴールド。',
    descriptionEn: 'Bvlgari B.zero1 Ring. 18K White Gold.',
    price: 250000,
    category: 'jewelry',
    brand: 'Bvlgari',
  },
  {
    title: 'グッチ GGマーモント ミニバッグ ブラック',
    titleEn: 'Gucci GG Marmont Mini Bag Black',
    description: 'グッチのGGマーモントミニバッグ。レザー。',
    descriptionEn: 'Gucci GG Marmont Mini Bag. Leather.',
    price: 95000,
    category: 'bag',
    brand: 'Gucci',
  },
  {
    title: 'プラダ サフィアーノ 二つ折り財布',
    titleEn: 'Prada Saffiano Bifold Wallet',
    description: 'プラダのサフィアーノレザー二つ折り財布。',
    descriptionEn: 'Prada Saffiano Leather Bifold Wallet.',
    price: 55000,
    category: 'accessory',
    brand: 'Prada',
  },
  {
    title: 'バーバリー チェック柄マフラー カシミア',
    titleEn: 'Burberry Check Pattern Scarf Cashmere',
    description: 'バーバリーのチェック柄マフラー。カシミア100%。',
    descriptionEn: 'Burberry Check Pattern Scarf. 100% Cashmere.',
    price: 45000,
    category: 'fashion',
    brand: 'Burberry',
  },
  {
    title: 'ロレックス デイトジャスト 16234 自動巻き',
    titleEn: 'Rolex Datejust 16234 Automatic Watch',
    description: 'ロレックスのデイトジャスト。自動巻き。箱・保証書付き。',
    descriptionEn: 'Rolex Datejust 16234. Automatic. With box and papers.',
    price: 650000,
    category: 'watch',
    brand: 'Rolex',
  },
  {
    title: 'タグホイヤー カレラ クロノグラフ',
    titleEn: 'TAG Heuer Carrera Chronograph Watch',
    description: 'タグホイヤー カレラ クロノグラフ。自動巻き。',
    descriptionEn: 'TAG Heuer Carrera Chronograph. Automatic.',
    price: 320000,
    category: 'watch',
    brand: 'TAG Heuer',
  },
  {
    title: 'IWC ポルトギーゼ オートマティック',
    titleEn: 'IWC Portugieser Automatic Watch',
    description: 'IWCのポルトギーゼ オートマティック。シルバー文字盤。',
    descriptionEn: 'IWC Portugieser Automatic. Silver dial.',
    price: 550000,
    category: 'watch',
    brand: 'IWC',
  },
  {
    title: 'ゼニス エルプリメロ クロノグラフ',
    titleEn: 'Zenith El Primero Chronograph Watch',
    description: 'ゼニス エルプリメロ クロノグラフ。自動巻き。',
    descriptionEn: 'Zenith El Primero Chronograph. Automatic.',
    price: 480000,
    category: 'watch',
    brand: 'Zenith',
  },
  {
    title: 'ブライトリング ナビタイマー クロノグラフ',
    titleEn: 'Breitling Navitimer Chronograph Watch',
    description: 'ブライトリング ナビタイマー。自動巻きクロノグラフ。',
    descriptionEn: 'Breitling Navitimer. Automatic Chronograph.',
    price: 420000,
    category: 'watch',
    brand: 'Breitling',
  },
  {
    title: 'パテックフィリップ カラトラバ 手巻き',
    titleEn: 'Patek Philippe Calatrava Manual Watch',
    description: 'パテックフィリップ カラトラバ。手巻き。',
    descriptionEn: 'Patek Philippe Calatrava. Manual winding.',
    price: 1500000,
    category: 'watch',
    brand: 'Patek Philippe',
  },
  {
    title: 'ヴァンクリーフ＆アーペル アルハンブラ ネックレス',
    titleEn: 'Van Cleef & Arpels Alhambra Necklace',
    description: 'ヴァンクリーフ＆アーペル アルハンブラ。マザーオブパール。',
    descriptionEn: 'Van Cleef & Arpels Alhambra. Mother of Pearl.',
    price: 380000,
    category: 'jewelry',
    brand: 'Van Cleef & Arpels',
  },
  {
    title: 'ミキモト パールネックレス 7mm',
    titleEn: 'Mikimoto Pearl Necklace 7mm',
    description: 'ミキモトのパールネックレス。7mmあこや真珠。',
    descriptionEn: 'Mikimoto Pearl Necklace. 7mm Akoya pearls.',
    price: 280000,
    category: 'jewelry',
    brand: 'Mikimoto',
  },
  {
    title: 'ボッテガヴェネタ イントレチャート 長財布',
    titleEn: 'Bottega Veneta Intrecciato Long Wallet',
    description: 'ボッテガヴェネタ イントレチャート長財布。レザー。',
    descriptionEn: 'Bottega Veneta Intrecciato Long Wallet. Leather.',
    price: 75000,
    category: 'accessory',
    brand: 'Bottega Veneta',
  },
];

async function main() {
  console.log('Adding safe category products...');

  const source = await prisma.source.findFirst({ where: { name: 'ヤフオク' } });
  if (!source) {
    console.log('Source not found');
    return;
  }

  let created = 0;
  for (const p of ADDITIONAL_PRODUCTS) {
    const sourceItemId = `test-${crypto.randomUUID()}`;
    await prisma.product.create({
      data: {
        sourceId: source.id,
        sourceItemId,
        sourceUrl: `https://example.com/${sourceItemId}`,
        sourceHash: crypto.createHash('md5').update(sourceItemId).digest('hex'),
        title: p.title,
        titleEn: p.titleEn,
        description: p.description,
        descriptionEn: p.descriptionEn,
        price: p.price,
        category: p.category,
        brand: p.brand,
        condition: 'good',
        images: ['https://example.com/image.jpg'],
        processedImages: ['https://example.com/image.jpg'],
        status: ProductStatus.APPROVED,
        translationStatus: ProcessStatus.COMPLETED,
        imageStatus: ProcessStatus.COMPLETED,
        scrapedAt: new Date(),
      },
    });
    created++;
    console.log(`Created: ${p.titleEn}`);
  }

  console.log(`\nTotal created: ${created}`);
  await prisma.$disconnect();
}

main();
