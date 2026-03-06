import { PrismaClient, SourceType, Marketplace } from '@prisma/client';

const prisma = new PrismaClient();

// ShippingRateEntry seeder (日本郵便 2024年国際郵便料金表)
async function seedShippingRates() {
  const rates: Array<{ shippingMethod: string; weightMin: number; weightMax: number; costJpy: number }>= [
    // EP (eパケット)
    { shippingMethod: 'EP', weightMin: 0, weightMax: 50, costJpy: 460 },
    { shippingMethod: 'EP', weightMin: 51, weightMax: 100, costJpy: 510 },
    { shippingMethod: 'EP', weightMin: 101, weightMax: 150, costJpy: 560 },
    { shippingMethod: 'EP', weightMin: 151, weightMax: 200, costJpy: 610 },
    { shippingMethod: 'EP', weightMin: 201, weightMax: 250, costJpy: 660 },
    { shippingMethod: 'EP', weightMin: 251, weightMax: 300, costJpy: 710 },
    { shippingMethod: 'EP', weightMin: 301, weightMax: 400, costJpy: 810 },
    { shippingMethod: 'EP', weightMin: 401, weightMax: 500, costJpy: 910 },
    { shippingMethod: 'EP', weightMin: 501, weightMax: 600, costJpy: 1010 },
    { shippingMethod: 'EP', weightMin: 601, weightMax: 700, costJpy: 1110 },
    { shippingMethod: 'EP', weightMin: 701, weightMax: 800, costJpy: 1210 },
    { shippingMethod: 'EP', weightMin: 801, weightMax: 900, costJpy: 1310 },
    { shippingMethod: 'EP', weightMin: 901, weightMax: 1000, costJpy: 1410 },
    { shippingMethod: 'EP', weightMin: 1001, weightMax: 1250, costJpy: 1560 },
    { shippingMethod: 'EP', weightMin: 1251, weightMax: 1500, costJpy: 1710 },
    { shippingMethod: 'EP', weightMin: 1501, weightMax: 1750, costJpy: 1860 },
    { shippingMethod: 'EP', weightMin: 1751, weightMax: 2000, costJpy: 2010 },

    // EL (eパケットライト)
    { shippingMethod: 'EL', weightMin: 0, weightMax: 50, costJpy: 380 },
    { shippingMethod: 'EL', weightMin: 51, weightMax: 100, costJpy: 415 },
    { shippingMethod: 'EL', weightMin: 101, weightMax: 150, costJpy: 450 },
    { shippingMethod: 'EL', weightMin: 151, weightMax: 200, costJpy: 485 },
    { shippingMethod: 'EL', weightMin: 201, weightMax: 250, costJpy: 520 },
    { shippingMethod: 'EL', weightMin: 251, weightMax: 300, costJpy: 555 },
    { shippingMethod: 'EL', weightMin: 301, weightMax: 400, costJpy: 625 },
    { shippingMethod: 'EL', weightMin: 401, weightMax: 500, costJpy: 695 },
    { shippingMethod: 'EL', weightMin: 501, weightMax: 600, costJpy: 765 },
    { shippingMethod: 'EL', weightMin: 601, weightMax: 700, costJpy: 835 },
    { shippingMethod: 'EL', weightMin: 701, weightMax: 800, costJpy: 905 },
    { shippingMethod: 'EL', weightMin: 801, weightMax: 900, costJpy: 975 },
    { shippingMethod: 'EL', weightMin: 901, weightMax: 1000, costJpy: 1045 },
    { shippingMethod: 'EL', weightMin: 1001, weightMax: 1250, costJpy: 1150 },
    { shippingMethod: 'EL', weightMin: 1251, weightMax: 1500, costJpy: 1255 },
    { shippingMethod: 'EL', weightMin: 1501, weightMax: 1750, costJpy: 1360 },
    { shippingMethod: 'EL', weightMin: 1751, weightMax: 2000, costJpy: 1465 },

    // EMS (Zone 2)
    { shippingMethod: 'EMS', weightMin: 0, weightMax: 500, costJpy: 3150 },
    { shippingMethod: 'EMS', weightMin: 501, weightMax: 600, costJpy: 3400 },
    { shippingMethod: 'EMS', weightMin: 601, weightMax: 700, costJpy: 3650 },
    { shippingMethod: 'EMS', weightMin: 701, weightMax: 800, costJpy: 3900 },
    { shippingMethod: 'EMS', weightMin: 801, weightMax: 900, costJpy: 4150 },
    { shippingMethod: 'EMS', weightMin: 901, weightMax: 1000, costJpy: 4400 },
    { shippingMethod: 'EMS', weightMin: 1001, weightMax: 1250, costJpy: 4900 },
    { shippingMethod: 'EMS', weightMin: 1251, weightMax: 1500, costJpy: 5400 },
    { shippingMethod: 'EMS', weightMin: 1501, weightMax: 1750, costJpy: 5900 },
    { shippingMethod: 'EMS', weightMin: 1751, weightMax: 2000, costJpy: 6400 },
    { shippingMethod: 'EMS', weightMin: 2001, weightMax: 2500, costJpy: 7400 },
    { shippingMethod: 'EMS', weightMin: 2501, weightMax: 3000, costJpy: 8400 },

    // CF (小形包装物 書留)
    { shippingMethod: 'CF', weightMin: 0, weightMax: 50, costJpy: 580 },
    { shippingMethod: 'CF', weightMin: 51, weightMax: 100, costJpy: 630 },
    { shippingMethod: 'CF', weightMin: 101, weightMax: 150, costJpy: 680 },
    { shippingMethod: 'CF', weightMin: 151, weightMax: 200, costJpy: 730 },
    { shippingMethod: 'CF', weightMin: 201, weightMax: 250, costJpy: 780 },
    { shippingMethod: 'CF', weightMin: 251, weightMax: 300, costJpy: 830 },
    { shippingMethod: 'CF', weightMin: 301, weightMax: 400, costJpy: 930 },
    { shippingMethod: 'CF', weightMin: 401, weightMax: 500, costJpy: 1030 },
    { shippingMethod: 'CF', weightMin: 501, weightMax: 600, costJpy: 1130 },
    { shippingMethod: 'CF', weightMin: 601, weightMax: 700, costJpy: 1230 },
    { shippingMethod: 'CF', weightMin: 701, weightMax: 800, costJpy: 1330 },
    { shippingMethod: 'CF', weightMin: 801, weightMax: 900, costJpy: 1430 },
    { shippingMethod: 'CF', weightMin: 901, weightMax: 1000, costJpy: 1530 },
    { shippingMethod: 'CF', weightMin: 1001, weightMax: 1250, costJpy: 1780 },
    { shippingMethod: 'CF', weightMin: 1251, weightMax: 1500, costJpy: 2030 },
    { shippingMethod: 'CF', weightMin: 1501, weightMax: 1750, costJpy: 2280 },
    { shippingMethod: 'CF', weightMin: 1751, weightMax: 2000, costJpy: 2530 },

    // CD (小形包装物 書留なし)
    { shippingMethod: 'CD', weightMin: 0, weightMax: 50, costJpy: 190 },
    { shippingMethod: 'CD', weightMin: 51, weightMax: 100, costJpy: 240 },
    { shippingMethod: 'CD', weightMin: 101, weightMax: 150, costJpy: 290 },
    { shippingMethod: 'CD', weightMin: 151, weightMax: 200, costJpy: 340 },
    { shippingMethod: 'CD', weightMin: 201, weightMax: 250, costJpy: 390 },
    { shippingMethod: 'CD', weightMin: 251, weightMax: 300, costJpy: 440 },
    { shippingMethod: 'CD', weightMin: 301, weightMax: 400, costJpy: 540 },
    { shippingMethod: 'CD', weightMin: 401, weightMax: 500, costJpy: 640 },
    { shippingMethod: 'CD', weightMin: 501, weightMax: 600, costJpy: 740 },
    { shippingMethod: 'CD', weightMin: 601, weightMax: 700, costJpy: 840 },
    { shippingMethod: 'CD', weightMin: 701, weightMax: 800, costJpy: 940 },
    { shippingMethod: 'CD', weightMin: 801, weightMax: 900, costJpy: 1040 },
    { shippingMethod: 'CD', weightMin: 901, weightMax: 1000, costJpy: 1140 },
    { shippingMethod: 'CD', weightMin: 1001, weightMax: 1250, costJpy: 1390 },
    { shippingMethod: 'CD', weightMin: 1251, weightMax: 1500, costJpy: 1640 },
    { shippingMethod: 'CD', weightMin: 1501, weightMax: 1750, costJpy: 1890 },
    { shippingMethod: 'CD', weightMin: 1751, weightMax: 2000, costJpy: 2140 },

    // CE (小形包装物 特定記録)
    { shippingMethod: 'CE', weightMin: 0, weightMax: 50, costJpy: 350 },
    { shippingMethod: 'CE', weightMin: 51, weightMax: 100, costJpy: 400 },
    { shippingMethod: 'CE', weightMin: 101, weightMax: 150, costJpy: 450 },
    { shippingMethod: 'CE', weightMin: 151, weightMax: 200, costJpy: 500 },
    { shippingMethod: 'CE', weightMin: 201, weightMax: 250, costJpy: 550 },
    { shippingMethod: 'CE', weightMin: 251, weightMax: 300, costJpy: 600 },
    { shippingMethod: 'CE', weightMin: 301, weightMax: 400, costJpy: 700 },
    { shippingMethod: 'CE', weightMin: 401, weightMax: 500, costJpy: 800 },
    { shippingMethod: 'CE', weightMin: 501, weightMax: 600, costJpy: 900 },
    { shippingMethod: 'CE', weightMin: 601, weightMax: 700, costJpy: 1000 },
    { shippingMethod: 'CE', weightMin: 701, weightMax: 800, costJpy: 1100 },
    { shippingMethod: 'CE', weightMin: 801, weightMax: 900, costJpy: 1200 },
    { shippingMethod: 'CE', weightMin: 901, weightMax: 1000, costJpy: 1300 },
    { shippingMethod: 'CE', weightMin: 1001, weightMax: 1250, costJpy: 1550 },
    { shippingMethod: 'CE', weightMin: 1251, weightMax: 1500, costJpy: 1800 },
    { shippingMethod: 'CE', weightMin: 1501, weightMax: 1750, costJpy: 2050 },
    { shippingMethod: 'CE', weightMin: 1751, weightMax: 2000, costJpy: 2300 },
  ];

  const results = await Promise.all(
    rates.map((r) =>
      prisma.shippingRateEntry.upsert({
        where: {
          shippingMethod_weightMin_weightMax: {
            shippingMethod: r.shippingMethod,
            weightMin: r.weightMin,
            weightMax: r.weightMax,
          },
        },
        update: {
          costJpy: r.costJpy,
          isActive: true,
        },
        create: {
          shippingMethod: r.shippingMethod,
          weightMin: r.weightMin,
          weightMax: r.weightMax,
          costJpy: r.costJpy,
          costUsd: null,
          isActive: true,
        },
      })
    )
  );

  console.log(`✅ Seeded ${results.length} shipping rate entries`);
}

