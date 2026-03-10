import { describe, it, expect } from 'vitest';
import {
  extractBrand,
  extractColor,
  extractCondition,
  extractMaterial,
  extractSize,
  inferCategory,
  extractAttributes,
  mergeAttributes,
  estimateWeight,
} from '../attribute-extractor';

describe('attribute-extractor', () => {
  describe('extractBrand', () => {
    it('should extract SEIKO brand', () => {
      expect(extractBrand('SEIKO 5 自動巻き 腕時計')).toBe('SEIKO');
    });

    it('should extract brand from Japanese name', () => {
      expect(extractBrand('セイコー クォーツ 時計')).toBe('SEIKO');
    });

    it('should extract CASIO brand', () => {
      expect(extractBrand('カシオ G-SHOCK 腕時計')).toBe('CASIO');
    });

    it('should return undefined for unknown brand', () => {
      expect(extractBrand('ノーブランド 腕時計')).toBeUndefined();
    });

    it('should extract LONGINES as Longines', () => {
      expect(extractBrand('LONGINES Conquest クォーツ 腕時計')).toBe('Longines');
    });
  });

  describe('extractColor', () => {
    it('should extract black color', () => {
      expect(extractColor('ブラック レザーバンド')).toBe('Black');
    });

    it('should extract color from Japanese', () => {
      expect(extractColor('黒い革ベルト')).toBe('Black');
    });

    it('should extract gold color', () => {
      expect(extractColor('ゴールドケース')).toBe('Gold');
    });

    it('should return undefined for no color', () => {
      expect(extractColor('腕時計 自動巻き')).toBeUndefined();
    });
  });

  describe('extractCondition', () => {
    it('should extract new condition', () => {
      expect(extractCondition('新品未使用')).toBe('new');
    });

    it('should extract like_new condition', () => {
      expect(extractCondition('美品 ほぼ使用感なし')).toBe('like_new');
    });

    it('should extract good condition', () => {
      expect(extractCondition('目立った傷や汚れなし')).toBe('good');
    });

    it('should extract fair condition', () => {
      expect(extractCondition('やや傷や汚れあり')).toBe('fair');
    });
  });

  describe('extractMaterial', () => {
    it('should extract stainless steel', () => {
      expect(extractMaterial('ステンレススチールケース')).toBe('Stainless Steel');
    });

    it('should extract leather', () => {
      expect(extractMaterial('本革ベルト')).toBe('Genuine Leather');
    });

    it('should extract titanium', () => {
      expect(extractMaterial('チタン製ケース')).toBe('Titanium');
    });
  });

  describe('extractSize', () => {
    it('should extract case size in mm', () => {
      expect(extractSize('ケースサイズ 42mm')).toBe('42mm');
    });

    it('should extract clothing size', () => {
      expect(extractSize('サイズ: M')).toBe('M');
    });

    it('should extract dimensions', () => {
      expect(extractSize('10x20cm')).toBe('10x20cm');
    });
  });

  describe('inferCategory', () => {
    it('should infer Watches category', () => {
      expect(inferCategory('腕時計 SEIKO')).toBe('Watches');
    });

    it('should infer Jewelry category', () => {
      expect(inferCategory('ネックレス シルバー')).toBe('Necklaces');
    });

    it('should infer Electronics category', () => {
      expect(inferCategory('カメラ Canon')).toBe('Cameras');
    });
  });

  describe('extractAttributes', () => {
    it('should extract multiple attributes from watch listing', () => {
      const title = 'SEIKO 5 自動巻き 腕時計 ブラック';
      const description = '美品です。ケースサイズ42mm、ステンレススチール製。';

      const result = extractAttributes(title, description);

      expect(result.brand).toBe('SEIKO');
      expect(result.color).toBe('Black');
      expect(result.condition).toBe('like_new');
      expect(result.material).toBe('Stainless Steel');
      expect(result.size).toBe('42mm');
      expect(result.category).toBe('Watches');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should build itemSpecifics correctly', () => {
      const result = extractAttributes(
        'SEIKO 腕時計 ブラック',
        '新品 ステンレス製'
      );

      expect(result.itemSpecifics).toEqual(
        expect.objectContaining({
          Brand: 'SEIKO',
          Color: 'Black',
          Material: 'Stainless Steel',
          Condition: 'New',
        })
      );
    });

    it('should include estimated weight in result', () => {
      const result = extractAttributes(
        'SEIKO 腕時計',
        '重量 約150g ステンレス製',
      );
      expect(result.weightGrams).toBe(150);
    });
  });

  describe('mergeAttributes', () => {
    it('should prefer AI attributes over rule-based', () => {
      const aiAttributes = {
        brand: 'Seiko',
        color: 'Midnight Blue',
        confidence: 0.95,
      };

      const ruleAttributes = {
        brand: 'SEIKO',
        color: 'Blue',
        material: 'Stainless Steel',
        itemSpecifics: { Brand: 'SEIKO', Color: 'Blue', Material: 'Stainless Steel' },
        confidence: 0.7,
      };

      const merged = mergeAttributes(aiAttributes, ruleAttributes);

      expect(merged.brand).toBe('Seiko'); // AI優先
      expect(merged.color).toBe('Midnight Blue'); // AI優先
      expect(merged.material).toBe('Stainless Steel'); // ルールベースから
      expect(merged.confidence).toBe(0.95); // AI優先
    });

    it('should merge new fields with AI priority', () => {
      const aiAttributes = {
        weightGrams: 220,
        caseMaterial: 'Titanium',
        bandMaterial: 'Leather',
        waterResistance: '100m',
      } as any;

      const ruleAttributes = {
        itemSpecifics: {},
        confidence: 0.6,
        weightGrams: 150,
        caseMaterial: 'Stainless Steel',
        bandMaterial: 'Metal',
        waterResistance: '50m',
      } as any;

      const merged = mergeAttributes(aiAttributes, ruleAttributes);
      expect(merged.weightGrams).toBe(220);
      expect(merged.caseMaterial).toBe('Titanium');
      expect(merged.bandMaterial).toBe('Leather');
      expect(merged.waterResistance).toBe('100m');
    });
  });

  describe('estimateWeight', () => {
    it('should extract explicit weight in grams from text', () => {
      const text = '重さ約120g、コンパクトな設計です';
      expect(estimateWeight(text, undefined)).toBe(120);
    });

    it('should default to category weight when missing', () => {
      const text = 'SEIKO 腕時計 自動巻き';
      expect(estimateWeight(text, 'Watches')).toBe(150);
    });
  });
});
