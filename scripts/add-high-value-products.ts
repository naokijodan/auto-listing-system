#!/usr/bin/env npx tsx
/**
 * Phase 4 カナリアリリース用: 高価格帯テスト商品追加スクリプト
 *
 * 目的:
 * - $5,000以上の高価格帯時計を追加してエラーパターンを分析
 * - 「Patek固有の問題」vs「高価格帯全体の問題」を切り分ける
 *
 * 使用方法:
 *   npx tsx scripts/add-high-value-products.ts
 *   npx tsx scripts/add-high-value-products.ts --dry-run  # 追加せずに確認のみ
 */

import { prisma, ProductStatus, ProcessStatus } from '@rakuda/database';
import crypto from 'crypto';

/**
 * 高価格帯テスト商品データ
 * 価格帯:
 *   - $5,000-$7,500 (¥750,000-¥1,125,000): 6件
 *   - $7,500-$10,000 (¥1,125,000-¥1,500,000): 5件
 *   - $10,000-$20,000 (¥1,500,000-¥3,000,000): 4件
 *   - $20,000+ (¥3,000,000+): 3件
 */
const HIGH_VALUE_PRODUCTS = [
  // ========================================
  // Tier 1: $5,000-$7,500 (¥750,000-¥1,125,000)
  // ========================================
  {
    title: 'ロレックス サブマリーナ 116610LN ブラック',
    titleEn: 'Rolex Submariner 116610LN Black Dial',
    description: 'ロレックス サブマリーナ 116610LN。ブラックダイヤル。箱・保証書付き。2018年購入。',
    descriptionEn: 'Rolex Submariner 116610LN. Black dial. With box and papers. Purchased 2018.',
    price: 850000, // ~$5,667
    category: 'watch',
    brand: 'Rolex',
    condition: 'like_new',
  },
  {
    title: 'ロレックス エクスプローラー 214270 39mm',
    titleEn: 'Rolex Explorer 214270 39mm',
    description: 'ロレックス エクスプローラー 214270。39mm。2019年購入。美品。',
    descriptionEn: 'Rolex Explorer 214270. 39mm case. Purchased 2019. Excellent condition.',
    price: 780000, // ~$5,200
    category: 'watch',
    brand: 'Rolex',
    condition: 'like_new',
  },
  {
    title: 'オメガ スピードマスター プロフェッショナル ムーンウォッチ',
    titleEn: 'Omega Speedmaster Professional Moonwatch',
    description: 'オメガ スピードマスター プロフェッショナル。手巻き。月面着陸50周年モデル。',
    descriptionEn: 'Omega Speedmaster Professional Moonwatch. Manual winding. 50th Anniversary Edition.',
    price: 820000, // ~$5,467
    category: 'watch',
    brand: 'Omega',
    condition: 'like_new',
  },
  {
    title: 'カルティエ サントス ドゥ カルティエ ミディアム',
    titleEn: 'Cartier Santos de Cartier Medium',
    description: 'カルティエ サントス ミディアム。SSブレスレット。2020年購入。',
    descriptionEn: 'Cartier Santos de Cartier Medium. SS bracelet. Purchased 2020.',
    price: 900000, // ~$6,000
    category: 'watch',
    brand: 'Cartier',
    condition: 'like_new',
  },
  {
    title: 'パネライ ルミノール マリーナ PAM01312',
    titleEn: 'Panerai Luminor Marina PAM01312',
    description: 'パネライ ルミノール マリーナ PAM01312。44mm。ブルー文字盤。',
    descriptionEn: 'Panerai Luminor Marina PAM01312. 44mm case. Blue dial.',
    price: 950000, // ~$6,333
    category: 'watch',
    brand: 'Panerai',
    condition: 'good',
  },
  {
    title: 'オーデマピゲ ロイヤルオーク オフショア クロノ',
    titleEn: 'Audemars Piguet Royal Oak Offshore Chronograph',
    description: 'AP ロイヤルオーク オフショア クロノグラフ。42mm。セラミックベゼル。',
    descriptionEn: 'Audemars Piguet Royal Oak Offshore Chronograph. 42mm. Ceramic bezel.',
    price: 1100000, // ~$7,333
    category: 'watch',
    brand: 'Audemars Piguet',
    condition: 'good',
  },

  // ========================================
  // Tier 2: $7,500-$10,000 (¥1,125,000-¥1,500,000)
  // ========================================
  {
    title: 'ロレックス デイトナ 116500LN ホワイト',
    titleEn: 'Rolex Daytona 116500LN White Dial',
    description: 'ロレックス デイトナ 116500LN。ホワイト（パンダ）ダイヤル。箱・保証書付き。',
    descriptionEn: 'Rolex Daytona 116500LN. White (Panda) dial. With box and papers.',
    price: 1350000, // ~$9,000
    category: 'watch',
    brand: 'Rolex',
    condition: 'like_new',
  },
  {
    title: 'ロレックス GMTマスターII 126710BLNR バットマン',
    titleEn: 'Rolex GMT-Master II 126710BLNR Batman',
    description: 'ロレックス GMTマスターII バットマン。ジュビリーブレスレット。2021年購入。',
    descriptionEn: 'Rolex GMT-Master II Batman. Jubilee bracelet. Purchased 2021.',
    price: 1280000, // ~$8,533
    category: 'watch',
    brand: 'Rolex',
    condition: 'like_new',
  },
  {
    title: 'ヴァシュロンコンスタンタン オーバーシーズ 4500V',
    titleEn: 'Vacheron Constantin Overseas 4500V',
    description: 'ヴァシュロンコンスタンタン オーバーシーズ 4500V。ブルー文字盤。',
    descriptionEn: 'Vacheron Constantin Overseas 4500V. Blue dial.',
    price: 1450000, // ~$9,667
    category: 'watch',
    brand: 'Vacheron Constantin',
    condition: 'good',
  },
  {
    title: 'IWC パイロットウォッチ クロノグラフ トップガン',
    titleEn: 'IWC Pilot Watch Chronograph Top Gun',
    description: 'IWC パイロットウォッチ クロノグラフ トップガン。セラミックケース。',
    descriptionEn: 'IWC Pilot Watch Chronograph Top Gun. Ceramic case.',
    price: 1200000, // ~$8,000
    category: 'watch',
    brand: 'IWC',
    condition: 'like_new',
  },
  {
    title: 'ブレゲ マリーン 5517 自動巻き',
    titleEn: 'Breguet Marine 5517 Automatic',
    description: 'ブレゲ マリーン 5517。チタンケース。ブルー文字盤。',
    descriptionEn: 'Breguet Marine 5517 Automatic. Titanium case. Blue dial.',
    price: 1380000, // ~$9,200
    category: 'watch',
    brand: 'Breguet',
    condition: 'good',
  },

  // ========================================
  // Tier 3: $10,000-$20,000 (¥1,500,000-¥3,000,000)
  // ========================================
  {
    title: 'パテックフィリップ ノーチラス 5711/1A ブルー',
    titleEn: 'Patek Philippe Nautilus 5711/1A Blue',
    description: 'パテックフィリップ ノーチラス 5711/1A。ブルー文字盤。箱・保証書付き。',
    descriptionEn: 'Patek Philippe Nautilus 5711/1A. Blue dial. With box and papers.',
    price: 2800000, // ~$18,667
    category: 'watch',
    brand: 'Patek Philippe',
    condition: 'like_new',
  },
  {
    title: 'パテックフィリップ アクアノート 5167A ブラック',
    titleEn: 'Patek Philippe Aquanaut 5167A Black',
    description: 'パテックフィリップ アクアノート 5167A。ブラックダイヤル。2019年購入。',
    descriptionEn: 'Patek Philippe Aquanaut 5167A. Black dial. Purchased 2019.',
    price: 2200000, // ~$14,667
    category: 'watch',
    brand: 'Patek Philippe',
    condition: 'like_new',
  },
  {
    title: 'オーデマピゲ ロイヤルオーク 15500ST ブルー',
    titleEn: 'Audemars Piguet Royal Oak 15500ST Blue',
    description: 'オーデマピゲ ロイヤルオーク 15500ST。ブルー文字盤。41mm。',
    descriptionEn: 'Audemars Piguet Royal Oak 15500ST. Blue dial. 41mm case.',
    price: 2500000, // ~$16,667
    category: 'watch',
    brand: 'Audemars Piguet',
    condition: 'like_new',
  },
  {
    title: 'A.ランゲ&ゾーネ ランゲ1 101.021',
    titleEn: 'A. Lange & Sohne Lange 1 101.021',
    description: 'A.ランゲ&ゾーネ ランゲ1。18Kホワイトゴールド。シルバー文字盤。',
    descriptionEn: 'A. Lange & Sohne Lange 1 101.021. 18K White Gold. Silver dial.',
    price: 2600000, // ~$17,333
    category: 'watch',
    brand: 'A. Lange & Sohne',
    condition: 'good',
  },

  // ========================================
  // Tier 4: $20,000+ (¥3,000,000+)
  // ========================================
  {
    title: 'パテックフィリップ グランドコンプリケーション 5270G',
    titleEn: 'Patek Philippe Grand Complications 5270G',
    description: 'パテックフィリップ グランドコンプリケーション 5270G。永久カレンダー・クロノグラフ。',
    descriptionEn: 'Patek Philippe Grand Complications 5270G. Perpetual Calendar Chronograph.',
    price: 5500000, // ~$36,667
    category: 'watch',
    brand: 'Patek Philippe',
    condition: 'like_new',
  },
  {
    title: 'リシャールミル RM 011 チタン',
    titleEn: 'Richard Mille RM 011 Titanium',
    description: 'リシャールミル RM 011。チタンケース。フライバッククロノグラフ。',
    descriptionEn: 'Richard Mille RM 011. Titanium case. Flyback Chronograph.',
    price: 8000000, // ~$53,333
    category: 'watch',
    brand: 'Richard Mille',
    condition: 'good',
  },
  {
    title: 'フィリップデュフォー シンプリシティ 37mm',
    titleEn: 'Philippe Dufour Simplicity 37mm',
    description: 'フィリップデュフォー シンプリシティ。37mm。プラチナケース。極めて希少。',
    descriptionEn: 'Philippe Dufour Simplicity 37mm. Platinum case. Extremely rare.',
    price: 15000000, // ~$100,000
    category: 'watch',
    brand: 'Philippe Dufour',
    condition: 'like_new',
  },
];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('\n' + '='.repeat(60));
  console.log('Phase 4 High-Value Products Seeder');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Total products to add: ${HIGH_VALUE_PRODUCTS.length}`);
  console.log('');

  // 価格帯別サマリー
  const tiers = {
    'Tier 1 ($5,000-$7,500)': HIGH_VALUE_PRODUCTS.filter(p => p.price >= 750000 && p.price < 1125000),
    'Tier 2 ($7,500-$10,000)': HIGH_VALUE_PRODUCTS.filter(p => p.price >= 1125000 && p.price < 1500000),
    'Tier 3 ($10,000-$20,000)': HIGH_VALUE_PRODUCTS.filter(p => p.price >= 1500000 && p.price < 3000000),
    'Tier 4 ($20,000+)': HIGH_VALUE_PRODUCTS.filter(p => p.price >= 3000000),
  };

  console.log('Price tier breakdown:');
  for (const [tier, products] of Object.entries(tiers)) {
    console.log(`  ${tier}: ${products.length} products`);
    for (const p of products) {
      const priceUSD = (p.price / 150).toFixed(0);
      console.log(`    - ${p.brand} ${p.titleEn?.slice(0, 40) || ''}... (~$${priceUSD})`);
    }
  }
  console.log('');

  if (isDryRun) {
    log('Dry run mode - no products will be created');
    console.log('\n' + '='.repeat(60));
    console.log('To actually add products, run:');
    console.log('  npx tsx scripts/add-high-value-products.ts');
    console.log('='.repeat(60) + '\n');
    await prisma.$disconnect();
    return;
  }

  try {
    // ソース取得（ヤフオク）
    let source = await prisma.source.findFirst({
      where: { name: 'ヤフオク' },
    });

    if (!source) {
      // ヤフオクソースがなければ作成
      source = await prisma.source.create({
        data: {
          name: 'ヤフオク',
          type: 'YAHOO_AUCTION',
          url: 'https://auctions.yahoo.co.jp',
        },
      });
      log('Created Yahoo Auction source');
    }

    let created = 0;
    let skipped = 0;

    for (const p of HIGH_VALUE_PRODUCTS) {
      // 同じタイトルの商品が既に存在するかチェック
      const existing = await prisma.product.findFirst({
        where: {
          titleEn: p.titleEn,
        },
      });

      if (existing) {
        log(`Skipped (already exists): ${p.titleEn}`);
        skipped++;
        continue;
      }

      const sourceItemId = `phase4-test-${crypto.randomUUID()}`;

      await prisma.product.create({
        data: {
          sourceId: source.id,
          sourceItemId,
          sourceUrl: `https://page.auctions.yahoo.co.jp/jp/auction/${sourceItemId}`,
          sourceHash: crypto.createHash('md5').update(sourceItemId).digest('hex'),
          title: p.title,
          titleEn: p.titleEn,
          description: p.description,
          descriptionEn: p.descriptionEn,
          price: p.price,
          category: p.category,
          brand: p.brand,
          condition: p.condition,
          weight: 200, // 時計の標準重量
          images: ['https://placehold.co/800x600/png?text=Watch+Image'],
          processedImages: ['https://placehold.co/800x600/png?text=Watch+Image'],
          status: ProductStatus.APPROVED,
          translationStatus: ProcessStatus.COMPLETED,
          imageStatus: ProcessStatus.COMPLETED,
          attributes: {
            brand: p.brand,
            condition: p.condition,
            category: p.category,
            phase4Test: true,
            priceUSD: Math.round(p.price / 150),
          },
          scrapedAt: new Date(),
        },
      });

      const priceUSD = (p.price / 150).toFixed(0);
      log(`Created: ${p.brand} - ${p.titleEn?.slice(0, 40)}... (~$${priceUSD})`);
      created++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('RESULT');
    console.log('='.repeat(60));
    console.log(`Created: ${created} products`);
    console.log(`Skipped: ${skipped} products (already exist)`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Check products: npx tsx -e "...(query)..."');
    console.log('  2. Run canary release: npx tsx scripts/canary-release.ts --phase=4');
    console.log('  3. Monitor for errors on high-value items');
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