async function main() {
  console.log('🌱 Seeding database...');

  // デフォルトソース作成
  const sources = await Promise.all([
    prisma.source.upsert({
      where: { id: 'mercari-default' },
      update: {},
      create: {
        id: 'mercari-default',
        type: SourceType.MERCARI,
        name: 'メルカリ',
        url: 'https://jp.mercari.com',
      },
    }),
    prisma.source.upsert({
      where: { id: 'yahoo-auction-default' },
      update: {},
      create: {
        id: 'yahoo-auction-default',
        type: SourceType.YAHOO_AUCTION,
        name: 'ヤフオク',
        url: 'https://auctions.yahoo.co.jp',
      },
    }),
    prisma.source.upsert({
      where: { id: 'rakuten-default' },
      update: {},
      create: {
        id: 'rakuten-default',
        type: SourceType.RAKUTEN,
        name: '楽天市場',
        url: 'https://www.rakuten.co.jp',
      },
    }),
    prisma.source.upsert({
      where: { id: 'amazon-default' },
      update: {},
      create: {
        id: 'amazon-default',
        type: SourceType.AMAZON,
        name: 'Amazon.co.jp',
        url: 'https://www.amazon.co.jp',
      },
    }),
  ]);

  console.log(`✅ Created ${sources.length} sources`);

  // Joom価格設定
  const joomPriceSetting = await prisma.priceSetting.upsert({
    where: { name: 'joom-default' },
    update: {},
    create: {
      name: 'joom-default',
      marketplace: Marketplace.JOOM,
      platformFeeRate: 0.15,
      paymentFeeRate: 0.03,
      targetProfitRate: 0.20,
      adRate: 0,
      exchangeRate: 150, // USD/JPY
      exchangeBuffer: 0,
      isDefault: true,
    },
  });

  console.log('✅ Created Joom price setting');

  // eBay価格設定
  const ebayPriceSetting = await prisma.priceSetting.upsert({
    where: { name: 'ebay-default' },
    update: {},
    create: {
      name: 'ebay-default',
      marketplace: Marketplace.EBAY,
      platformFeeRate: 0.1325,
      paymentFeeRate: 0.029,
      targetProfitRate: 0.20,
      adRate: 0,
      exchangeRate: 150,
      exchangeBuffer: 2, // 2円のバッファ
      isDefault: true,
    },
  });

  console.log('✅ Created eBay price setting');

  // シッピングポリシー
  const shippingPolicies = await Promise.all([
    // US向け ePacket
    prisma.shippingPolicy.upsert({
      where: { id: 'epacket-us' },
      update: {},
      create: {
        id: 'epacket-us',
        name: 'ePacket US',
        region: 'US',
        carrier: 'ePacket',
        shippingTable: {
          '100': 580,
          '200': 690,
          '300': 800,
          '400': 910,
          '500': 1020,
        },
        fuelSurcharge: 0,
        dutyThreshold: 800,
        dutyRate: 0,
        handlingTime: 2,
      },
    }),
    // EU向け ePacketライト
    prisma.shippingPolicy.upsert({
      where: { id: 'epacket-light-eu' },
      update: {},
      create: {
        id: 'epacket-light-eu',
        name: 'ePacket Light EU',
        region: 'EU',
        carrier: 'ePacket Light',
        shippingTable: {
          '100': 880,
          '200': 1060,
          '300': 1240,
          '400': 1420,
          '500': 1600,
        },
        fuelSurcharge: 0,
        dutyThreshold: 150,
        dutyRate: 0.20,
        handlingTime: 2,
      },
    }),
    // US向け Cpass
    prisma.shippingPolicy.upsert({
      where: { id: 'cpass-us' },
      update: {},
      create: {
        id: 'cpass-us',
        name: 'Cpass Economy US',
        region: 'US',
        carrier: 'Cpass Economy',
        shippingTable: {
          '100': 1227,
          '200': 1367,
          '300': 1581,
          '400': 1778,
          '500': 2060,
        },
        fuelSurcharge: 0,
        dutyThreshold: 800,
        dutyRate: 0,
        handlingTime: 3,
      },
    }),
  ]);

  console.log(`✅ Created ${shippingPolicies.length} shipping policies`);

  // 為替レート初期値
  const exchangeRate = await prisma.exchangeRate.create({
    data: {
      fromCurrency: 'JPY',
      toCurrency: 'USD',
      rate: 0.0067, // 1 JPY = 0.0067 USD (150 JPY/USD)
      source: 'seed',
    },
  });

  console.log('✅ Created initial exchange rate');

  // 翻訳プロンプト
  const translationPrompts = await Promise.all([
    // デフォルトプロンプト
    prisma.translationPrompt.upsert({
      where: { name: 'default' },
      update: {},
      create: {
        name: 'default',
        category: null,
        marketplace: null,
        systemPrompt: `You are a professional translator specializing in e-commerce product listings.
Your task is to translate Japanese product information into natural, SEO-friendly English suitable for international marketplaces like eBay and Joom.

Guidelines:
- Use clear, concise language
- Keep brand names in original form
- Convert Japanese sizes to international equivalents when possible
- Remove Japanese-specific phrases that don't translate well
- Optimize for search visibility`,
        userPrompt: `Translate the following Japanese product information to English:

Title: {{title}}

Description:
{{description}}`,
        extractAttributes: ['brand', 'model', 'color', 'material', 'size', 'condition'],
        additionalInstructions: null,
        seoKeywords: [],
        priority: 0,
        isDefault: true,
      },
    }),
    // 時計カテゴリ
    prisma.translationPrompt.upsert({
      where: { name: 'watches' },
      update: {},
      create: {
        name: 'watches',
        category: '時計',
        marketplace: null,
        systemPrompt: `You are a professional translator specializing in luxury watch listings for international marketplaces.
Your expertise includes mechanical and quartz movements, Swiss and Japanese brands, and vintage timepieces.

Guidelines:
- Use precise horological terminology
- Keep brand names in original form
- Include movement type, case size, and water resistance when available
- Highlight collectible or limited edition features
- Use SEO-friendly terms like "vintage", "rare", "authentic"`,
        userPrompt: `Translate the following Japanese watch listing to English:

Title: {{title}}

Description:
{{description}}`,
        extractAttributes: ['brand', 'model', 'movement', 'caseSize', 'waterResistance', 'material', 'condition', 'year'],
        additionalInstructions: `Pay special attention to:
- Movement type (automatic, quartz, manual, chronograph)
- Case diameter in mm
- Water resistance rating
- Crystal type (sapphire, mineral, acrylic)
- Box and papers availability`,
        seoKeywords: ['vintage', 'authentic', 'rare', 'limited edition', 'Japan exclusive'],
        priority: 10,
        isDefault: false,
      },
    }),
    // フィギュア・コレクタブル
    prisma.translationPrompt.upsert({
      where: { name: 'figures' },
      update: {},
      create: {
        name: 'figures',
        category: 'フィギュア',
        marketplace: null,
        systemPrompt: `You are a professional translator specializing in anime figures, collectibles, and Japanese pop culture merchandise.
Your expertise includes scale figures, prize figures, and limited edition collectibles.

Guidelines:
- Keep character and series names in romanized Japanese or official English
- Specify scale (1/7, 1/8, etc.) and manufacturer
- Highlight exclusive or limited features
- Note box condition for collectors
- Use proper figure collecting terminology`,
        userPrompt: `Translate the following Japanese figure listing to English:

Title: {{title}}

Description:
{{description}}`,
        extractAttributes: ['character', 'series', 'scale', 'manufacturer', 'condition', 'year'],
        additionalInstructions: `Include:
- Character name and series
- Scale and approximate height
- Manufacturer (Good Smile Company, Alter, Kotobukiya, etc.)
- Whether box/packaging is included
- Any exclusive or limited features`,
        seoKeywords: ['anime', 'figure', 'Japan import', 'authentic', 'new in box'],
        priority: 10,
        isDefault: false,
      },
    }),
    // アパレル
    prisma.translationPrompt.upsert({
      where: { name: 'apparel' },
      update: {},
      create: {
        name: 'apparel',
        category: 'ファッション',
        marketplace: null,
        systemPrompt: `You are a professional translator specializing in Japanese fashion and apparel for international buyers.
Your expertise includes streetwear, designer fashion, and traditional Japanese clothing.

Guidelines:
- Convert Japanese sizes to international equivalents (S/M/L, US sizes, etc.)
- Include actual measurements when available
- Describe materials and care instructions
- Note any Japanese brand exclusivity
- Use fashion industry terminology`,
        userPrompt: `Translate the following Japanese fashion item listing to English:

Title: {{title}}

Description:
{{description}}`,
        extractAttributes: ['brand', 'size', 'material', 'color', 'gender', 'condition'],
        additionalInstructions: `Size conversion guide:
- Japanese M = US S, Japanese L = US M
- Include actual measurements (chest, length, shoulder width) if mentioned
- Note if the item runs small/large`,
        seoKeywords: ['Japanese fashion', 'streetwear', 'authentic', 'Japan exclusive'],
        priority: 10,
        isDefault: false,
      },
    }),
  ]);

  console.log(`✅ Created ${translationPrompts.length} translation prompts`);

  // マーケットプレイス同期設定（Phase 44-B）
  const syncSettings = await Promise.all([
    // Joom設定
    prisma.marketplaceSyncSetting.upsert({
      where: { marketplace_syncType: { marketplace: 'JOOM', syncType: 'INVENTORY' } },
      update: {},
      create: {
        marketplace: 'JOOM',
        syncType: 'INVENTORY',
        cronExpression: '0 */6 * * *', // 6時間ごと
        isEnabled: true,
      },
    }),
    prisma.marketplaceSyncSetting.upsert({
      where: { marketplace_syncType: { marketplace: 'JOOM', syncType: 'ORDER' } },
      update: {},
      create: {
        marketplace: 'JOOM',
        syncType: 'ORDER',
        cronExpression: '0 */6 * * *', // 6時間ごと
        isEnabled: true,
      },
    }),
    prisma.marketplaceSyncSetting.upsert({
      where: { marketplace_syncType: { marketplace: 'JOOM', syncType: 'PRICE' } },
      update: {},
      create: {
        marketplace: 'JOOM',
        syncType: 'PRICE',
        cronExpression: '0 */12 * * *', // 12時間ごと
        isEnabled: true,
      },
    }),
    // eBay設定
    prisma.marketplaceSyncSetting.upsert({
      where: { marketplace_syncType: { marketplace: 'EBAY', syncType: 'INVENTORY' } },
      update: {},
      create: {
        marketplace: 'EBAY',
        syncType: 'INVENTORY',
        cronExpression: '15 */6 * * *', // 6時間ごと（15分オフセット）
        isEnabled: true,
      },
    }),
    prisma.marketplaceSyncSetting.upsert({
      where: { marketplace_syncType: { marketplace: 'EBAY', syncType: 'ORDER' } },
      update: {},
      create: {
        marketplace: 'EBAY',
        syncType: 'ORDER',
        cronExpression: '15 */6 * * *', // 6時間ごと（15分オフセット）
        isEnabled: true,
      },
    }),
    prisma.marketplaceSyncSetting.upsert({
      where: { marketplace_syncType: { marketplace: 'EBAY', syncType: 'PRICE' } },
      update: {},
      create: {
        marketplace: 'EBAY',
        syncType: 'PRICE',
        cronExpression: '15 */12 * * *', // 12時間ごと（15分オフセット）
        isEnabled: true,
      },
    }),
  ]);

  console.log(`✅ Created ${syncSettings.length} marketplace sync settings`);

  // 送料レート投入（ShippingRateEntry）
  await seedShippingRates();

  console.log('🎉 Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
