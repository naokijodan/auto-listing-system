import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// =============================================================
// Phase 291: eBay Category Explorerï¼ˆã‚«ãƒ†ã‚´ãƒªæŽ¢ç´¢ï¼‰
// 28ã‚¨ãƒ³ãƒ‰ãƒã‚¤ãƒ³ãƒˆ - ãƒ†ãƒ¼ãƒžã‚«ãƒ©ãƒ¼: teal-600
// =============================================================

// ã‚¹ã‚­ãƒ¼ãƒž
const categorySearchSchema = z.object({
  query: z.string().min(1),
  marketplace: z.enum(['US', 'UK', 'DE', 'AU']).optional(),
});

// ========== ãƒ€ãƒƒã‚·ãƒ¥ãƒœãƒ¼ãƒ‰ ==========
router.get('/dashboard', async (req: Request, res: Response) => {
  res.json({
    totalCategories: 5000,
    topLevelCategories: 50,
    savedCategories: 25,
    recentSearches: 30,
    mostUsedCategory: 'Jewelry & Watches',
    avgFeeRate: 12.5,
  });
});

router.get('/dashboard/popular', async (req: Request, res: Response) => {
  res.json({
    popular: [
      { id: '281104', name: 'Wristwatches', listings: 1500000, feeRate: 11.5 },
      { id: '175684', name: 'Cell Phones & Smartphones', listings: 1200000, feeRate: 13.25 },
      { id: '2614', name: 'Video Games', listings: 800000, feeRate: 12.9 },
    ],
  });
});

router.get('/dashboard/trending', async (req: Request, res: Response) => {
  res.json({
    trending: [
      { id: '2224', name: 'Vintage Watches', growth: 25 },
      { id: '26106', name: 'NVIDIA Graphics Cards', growth: 18 },
      { id: '150032', name: 'Collectible Card Games', growth: 15 },
    ],
  });
});

// ========== ã‚«ãƒ†ã‚´ãƒªæ¤œç´¢ ==========
router.post('/search', async (req: Request, res: Response) => {
  const parsed = categorySearchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid search', details: parsed.error.issues });
  }
  res.json({
    query: parsed.data.query,
    results: [
      { id: '281104', name: 'Wristwatches', path: 'Jewelry & Watches > Watches > Wristwatches', feeRate: 11.5 },
      { id: '14324', name: 'Watch Parts', path: 'Jewelry & Watches > Watches > Parts', feeRate: 12.0 },
    ],
    total: 25,
  });
});

router.get('/suggestions', async (req: Request, res: Response) => {
  const query = req.query.q as string;
  res.json({
    suggestions: [
      { id: '281104', name: 'Wristwatches' },
      { id: '14324', name: 'Watch Parts' },
      { id: '2224', name: 'Vintage Watches' },
    ],
  });
});

// ========== ã‚«ãƒ†ã‚´ãƒªãƒ„ãƒªãƒ¼ ==========
router.get('/tree', async (req: Request, res: Response) => {
  res.json({
    categories: [
      { id: '281100', name: 'Jewelry & Watches', children: 15 },
      { id: '55', name: 'Collectibles & Art', children: 20 },
      { id: '11233', name: 'Electronics', children: 25 },
    ],
    total: 50,
  });
});

router.get('/tree/:id', async (req: Request, res: Response) => {
  res.json({
    id: req.params.id,
    name: 'Jewelry & Watches',
    children: [
      { id: '281104', name: 'Wristwatches', children: 10 },
      { id: '281102', name: 'Pocket Watches', children: 5 },
      { id: '14324', name: 'Watch Parts', children: 8 },
    ],
  });
});

