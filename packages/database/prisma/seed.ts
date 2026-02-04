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
      rate: 150.0,
      source: 'seed',
    },
  });

  console.log('✅ Created initial exchange rate');

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
