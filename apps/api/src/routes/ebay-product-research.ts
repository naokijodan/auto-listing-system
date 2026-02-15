import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================
// 型定義
// ============================================

// 調査タイプ
const RESEARCH_TYPES = {
  TRENDING: 'TRENDING',       // トレンド商品
  TOP_SELLERS: 'TOP_SELLERS', // 売れ筋
  NICHE: 'NICHE',             // ニッチ商品
  SEASONAL: 'SEASONAL',       // 季節商品
  OPPORTUNITY: 'OPPORTUNITY', // 機会発見
} as const;

// 期間
const TIME_PERIODS = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  QUARTER: 'QUARTER',
  YEAR: 'YEAR',
} as const;

// トレンド方向
const TREND_DIRECTIONS = {
  UP: 'UP',
  DOWN: 'DOWN',
  STABLE: 'STABLE',
} as const;

// 競合レベル
const COMPETITION_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  VERY_HIGH: 'VERY_HIGH',
} as const;

// 利益ポテンシャル
const PROFIT_POTENTIALS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  EXCELLENT: 'EXCELLENT',
} as const;

// ============================================
// モックデータ
// ============================================

// トレンド商品
const mockTrendingProducts: any[] = [
  {
    id: 'trend-1',
    title: 'Vintage Seiko 5 Automatic Watch 1970s',
    category: 'Watches',
    categoryId: 'cat-5-1',
    averagePrice: 245.00,
    priceRange: { min: 120, max: 450 },
    soldCount: 1247,
    soldCountChange: 32.5,
    listingCount: 3421,
    sellThroughRate: 36.4,
    averageDaysToSell: 8.2,
    trendDirection: 'UP',
    trendScore: 94,
    competitionLevel: 'MEDIUM',
    profitPotential: 'HIGH',
    keywords: ['vintage', 'seiko', 'automatic', '1970s', 'mechanical'],
    topSellers: [
      { sellerId: 'seller-1', name: 'vintage_watch_japan', sales: 156, rating: 99.8 },
      { sellerId: 'seller-2', name: 'tokyo_timepieces', sales: 134, rating: 99.6 },
    ],
    demandScore: 92,
    supplyScore: 65,
    priceStability: 78,
    seasonality: { peak: ['November', 'December'], low: ['July', 'August'] },
  },
  {
    id: 'trend-2',
    title: 'Canon EOS R5 Mirrorless Camera Body',
    category: 'Digital Cameras',
    categoryId: 'cat-3-1',
    averagePrice: 3299.00,
    priceRange: { min: 2800, max: 3800 },
    soldCount: 423,
    soldCountChange: 18.2,
    listingCount: 892,
    sellThroughRate: 47.4,
    averageDaysToSell: 5.1,
    trendDirection: 'UP',
    trendScore: 88,
    competitionLevel: 'HIGH',
    profitPotential: 'MEDIUM',
    keywords: ['canon', 'eos', 'r5', 'mirrorless', '8k'],
    topSellers: [
      { sellerId: 'seller-3', name: 'camera_pro_shop', sales: 67, rating: 99.9 },
    ],
    demandScore: 89,
    supplyScore: 72,
    priceStability: 85,
    seasonality: { peak: ['March', 'September'], low: ['January', 'February'] },
  },
  {
    id: 'trend-3',
    title: 'Nintendo Switch OLED Console',
    category: 'Video Games',
    categoryId: 'cat-6-1',
    averagePrice: 329.00,
    priceRange: { min: 290, max: 380 },
    soldCount: 2156,
    soldCountChange: -5.3,
    listingCount: 4523,
    sellThroughRate: 47.7,
    averageDaysToSell: 3.2,
    trendDirection: 'STABLE',
    trendScore: 75,
    competitionLevel: 'VERY_HIGH',
    profitPotential: 'LOW',
    keywords: ['nintendo', 'switch', 'oled', 'console', 'gaming'],
    topSellers: [],
    demandScore: 95,
    supplyScore: 92,
    priceStability: 90,
    seasonality: { peak: ['November', 'December'], low: ['February', 'March'] },
  },
];

