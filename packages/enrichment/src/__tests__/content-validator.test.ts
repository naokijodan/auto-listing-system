import { describe, it, expect } from 'vitest';
import {
  validateContent,
  mergeValidation,
  canPublish,
  needsReview,
  isProhibited,
  getFlagDescription,
  getAllFlags,
  ValidationResult,
} from '../content-validator';

describe('content-validator', () => {
  describe('validateContent', () => {
    describe('prohibited items (rejected)', () => {
      it('should reject lithium battery products', () => {
        const result = validateContent(
          'モバイルバッテリー 大容量',
          'リチウムイオン電池 10000mAh'
        );
        expect(result.status).toBe('rejected');
        expect(result.flags).toContain('lithium_battery');
        expect(result.riskScore).toBe(100);
      });

      it('should reject aerosol products', () => {
        const result = validateContent(
          '殺虫剤 スプレー',
          'エアゾール缶タイプ'
        );
        expect(result.status).toBe('rejected');
        expect(result.flags).toContain('aerosol');
      });

      it('should reject CITES items', () => {
        const result = validateContent(
          'べっ甲 眼鏡フレーム',
          '本物のべっ甲使用'
        );
        expect(result.status).toBe('rejected');
        expect(result.flags).toContain('cites');
      });

      it('should reject weapons', () => {
        const result = validateContent(
          'サバイバルナイフ',
          '刃渡り15cm'
        );
        expect(result.status).toBe('rejected');
        expect(result.flags).toContain('weapon');
      });

      it('should reject counterfeit items', () => {
        const result = validateContent(
          'ブランド風 バッグ',
          'レプリカ品 コピー品'
        );
        expect(result.status).toBe('rejected');
        expect(result.flags).toContain('counterfeit');
      });

      it('should reject adult items', () => {
        const result = validateContent(
          '18禁 DVD',
          'アダルト商品'
        );
        expect(result.status).toBe('rejected');
        expect(result.flags).toContain('adult');
      });
    });

    describe('review required items', () => {
      it('should require review for high-value brands', () => {
        const result = validateContent(
          'ROLEX サブマリーナ',
          '正規品 ロレックス'
        );
        expect(result.status).toBe('review_required');
        expect(result.flags).toContain('high_value_brand');
        expect(result.riskScore).toBe(50);
      });

      it('should require review for supplements', () => {
        const result = validateContent(
          'ビタミンC サプリメント',
          '健康食品 栄養補助'
        );
        expect(result.status).toBe('review_required');
        expect(result.flags).toContain('supplement');
      });

      it('should require review for cosmetics', () => {
        const result = validateContent(
          'スキンケア 化粧品セット',
          'コスメ 美容液'
        );
        expect(result.status).toBe('review_required');
        expect(result.flags).toContain('cosmetics');
      });

      it('should require review for battery-operated items', () => {
        const result = validateContent(
          '電池式 時計',
          '単三電池使用'
        );
        expect(result.status).toBe('review_required');
        expect(result.flags).toContain('battery_operated');
      });

      it('should require review for food items', () => {
        const result = validateContent(
          'お菓子 詰め合わせ',
          '食品 スナック'
        );
        expect(result.status).toBe('review_required');
        expect(result.flags).toContain('food');
      });

      it('should require review for antiques', () => {
        const result = validateContent(
          'アンティーク 時計',
          '100年以上前の骨董品'
        );
        expect(result.status).toBe('review_required');
        expect(result.flags).toContain('antique');
      });
    });

    describe('approved items', () => {
      it('should approve normal watch listing', () => {
        const result = validateContent(
          'SEIKO 5 自動巻き腕時計',
          '美品 ステンレス製 日本製'
        );
        expect(result.status).toBe('approved');
        expect(result.passed).toBe(true);
        expect(result.flags).toHaveLength(0);
        expect(result.riskScore).toBe(0);
      });

      it('should approve normal accessory listing', () => {
        const result = validateContent(
          'シルバー ネックレス',
          '925刻印あり プレゼントに'
        );
        expect(result.status).toBe('approved');
        expect(result.passed).toBe(true);
      });

      it('should approve normal electronics', () => {
        const result = validateContent(
          'Canon EOS デジタルカメラ',
          'レンズ付き 動作確認済み'
        );
        expect(result.status).toBe('approved');
        expect(result.passed).toBe(true);
      });
    });

    describe('multiple flags', () => {
      it('should detect multiple review flags', () => {
        const result = validateContent(
          '香水 化粧品セット',
          'コスメ ビタミン配合 美容液'
        );
        expect(result.status).toBe('review_required');
        expect(result.flags.length).toBeGreaterThanOrEqual(2);
      });

      it('should prioritize rejected over review_required', () => {
        const result = validateContent(
          'リチウム電池内蔵 ロレックス風',
          'モバイルバッテリー付き'
        );
        expect(result.status).toBe('rejected');
      });
    });
  });

  describe('mergeValidation', () => {
    it('should use more strict status', () => {
      const aiValidation = {
        status: 'approved' as const,
        flags: [],
        riskScore: 0,
      };

      const ruleValidation: ValidationResult = {
        status: 'review_required',
        passed: false,
        flags: ['high_value_brand'],
        riskScore: 50,
      };

      const merged = mergeValidation(aiValidation, ruleValidation);
      expect(merged.status).toBe('review_required');
    });

    it('should combine flags from both sources', () => {
      const aiValidation = {
        status: 'review_required' as const,
        flags: ['trademark_risk'],
        riskScore: 40,
      };

      const ruleValidation: ValidationResult = {
        status: 'review_required',
        passed: false,
        flags: ['high_value_brand'],
        riskScore: 50,
      };

      const merged = mergeValidation(aiValidation, ruleValidation);
      expect(merged.flags).toContain('high_value_brand');
      expect(merged.flags).toContain('trademark_risk');
    });

    it('should use higher risk score', () => {
      const aiValidation = {
        status: 'review_required' as const,
        flags: [],
        riskScore: 70,
      };

      const ruleValidation: ValidationResult = {
        status: 'review_required',
        passed: false,
        flags: [],
        riskScore: 50,
      };

      const merged = mergeValidation(aiValidation, ruleValidation);
      expect(merged.riskScore).toBe(70);
    });
  });

  describe('helper functions', () => {
    it('canPublish should return true for approved', () => {
      const result: ValidationResult = {
        status: 'approved',
        passed: true,
        flags: [],
        riskScore: 0,
      };
      expect(canPublish(result)).toBe(true);
    });

    it('canPublish should return false for review_required', () => {
      const result: ValidationResult = {
        status: 'review_required',
        passed: false,
        flags: ['high_value_brand'],
        riskScore: 50,
      };
      expect(canPublish(result)).toBe(false);
    });

    it('needsReview should return true for review_required', () => {
      const result: ValidationResult = {
        status: 'review_required',
        passed: false,
        flags: ['high_value_brand'],
        riskScore: 50,
      };
      expect(needsReview(result)).toBe(true);
    });

    it('isProhibited should return true for rejected', () => {
      const result: ValidationResult = {
        status: 'rejected',
        passed: false,
        flags: ['lithium_battery'],
        riskScore: 100,
      };
      expect(isProhibited(result)).toBe(true);
    });
  });

  describe('getFlagDescription', () => {
    it('should return description for known flag', () => {
      expect(getFlagDescription('lithium_battery')).toBe(
        'リチウムイオン電池を含む製品は航空輸送禁止'
      );
    });

    it('should return description for review flag', () => {
      expect(getFlagDescription('high_value_brand')).toBe(
        '高額ブランド品は真贋確認が必要'
      );
    });

    it('should return undefined for unknown flag', () => {
      expect(getFlagDescription('unknown_flag')).toBeUndefined();
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags with their statuses', () => {
      const flags = getAllFlags();
      expect(flags.length).toBeGreaterThan(0);

      const batteryFlag = flags.find(f => f.flag === 'lithium_battery');
      expect(batteryFlag).toBeDefined();
      expect(batteryFlag?.status).toBe('rejected');

      const brandFlag = flags.find(f => f.flag === 'high_value_brand');
      expect(brandFlag).toBeDefined();
      expect(brandFlag?.status).toBe('review_required');
    });
  });
});
