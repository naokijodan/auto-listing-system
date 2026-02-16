/**
 * Phase 45: eBayカテゴリマッパーのテスト
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapToEbayCategory,
  suggestCategories,
  getAllCategories,
  getItemSpecificsForCategory,
  inferCategoryFromText,
  fuzzyMatchCategory,
  EBAY_CATEGORY_MAP,
  CATEGORY_ALIASES,
} from '../ebay-category-mapper';

// OpenAI モック
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  category: '腕時計',
                  confidence: 0.9,
                  reasoning: 'SEIKOブランドの時計',
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

describe('eBayカテゴリマッパー', () => {
  describe('EBAY_CATEGORY_MAP', () => {
    it('主要カテゴリが定義されている', () => {
      expect(EBAY_CATEGORY_MAP['腕時計']).toBeDefined();
      expect(EBAY_CATEGORY_MAP['腕時計'].categoryId).toBe('31387');
      expect(EBAY_CATEGORY_MAP['腕時計'].categoryName).toBe('Wristwatches');
    });

    it('各カテゴリにcategoryIdとcategoryNameがある', () => {
      for (const [key, value] of Object.entries(EBAY_CATEGORY_MAP)) {
        expect(value.categoryId, `${key} should have categoryId`).toBeTruthy();
        expect(value.categoryName, `${key} should have categoryName`).toBeTruthy();
        expect(value.categoryPath, `${key} should have categoryPath`).toBeTruthy();
      }
    });

    it('ItemSpecificsを持つカテゴリがある', () => {
      const categoriesWithSpecifics = Object.entries(EBAY_CATEGORY_MAP)
        .filter(([_, v]) => v.itemSpecifics && Object.keys(v.itemSpecifics).length > 0);

      expect(categoriesWithSpecifics.length).toBeGreaterThan(5);
    });
  });

  describe('CATEGORY_ALIASES', () => {
    it('エイリアスが定義されている', () => {
      expect(CATEGORY_ALIASES['腕時計']).toBeDefined();
      expect(CATEGORY_ALIASES['腕時計']).toContain('ウォッチ');
      expect(CATEGORY_ALIASES['腕時計']).toContain('watch');
    });
  });

  describe('inferCategoryFromText', () => {
    it('ブランドからカテゴリを推定', () => {
      const result = inferCategoryFromText('SEIKO プレサージュ メンズ');
      expect(result.category).toBe('腕時計');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.hints).toContain('Brand detected: SEIKO');
    });

    it('直接キーワードでカテゴリを推定', () => {
      const result = inferCategoryFromText('アニメフィギュア 初音ミク');
      expect(result.category).toBe('アニメフィギュア');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('カテゴリが見つからない場合', () => {
      const result = inferCategoryFromText('何かよくわからないもの');
      expect(result.category).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('複数ブランドから正しいカテゴリを推定', () => {
      const testCases = [
        { title: 'CITIZEN エコドライブ', expected: '腕時計' },
        { title: 'LOUIS VUITTON モノグラム', expected: 'バッグ' },
        { title: 'BANDAI ガンプラ RX-78', expected: 'フィギュア' },
        { title: 'CANON EOS R5 ミラーレス', expected: 'カメラ' },
      ];

      for (const tc of testCases) {
        const result = inferCategoryFromText(tc.title);
        expect(result.category, `${tc.title} should be ${tc.expected}`).toBe(tc.expected);
      }
    });
  });

  describe('fuzzyMatchCategory', () => {
    it('完全一致', () => {
      const result = fuzzyMatchCategory('腕時計');
      expect(result.category).toBe('腕時計');
      expect(result.similarity).toBe(1);
    });

    it('部分一致', () => {
      // 「時計パーツ」カテゴリとの類似度をチェック
      const result = fuzzyMatchCategory('時計パーツ');
      expect(result.category).toBe('時計パーツ');
      expect(result.similarity).toBe(1);
    });

    it('エイリアス一致', () => {
      const result = fuzzyMatchCategory('watch');
      expect(result.category).toBe('腕時計');
      expect(result.similarity).toBeGreaterThan(0.5);
    });

    it('閾値以下は一致しない', () => {
      const result = fuzzyMatchCategory('あいうえお', 0.9);
      expect(result.category).toBeNull();
    });
  });

  describe('mapToEbayCategory', () => {
    it('完全一致でマッピング', async () => {
      const result = await mapToEbayCategory('腕時計', 'テスト', '', false);
      expect(result.categoryId).toBe('31387');
      expect(result.confidence).toBe(1.0);
      expect(result.source).toBe('exact');
    });

    it('エイリアスでマッピング', async () => {
      // 'watch'はCATEGORY_ALIASESにのみ存在（EBAY_CATEGORY_MAPには直接定義なし）
      const result = await mapToEbayCategory('watch', 'テスト', '', false);
      expect(result.categoryId).toBe('31387');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.source).toBe('alias');
    });

    it('テキストからマッピング', async () => {
      const result = await mapToEbayCategory(null, 'SEIKO プレサージュ 自動巻き', '', false);
      expect(result.categoryId).toBe('31387');
      expect(result.source).toBe('fuzzy');
    });

    it('フォールバック', async () => {
      const result = await mapToEbayCategory(null, 'よくわからないもの', '', false);
      expect(result.categoryId).toBe('99');
      expect(result.source).toBe('fallback');
      expect(result.confidence).toBeLessThan(0.2);
    });

    it('ItemSpecificsが含まれる', async () => {
      const result = await mapToEbayCategory('ポケモンカード', 'テスト', '', false);
      expect(result.itemSpecifics).toBeDefined();
      expect(result.itemSpecifics?.Game).toContain('Pokémon TCG');
    });
  });

  describe('suggestCategories', () => {
    it('クエリに基づいてサジェスト', () => {
      const results = suggestCategories('時計');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].category).toContain('時計');
    });

    it('上限を守る', () => {
      const results = suggestCategories('', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('類似度順にソート', () => {
      const results = suggestCategories('腕時計');
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity).toBeLessThanOrEqual(results[i - 1].similarity);
      }
    });
  });

  describe('getAllCategories', () => {
    it('全カテゴリを取得', () => {
      const categories = getAllCategories();
      expect(categories.length).toBe(Object.keys(EBAY_CATEGORY_MAP).length);
    });

    it('必要なフィールドを持つ', () => {
      const categories = getAllCategories();
      for (const cat of categories) {
        expect(cat.category).toBeTruthy();
        expect(cat.categoryId).toBeTruthy();
        expect(cat.categoryName).toBeTruthy();
        expect(cat.categoryPath).toBeTruthy();
      }
    });
  });

  describe('getItemSpecificsForCategory', () => {
    it('ItemSpecificsを取得', () => {
      const specifics = getItemSpecificsForCategory('31387'); // Wristwatches
      expect(specifics).toBeDefined();
    });

    it('存在しないカテゴリ', () => {
      const specifics = getItemSpecificsForCategory('99999999');
      expect(specifics).toBeUndefined();
    });
  });
});

describe('カテゴリマッピングの網羅性', () => {
  const expectedCategories = [
    '腕時計',
    'アニメフィギュア',
    'ゲームソフト',
    'トレーディングカード',
    'バッグ',
    'カメラ',
    'ゴルフ',
  ];

  it.each(expectedCategories)('%s カテゴリが定義されている', (category) => {
    expect(EBAY_CATEGORY_MAP[category]).toBeDefined();
  });
});

describe('ブランド推定の精度', () => {
  const brandTests = [
    { brand: 'SEIKO', expected: '腕時計' },
    { brand: 'CITIZEN', expected: '腕時計' },
    { brand: 'OMEGA', expected: '腕時計' },
    { brand: 'ROLEX', expected: '腕時計' },
    { brand: 'GUCCI', expected: 'バッグ' },
    { brand: 'LOUIS VUITTON', expected: 'バッグ' },
    { brand: 'CANON', expected: 'カメラ' },
    { brand: 'NIKON', expected: 'カメラ' },
  ];

  it.each(brandTests)('$brand -> $expected', ({ brand, expected }) => {
    const result = inferCategoryFromText(`${brand} 商品テスト`);
    expect(result.category).toBe(expected);
  });
});