// ニッチ商品
const mockNicheProducts: any[] = [
  {
    id: 'niche-1',
    title: 'Japanese Fountain Pen Vintage Pilot',
    category: 'Pens & Writing Instruments',
    averagePrice: 185.00,
    soldCount: 89,
    listingCount: 156,
    sellThroughRate: 57.1,
    competitionLevel: 'LOW',
    profitPotential: 'EXCELLENT',
    trendScore: 72,
    searchVolume: 2340,
    supplierAvailability: 'MEDIUM',
  },
  {
    id: 'niche-2',
    title: 'Vintage Japanese Woodblock Print Ukiyo-e',
    category: 'Art',
    averagePrice: 320.00,
    soldCount: 45,
    listingCount: 78,
    sellThroughRate: 57.7,
    competitionLevel: 'LOW',
    profitPotential: 'HIGH',
    trendScore: 68,
    searchVolume: 1560,
    supplierAvailability: 'LOW',
  },
];

// 季節商品予測
const mockSeasonalProducts: any[] = [
  {
    id: 'seasonal-1',
    title: 'Cherry Blossom Themed Items',
    category: 'Collectibles',
    peakMonths: ['March', 'April'],
    currentDemand: 45,
    peakDemand: 100,
    daysUntilPeak: 45,
    recommendedAction: 'START_SOURCING',
    historicalSalesIncrease: 245,
    topProducts: [
      { title: 'Japanese Cherry Blossom Tea Set', avgPrice: 89 },
      { title: 'Sakura Kimono', avgPrice: 245 },
    ],
  },
  {
    id: 'seasonal-2',
    title: 'Japanese Hiking Gear',
    category: 'Sporting Goods',
    peakMonths: ['May', 'June', 'September', 'October'],
    currentDemand: 72,
    peakDemand: 100,
    daysUntilPeak: 90,
    recommendedAction: 'PREPARE_INVENTORY',
    historicalSalesIncrease: 180,
    topProducts: [
      { title: 'Mont-bell Hiking Backpack', avgPrice: 165 },
      { title: 'Japanese Trekking Poles', avgPrice: 78 },
    ],
  },
];

// 機会発見
const mockOpportunities: any[] = [
  {
    id: 'opp-1',
    type: 'PRICE_GAP',
    title: 'Vintage Casio G-Shock DW-5600',
    description: 'Japanese market price significantly lower than US market',
    japanPrice: 8500, // JPY
    usPrice: 125, // USD
    potentialProfit: 45,
    profitMargin: 56,
    riskLevel: 'LOW',
    actionRequired: 'Source from Yahoo Auctions Japan',
    expiresIn: '7 days',
    confidence: 92,
  },
  {
    id: 'opp-2',
    type: 'TRENDING_UP',
    title: 'Vintage Olympus OM-1 Film Camera',
    description: 'Film photography revival driving demand up 45% MoM',
    currentPrice: 280,
    predictedPrice: 350,
    potentialProfit: 70,
    profitMargin: 25,
    riskLevel: 'MEDIUM',
    actionRequired: 'Stock up on clean examples',
    expiresIn: '30 days',
    confidence: 78,
  },
  {
    id: 'opp-3',
    type: 'SUPPLY_SHORTAGE',
    title: 'Sony A7IV Camera Body',
    description: 'Supply chain issues causing temporary shortage',
    currentPrice: 2498,
    normalPrice: 2298,
    premiumPercent: 8.7,
    riskLevel: 'MEDIUM',
    actionRequired: 'Sell existing inventory at premium',
    expiresIn: '14 days',
    confidence: 85,
  },
];

// 検索ボリュームデータ
const mockSearchVolumes: Record<string, any> = {
  'seiko watch': {
    keyword: 'seiko watch',
    volume: 142000,
    volumeChange: 12.5,
    trend: 'UP',
    relatedKeywords: ['seiko 5', 'seiko automatic', 'seiko presage', 'vintage seiko'],
    competition: 'HIGH',
    suggestedBid: 0.85,
  },
  'canon camera': {
    keyword: 'canon camera',
    volume: 234000,
    volumeChange: 5.2,
    trend: 'STABLE',
    relatedKeywords: ['canon eos', 'canon mirrorless', 'canon r5', 'canon lens'],
    competition: 'VERY_HIGH',
    suggestedBid: 1.25,
  },
};

