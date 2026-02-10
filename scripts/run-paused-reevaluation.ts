#!/usr/bin/env npx tsx
import { prisma } from '@rakuda/database';

const BRAND_WHITELIST = ['g-shock', 'gshock', 'casio', 'sony', 'nikon', 'canon', 'nintendo', 'switch', 'bose', 'jbl'];
const EXCLUDED_KEYWORDS = ['リチウムイオン電池', 'lithium ion battery', 'バッテリーパック', 'battery pack', 'ナイフ', 'knife', '刃物', 'blade', '武器', 'weapon', '銃', 'gun', '火薬', '爆発', 'explosive', '医薬品', 'medicine', '化粧品', 'cosmetic', '食品', 'food', '液体', 'liquid', '偽', 'fake', 'レプリカ', 'replica'];

async function main() {
  const pausedListings = await prisma.listing.findMany({
    where: { status: 'PAUSED', marketplace: 'JOOM' },
    include: { product: true },
  });

  console.log('=== PAUSED Re-evaluation ===');
  console.log('Total PAUSED:', pausedListings.length);

  let reactivated = 0;
  let stillPaused = 0;

  for (const listing of pausedListings) {
    const product = listing.product;
    const title = (product.titleEn || product.title || '').toLowerCase();
    const brand = (product.brand || '').toLowerCase();

    if (product.price > 900000) {
      stillPaused++;
      console.log('  SKIP (price):', product.titleEn?.substring(0, 40));
      continue;
    }

    const isWhitelisted = BRAND_WHITELIST.some(b => title.includes(b) || brand.includes(b));

    let isSafe = true;
    if (!isWhitelisted) {
      for (const keyword of EXCLUDED_KEYWORDS) {
        if (title.includes(keyword.toLowerCase())) {
          isSafe = false;
          break;
        }
      }
    }

    if (isSafe) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: {
          status: 'ACTIVE',
          marketplaceData: {
            ...(listing.marketplaceData as object || {}),
            reactivatedAt: new Date().toISOString(),
            reactivatedBy: 'phase4-reevaluation',
          },
        },
      });
      reactivated++;
      console.log('  ✅ REACTIVATED:', product.titleEn?.substring(0, 40));
    } else {
      stillPaused++;
      console.log('  SKIP (keyword):', product.titleEn?.substring(0, 40));
    }
  }

  console.log('\n=== Result ===');
  console.log('Reactivated:', reactivated);
  console.log('Still PAUSED:', stillPaused);

  await prisma.$disconnect();
}

main().catch(console.error);