// ========== ã‚«ãƒ†ã‚´ãƒªè©³ç´° ‚OOOOOOOOOBœ›Ý]\‹™Ù]
	ËØØ]YÛÜšY\ËÎšY	Ë\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆYˆ™\Kœ\˜[\ËšYˆ˜[YNˆ	ÕÜš\ÝØ]Ú\ÉËˆ]ˆÉÒ™]Ù[žH	ˆØ]Ú\ÉË	ÕØ]Ú\ÉË	ÕÜš\ÝØ]Ú\É×Kˆ™YT˜]NˆLKKˆ\Ý[™ÜÎˆMLˆ]™ÔšXÙNˆKˆÛÛ\]][ÛŽˆ	ÒQÒ	Ëˆ™\]Z\™YÜXÚYšXÜÎˆÉÐœ˜[™	Ë	Ó[Ý™[Y[	Ë	ÐØ\ÙHÚ^™I×Kˆ™XÛÛ[Y[™YÜXÚYšXÜÎˆÉÑX[ÛÛÜ‰Ë	Ð˜[™X]\šX[	Ë	ÕØ]\ˆ™\Ú\Ý[˜ÙI×KˆJNÂŸJNÂ‚œ›Ý]\‹™Ù]
	ËØØ]YÛÜšY\ËÎšYÜÝ]ÉË\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆYˆ™\Kœ\˜[\ËšYˆ\Ý[™ÜÎˆMLˆÛÛ\ÝÌ^\ÎˆLˆ]™ÔšXÙNˆKˆ]™ÔÛÛšXÙNˆŒŒˆÙ[›ÝYÚ˜]NˆÌËŒËˆšXÙT˜[™ÙNˆÈZ[ŽˆŒX^ˆLKˆJNÂŸJNÂ‚œ›Ý]\‹™Ù]
	ËØØ]YÛÜšY\ËÎšYÜÜXÚYšXÜÉË\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆYˆ™\Kœ\˜[\ËšYˆÜXÚYšXÜÎˆÂˆÈ˜[YNˆ	Ðœ˜[™	Ë™\]Z\™YˆYK˜[Y\ÎˆÉÔÙZZÛÉË	ÐØ\Ú[ÉË	ÓÜšY[	Ë	ÐÚ]^™[‰×HKˆÈ˜[YNˆ	Ó[Ý™[Y[	Ë™\]Z\™YˆYK˜[Y\ÎˆÉÐ]]ÛX]XÉË	Ô]X\‰Ë	ÓYXÚ[šXØ[	×HKˆÈ˜[YNˆ	ÐØ\ÙHÚ^™IË™\]Z\™Yˆ˜[ÙK˜[Y\ÎˆÉÍ[IË	Í›[IË	Í[I×HKˆKˆJNÂŸJNÂ‚‹ËÈOOOOOOOOOH9/çykf8àªøàá¸à­8àêˆOOOOOOOOOBœ›Ý]\‹™Ù]
	ËÜØ]™Y	Ë\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆØ]YÛÜšY\ÎˆÂˆÈYˆ	ÌŽLL	Ë˜[YNˆ	ÕÜš\ÝØ]Ú\ÉËØ]™Y]ˆ	ÌŒ‹L‹LL	ÈKˆÈYˆ	ÌMÌ	Ë˜[YNˆ	ÕØ]Ú\ÉËØ]™Y]ˆ	ÌŒ‹L‹LL‰ÈKˆKˆÝ[ˆKˆJNÂŸJNÂ‚œ›Ý]\‹œÜÝ
	ËÜØ]™Y	Ë\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËœÝ]\ÊŒJKšœÛÛŠÂˆØ]YÛÜžRYˆ™\K˜›ÙK˜Ø]YÛÜžRYˆØ]™Y]ˆ™]È]J
KÒTÓÔÝš[™Ê
KˆJNÂŸJNÂ‚œ›Ý]\‹™[]J	ËÜØ]™YÎšY	Ë\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÈÝXØÙ\ÜÎˆYK[]YYˆ™\Kœ\˜[\ËšYJNÂŸJNÂ‚‹ËÈOOOOOOOOOH8àç¸ààøàå8àìøà¬OOOOOOOOOBœ›Ý]\‹™Ù]
	ËÛX\[™ÜÉË\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆX\[™ÜÎˆÂˆÈYˆ	ÛLIËÛÝ\˜ÙPØ]YÛÜžNˆ	ú!ey¦`º*"	ËX˜^PØ]YÛÜžRYˆ	ÌŽLL	ËX˜^PØ]YÛÜžS˜[YNˆ	ÕÜš\ÝØ]Ú\ÉÈKˆÈYˆ	ÛL‰ËÛÝ\˜ÙPØ]YÛÜžNˆ	ù¤#¹¦`º*"	ËX˜^PØ]YÛÜžRYˆ	ÌŽLL‰ËX˜^PØ]YÛÜžS˜[YNˆ	ÔØÚÙ]Ø]Ú\ÉÈKˆKˆÝ[ˆLˆJNÂŸJNÂ‚œ›Ý]\‹œÜÝ
	ËÛX\[™ÜÉË\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËœÝ]\ÊŒJKšœÛÛŠÂˆYˆX\[™×ÉÑ]K››ÝÊ
_Xˆ‹‹œ™\K˜›ÙKˆÜ™X]Y]ˆ™]È]J
KÒTÓÔÝš[™Ê
KˆJNÂŸJNÂ‚œ›Ý]\‹œ]
	ËÛX\[™ÜËÎšY	Ë\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆYˆ™\Kœ\˜[\ËšYˆ‹‹œ™\K˜›ÙKˆ\]Y]ˆ™]È]J
KÒTÓÔÝš[™Ê
KˆJNÂŸJNÂ‚œ›Ý]\‹™[]J	ËÛX\[™ÜËÎšY	Ë\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÈÝXØÙ\ÜÎˆYK[]YYˆ™\Kœ\˜[\ËšYJNÂŸJNÂ‚‹ËÈOOOOOOOOOH:*+yk¦ˆOOOOOOOOOBœ›Ý]\‹™Ù]
	ËÜÙ][™ÜÉË\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆY˜][X\šÙ]XÙNˆ	ÕTÉËˆÚÝÑ™YT˜]\ÎˆYKˆÚÝÓ\Ý[™ÐÛÝ[ÎˆYKˆ]]ÔÝYÙÙ\ÝˆYKˆJNÂŸJNÂ‚œ›Ý]\‹œ]
	ËÜÙ][™ÜÉË\Þ[˜È
™\Nˆ™\]Y\Ý™\Îˆ™\ÜÛœÙJHOˆÂˆ™\ËšœÛÛŠÂˆ‹‹œ™\K˜›ÙKˆ\]Y]ˆ™]È]J
KÒTÓÔÝš[™Ê
KˆJNÂŸJNÂ‚™^ÜY˜][›Ý]\