// 価格履歴
const mockPriceHistory: any[] = [
  { date: '2026-01-01', price: 225 },
  { date: '2026-01-15', price: 232 },
  { date: '2026-02-01', price: 238 },
  { date: '2026-02-15', price: 245 },
];

// 保存した調査
const mockSavedResearches: Record<string, any> = {
  'research-1': {
    id: 'research-1',
    name: 'ビンテージ腕時計調査',
    type: 'TRENDING',
    keywords: ['vintage watch', 'seiko', 'citizen'],
    categories: ['Watches'],
    filters: { minPrice: 100, maxPrice: 500, minSellThrough: 30 },
    createdAt: '2026-02-10T00:00:00Z',
    lastRunAt: '2026-02-15T08:00:00Z',
    resultCount: 156,
    alerts: true,
  },
  'research-2': {
    id: 'research-2',
    name: 'カメラ機会発見',
    type: 'OPPORTUNITY',
    keywords: ['camera', 'lens', 'mirrorless'],
    categories: ['Cameras & Photo'],
    filters: { minProfit: 50 },
    createdAt: '2026-02-01T00:00:00Z',
    lastRunAt: '2026-02-15T06:00:00Z',
    resultCount: 23,
    alerts: true,
  },
};

// 統計
const mockStats = {
  totalResearches: 45,
  activeAlerts: 12,
  opportunitiesFound: 89,
  profitGenerated: 12450,
  topCategories: [
    { category: 'Watches', searches: 23, opportunities: 34 },
    { category: 'Cameras', searches: 18, opportunities: 28 },
    { category: 'Electronics', searches: 12, opportunities: 15 },
  ],
  recentSearches: [
    { keyword: 'vintage seiko', timestamp: '2026-02-15T11:00:00Z' },
    { keyword: 'canon lens', timestamp: '2026-02-15T10:30:00Z' },
    { keyword: 'nintendo switch', timestamp: '2026-02-15T09:45:00Z' },
  ],
  weeklyTrend: {
    searches: [45, 52, 48, 61, 55, 58, 62],
    opportunities: [8, 12, 9, 15, 11, 14, 16],
  },
};

// ============================================
// バリデーションスキーマ
// ============================================

const searchProductsSchema = z.object({
  keyword: z.string().min(1),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minSellThrough: z.number().optional(),
  sortBy: z.enum(['trendScore', 'soldCount', 'profitPotential', 'competition']).optional(),
  limit: z.number().optional(),
});

const analyzeProductSchema = z.object({
  productId: z.string().optional(),
  keyword: z.string().optional(),
  ebayItemId: z.string().optional(),
});

const saveResearchSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['TRENDING', 'TOP_SELLERS', 'NICHE', 'SEASONAL', 'OPPORTUNITY']),
  keywords: z.array(z.string()),
  categories: z.array(z.string()).optional(),
  filters: z.object({
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minSellThrough: z.number().optional(),
    minProfit: z.number().optional(),
  }).optional(),
  alerts: z.boolean().optional(),
});

const compareProductsSchema = z.object({
  productIds: z.array(z.string()).min(2).max(5),
});

// ============================================
// エンドポイント
// ============================================

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const dashboard = {
      stats: mockStats,
      topTrending: mockTrendingProducts.slice(0, 5),
      recentOpportunities: mockOpportunities.slice(0, 3),
      upcomingSeasonal: mockSeasonalProducts.filter(s => s.daysUntilPeak <= 60),
      savedResearches: Object.values(mockSavedResearches).slice(0, 5),
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// トレンド商品検索
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { category, period = 'WEEK', limit = '20' } = req.query;
    let products = [...mockTrendingProducts];

    if (category) {
      products = products.filter(p => p.category === category);
    }

    // トレンドスコアでソート
    products.sort((a, b) => b.trendScore - a.trendScore);
    products = products.slice(0, parseInt(limit as string));

    res.json({
      products,
      total: products.length,
      period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending products' });
  }
});

