import { PrismaClient, SourceType, Marketplace } from '@prisma/client';

const prisma = new PrismaClient();

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
