import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // PAUSED listings
  const paused = await prisma.listing.findMany({
    where: { status: 'PAUSED' },
    include: {
      product: {
        select: { id: true, title: true, price: true, titleEn: true }
      }
    },
    take: 20,
  });

  console.log('=== PAUSED Listings ===');
  console.log('Total:', paused.length);

  for (let i = 0; i < paused.length; i++) {
    const l = paused[i];
    const title = l.product.titleEn || l.product.title || '';
    const shortId = l.id.substring(0, 8);
    const priceStr = l.product.price.toLocaleString();
    const shortTitle = title.substring(0, 40);
    console.log(`${i+1}. ID: ${shortId}... | Price: ¥${priceStr} | ${shortTitle}`);
  }

  // eBay credentials
  const ebayCredentials = await prisma.marketplaceCredential.findMany({
    where: { marketplace: 'EBAY' },
  });

  console.log('\n=== eBay Credentials ===');
  console.log('Found:', ebayCredentials.length);

  if (ebayCredentials.length > 0) {
    const cred = ebayCredentials[0];
    const credentials = cred.credentials as Record<string, unknown>;
    console.log('Active:', cred.isActive);
    console.log('Has clientId:', credentials?.clientId ? 'yes' : 'no');
    console.log('Has refreshToken:', credentials?.refreshToken ? 'yes' : 'no');
  } else {
    console.log('No eBay credentials configured');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