// 商品検索
router.post('/search', async (req: Request, res: Response) => {
  try {
    const validation = searchProductsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { keyword, category, minPrice, maxPrice, minSellThrough, sortBy, limit = 20 } = validation.data;
    let results = [...mockTrendingProducts, ...mockNicheProducts];

    // キーワードフィルター
    const keywordLower = keyword.toLowerCase();
    results = results.filter(p =>
      p.title.toLowerCase().includes(keywordLower) ||
      p.keywords?.some((k: string) => k.toLowerCase().includes(keywordLower))
    );

    // カテゴリフィルター
    if (category) {
      results = results.filter(p => p.category === category);
    }

    // 価格フィルター
    if (minPrice !== undefined) {
      results = results.filter(p => p.averagePrice >= minPrice);
    }
    if (maxPrice !== undefined) {
      results = results.filter(p => p.averagePrice <= maxPrice);
    }

    // 売れ行きフィルター
    if (minSellThrough !== undefined) {
      results = results.filter(p => p.sellThroughRate >= minSellThrough);
    }

    // ソート
    if (sortBy) {
      results.sort((a, b) => {
        switch (sortBy) {
          case 'trendScore': return (b.trendScore || 0) - (a.trendScore || 0);
          case 'soldCount': return (b.soldCount || 0) - (a.soldCount || 0);
          case 'profitPotential':
            const potentialOrder: Record<string, number> = { EXCELLENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            return (potentialOrder[b.profitPotential] || 0) - (potentialOrder[a.profitPotential] || 0);
          case 'competition':
            const compOrder: Record<string, number> = { LOW: 4, MEDIUM: 3, HIGH: 2, VERY_HIGH: 1 };
            return (compOrder[b.competitionLevel] || 0) - (compOrder[a.competitionLevel] || 0);
          default: return 0;
        }
      });
    }

    results = results.slice(0, limit);

    // 検索履歴を記録
    mockStats.recentSearches.unshift({
      keyword,
      timestamp: new Date().toISOString(),
    });
    mockStats.recentSearches = mockStats.recentSearches.slice(0, 10);

    res.json({
      results,
      total: results.length,
      keyword,
      filters: { category, minPrice, maxPrice, minSellThrough },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// 商品詳細分析
router.get('/analyze/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = mockTrendingProducts.find(p => p.id === productId) ||
                    mockNicheProducts.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const analysis = {
      ...product,
      priceHistory: mockPriceHistory,
      competitorAnalysis: {
        totalSellers: 45,
        averageRating: 98.5,
        averageShippingDays: 5.2,
        priceDistribution: [
          { range: '$100-150', count: 12 },
          { range: '$150-200', count: 18 },
          { range: '$200-250', count: 23 },
          { range: '$250-300', count: 15 },
          { range: '$300+', count: 8 },
        ],
      },
      demandForecast: {
        next7Days: 85,
        next30Days: 92,
        next90Days: 88,
        confidence: 78,
      },
      recommendations: [
        { action: 'BUY', reason: 'Strong upward trend with low competition', priority: 'HIGH' },
        { action: 'PRICE', reason: 'Optimal price point: $230-250', priority: 'MEDIUM' },
        { action: 'TIMING', reason: 'Best listing time: Sunday evenings', priority: 'LOW' },
      ],
      sourcingSuggestions: [
        { platform: 'Yahoo Auctions JP', avgPrice: 18500, availability: 'HIGH' },
        { platform: 'Mercari JP', avgPrice: 19800, availability: 'MEDIUM' },
        { platform: 'Rakuma', avgPrice: 17200, availability: 'LOW' },
      ],
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze product' });
  }
});

// ニッチ商品発見
router.get('/niche', async (req: Request, res: Response) => {
  try {
    const { category, minProfit, limit = '20' } = req.query;
    let products = [...mockNicheProducts];

    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (minProfit) {
      const profitOrder: Record<string, number> = { EXCELLENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const minLevel = minProfit === 'HIGH' ? 3 : minProfit === 'EXCELLENT' ? 4 : 2;
      products = products.filter(p => (profitOrder[p.profitPotential] || 0) >= minLevel);
    }

    products = products.slice(0, parseInt(limit as string));

    res.json({
      products,
      total: products.length,
      criteria: {
        lowCompetition: true,
        highProfitPotential: true,
        steadyDemand: true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch niche products' });
  }
});

// 季節商品予測
router.get('/seasonal', async (_req: Request, res: Response) => {
  try {
    const currentMonth = new Date().getMonth();
    const products = mockSeasonalProducts.map(p => ({
      ...p,
      urgency: p.daysUntilPeak <= 30 ? 'HIGH' : p.daysUntilPeak <= 60 ? 'MEDIUM' : 'LOW',
    }));

    // 緊急度でソート
    const urgencyOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    products.sort((a, b) => (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0));

    res.json({
      products,
      currentMonth: currentMonth + 1,
      upcomingPeaks: products.filter(p => p.daysUntilPeak <= 60),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seasonal products' });
  }
});

// 機会発見
router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const { type, minConfidence = '70', limit = '20' } = req.query;
    let opportunities = [...mockOpportunities];

    if (type) {
      opportunities = opportunities.filter(o => o.type === type);
    }

    opportunities = opportunities.filter(o => o.confidence >= parseInt(minConfidence as string));
    opportunities.sort((a, b) => b.confidence - a.confidence);
    opportunities = opportunities.slice(0, parseInt(limit as string));

    res.json({
      opportunities,
      total: opportunities.length,
      types: {
        PRICE_GAP: opportunities.filter(o => o.type === 'PRICE_GAP').length,
        TRENDING_UP: opportunities.filter(o => o.type === 'TRENDING_UP').length,
        SUPPLY_SHORTAGE: opportunities.filter(o => o.type === 'SUPPLY_SHORTAGE').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// キーワード分析
router.get('/keywords/:keyword', async (req: Request, res: Response) => {
  try {
    const { keyword } = req.params;
    const keywordLower = keyword.toLowerCase();

    // モックデータから検索
    const data = mockSearchVolumes[keywordLower] || {
      keyword,
      volume: Math.floor(Math.random() * 100000) + 10000,
      volumeChange: (Math.random() * 20 - 10).toFixed(1),
      trend: Math.random() > 0.5 ? 'UP' : 'STABLE',
      relatedKeywords: [],
      competition: 'MEDIUM',
      suggestedBid: (Math.random() * 2).toFixed(2),
    };

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze keyword' });
  }
});

// 価格履歴取得
router.get('/price-history/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { period = 'MONTH' } = req.query;

    // モック価格履歴を生成
    const history: any[] = [];
    const now = new Date();
    let days = 30;

    if (period === 'WEEK') days = 7;
    else if (period === 'QUARTER') days = 90;
    else if (period === 'YEAR') days = 365;

    const basePrice = 200 + Math.random() * 100;

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const variation = (Math.random() - 0.5) * 20;
      history.push({
        date: date.toISOString().split('T')[0],
        price: Math.round((basePrice + variation) * 100) / 100,
        volume: Math.floor(Math.random() * 50) + 10,
      });
    }

    res.json({
      productId,
      period,
      history,
      stats: {
        minPrice: Math.min(...history.map(h => h.price)),
        maxPrice: Math.max(...history.map(h => h.price)),
        avgPrice: history.reduce((sum, h) => sum + h.price, 0) / history.length,
        priceChange: ((history[history.length - 1].price - history[0].price) / history[0].price * 100).toFixed(1),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

// 商品比較
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const validation = compareProductsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { productIds } = validation.data;
    const allProducts = [...mockTrendingProducts, ...mockNicheProducts];
    const products = productIds
      .map(id => allProducts.find(p => p.id === id))
      .filter(Boolean);

    if (products.length < 2) {
      return res.status(400).json({ error: 'At least 2 valid products required' });
    }

    const comparison = {
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        averagePrice: p.averagePrice,
        soldCount: p.soldCount,
        sellThroughRate: p.sellThroughRate,
        trendScore: p.trendScore,
        competitionLevel: p.competitionLevel,
        profitPotential: p.profitPotential,
      })),
      recommendation: {
        bestOverall: products.reduce((best, p) =>
          (p.trendScore || 0) > (best.trendScore || 0) ? p : best
        ).id,
        bestProfit: products.reduce((best, p) => {
          const order: Record<string, number> = { EXCELLENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (order[p.profitPotential] || 0) > (order[best.profitPotential] || 0) ? p : best;
        }).id,
        lowestCompetition: products.reduce((best, p) => {
          const order: Record<string, number> = { LOW: 4, MEDIUM: 3, HIGH: 2, VERY_HIGH: 1 };
          return (order[p.competitionLevel] || 0) > (order[best.competitionLevel] || 0) ? p : best;
        }).id,
      },
    };

    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compare products' });
  }
});

// 調査保存
router.post('/saved', async (req: Request, res: Response) => {
  try {
    const validation = saveResearchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const newResearch = {
      id: `research-${Date.now()}`,
      ...validation.data,
      createdAt: new Date().toISOString(),
      lastRunAt: null,
      resultCount: 0,
    };

    mockSavedResearches[newResearch.id] = newResearch;

    res.status(201).json(newResearch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save research' });
  }
});

// 保存した調査一覧
router.get('/saved', async (_req: Request, res: Response) => {
  try {
    const researches = Object.values(mockSavedResearches);

    res.json({
      researches,
      total: researches.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch saved researches' });
  }
});

// 保存した調査実行
router.post('/saved/:researchId/run', async (req: Request, res: Response) => {
  try {
    const { researchId } = req.params;
    const research = mockSavedResearches[researchId];

    if (!research) {
      return res.status(404).json({ error: 'Research not found' });
    }

    // 調査を実行（モック）
    const results = mockTrendingProducts.slice(0, 5);

    research.lastRunAt = new Date().toISOString();
    research.resultCount = results.length;

    res.json({
      research,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to run research' });
  }
});

// 保存した調査削除
router.delete('/saved/:researchId', async (req: Request, res: Response) => {
  try {
    const { researchId } = req.params;

    if (!mockSavedResearches[researchId]) {
      return res.status(404).json({ error: 'Research not found' });
    }

    delete mockSavedResearches[researchId];

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete research' });
  }
});

// 統計情報
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    res.json(mockStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// カテゴリ一覧（調査用）
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = [
      { id: 'watches', name: 'Watches', productCount: 15420, avgProfit: 45 },
      { id: 'cameras', name: 'Cameras & Photo', productCount: 12500, avgProfit: 38 },
      { id: 'electronics', name: 'Consumer Electronics', productCount: 28400, avgProfit: 25 },
      { id: 'art', name: 'Art', productCount: 5230, avgProfit: 52 },
      { id: 'clothing', name: 'Clothing, Shoes & Accessories', productCount: 45200, avgProfit: 35 },
      { id: 'collectibles', name: 'Collectibles', productCount: 32100, avgProfit: 42 },
      { id: 'games', name: 'Video Games', productCount: 18900, avgProfit: 28 },
      { id: 'music', name: 'Musical Instruments', productCount: 8700, avgProfit: 40 },
    ];

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// 設定取得
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = {
      defaultCategory: null,
      alertsEnabled: true,
      alertThreshold: {
        trendScore: 80,
        profitPotential: 'HIGH',
        competition: 'LOW',
      },
      autoRefresh: true,
      refreshInterval: 6, // hours
      currency: 'USD',
      sourcingRegion: 'JP',
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 設定更新
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const settings = {
      defaultCategory: updates.defaultCategory ?? null,
      alertsEnabled: updates.alertsEnabled ?? true,
      alertThreshold: updates.alertThreshold ?? {},
      autoRefresh: updates.autoRefresh ?? true,
      refreshInterval: updates.refreshInterval ?? 6,
      currency: updates.currency ?? 'USD',
      sourcingRegion: updates.sourcingRegion ?? 'JP',
      updatedAt: new Date().toISOString(),
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export const ebayProductResearchRouter = router;
