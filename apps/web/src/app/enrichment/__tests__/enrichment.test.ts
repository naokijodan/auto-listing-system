import { describe, it, expect } from 'vitest';
import {
  EnrichmentStatus,
  enrichmentTaskSchema,
  enrichmentStatsSchema,
  queueStatsSchema,
  fullWorkflowResponseSchema,
  statusConfig,
} from '../types';
import type {
  EnrichmentTask,
  QueueStats,
  EnrichmentStats,
  FullWorkflowResponse,
  EnrichmentStatus as EnrichmentStatusType,
} from '../types';
import { z } from 'zod';

describe('/enrichment types', () => {
  describe('EnrichmentStatus enum の検証', () => {
    it("'PENDING' は parse に成功する", () => {
      expect(() => EnrichmentStatus.parse('PENDING')).not.toThrow();
    });

    it("'PROCESSING' は parse に成功する", () => {
      expect(() => EnrichmentStatus.parse('PROCESSING')).not.toThrow();
    });

    it("'READY_TO_REVIEW' は parse に成功する", () => {
      expect(() => EnrichmentStatus.parse('READY_TO_REVIEW')).not.toThrow();
    });

    it("'APPROVED' は parse に成功する", () => {
      expect(() => EnrichmentStatus.parse('APPROVED')).not.toThrow();
    });

    it("'REJECTED' は parse に成功する", () => {
      expect(() => EnrichmentStatus.parse('REJECTED')).not.toThrow();
    });

    it("'PUBLISHED' は parse に成功する", () => {
      expect(() => EnrichmentStatus.parse('PUBLISHED')).not.toThrow();
    });

    it("'FAILED' は parse に成功する", () => {
      expect(() => EnrichmentStatus.parse('FAILED')).not.toThrow();
    });

    it('不正な値では parse に失敗する', () => {
      expect(() => EnrichmentStatus.parse('INVALID')).toThrow();
    });
  });

  describe('statusConfig の検証', () => {
    it('7ステータス全てに config が存在する', () => {
      const expected = [
        'PENDING',
        'PROCESSING',
        'READY_TO_REVIEW',
        'APPROVED',
        'REJECTED',
        'PUBLISHED',
        'FAILED',
      ];
      expect(Object.keys(statusConfig).sort()).toEqual(expected.sort());
    });

    it('各configは label, color, icon を持つ', () => {
      for (const key of Object.keys(statusConfig)) {
        const cfg: any = (statusConfig as any)[key];
        expect(typeof cfg.label).toBe('string');
        expect(typeof cfg.color).toBe('string');
        expect(cfg.icon).toBeDefined();
      }
    });
  });

  describe('enrichmentTaskSchema の検証', () => {
    const baseTask = {
      id: 'task_1',
      productId: 'prod_1',
      status: 'PENDING' as const,
      priority: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      product: {
        id: 'p1',
        title: 'Sample Product',
        price: 1000,
      },
    };

    it('最小構成（オプショナル省略）で parse 成功', () => {
      expect(() => enrichmentTaskSchema.parse(baseTask)).not.toThrow();
    });

    it("status が 'INVALID' で parse 失敗", () => {
      const bad = { ...baseTask, status: 'INVALID' } as unknown;
      expect(() => enrichmentTaskSchema.parse(bad)).toThrow();
    });

    it('id 欠落で parse 失敗', () => {
      const { id, ...rest } = baseTask as any;
      expect(() => enrichmentTaskSchema.parse(rest)).toThrow();
    });

    it('translations は optional（undefined）で parse 成功', () => {
      const t = { ...baseTask };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('translations を指定しても parse 成功', () => {
      const t = {
        ...baseTask,
        translations: {
          en: { title: 'Title EN', description: 'Desc EN' },
          zh: { title: 'Title ZH' },
        },
      };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('pricing は optional（undefined）で parse 成功', () => {
      const t = { ...baseTask };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('pricing を指定しても parse 成功', () => {
      const t = {
        ...baseTask,
        pricing: {
          costJpy: 500,
          finalPriceUsd: 20,
          profitRate: 0.2,
        },
      };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('product.images は optional（未指定）で parse 成功', () => {
      const t = { ...baseTask };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('product.images を指定しても parse 成功', () => {
      const t = { ...baseTask, product: { ...baseTask.product, images: ['a.jpg', 'b.jpg'] } };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('product.brand は optional（未指定）で parse 成功', () => {
      const t = { ...baseTask };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('validationResult は optional（未指定）で parse 成功', () => {
      const t = { ...baseTask };
      expect(() => enrichmentTaskSchema.parse(t)).not.toThrow();
    });

    it('product.price が string の場合は parse 失敗', () => {
      const bad = { ...baseTask, product: { ...baseTask.product, price: '1000' } } as unknown;
      expect(() => enrichmentTaskSchema.parse(bad)).toThrow();
    });

    it('priority が string の場合は parse 失敗', () => {
      const bad = { ...baseTask, priority: '1' } as unknown;
      expect(() => enrichmentTaskSchema.parse(bad)).toThrow();
    });

    it('images が string 配列でない場合は失敗', () => {
      const bad = { ...baseTask, product: { ...baseTask.product, images: [1, 2] } } as unknown;
      expect(() => enrichmentTaskSchema.parse(bad)).toThrow();
    });

    it('createdAt/updatedAt が string でない場合は失敗', () => {
      const bad = { ...baseTask, createdAt: 1, updatedAt: 2 } as unknown;
      expect(() => enrichmentTaskSchema.parse(bad)).toThrow();
    });
  });

  describe('enrichmentStatsSchema の検証', () => {
    it('正常データは parse に成功する', () => {
      const stats = {
        total: 100,
        pending: 10,
        processing: 5,
        approved: 20,
        rejected: 3,
        readyToReview: 7,
        published: 50,
        failed: 5,
      };
      expect(() => enrichmentStatsSchema.parse(stats)).not.toThrow();
    });

    it('必須フィールド欠落（total）で失敗する', () => {
      const bad = {
        pending: 10,
        processing: 5,
        approved: 20,
        rejected: 3,
        readyToReview: 7,
        published: 50,
        failed: 5,
      } as unknown;
      expect(() => enrichmentStatsSchema.parse(bad)).toThrow();
    });

    it('数値でないフィールド（pending が string）で失敗', () => {
      const bad = {
        total: 100,
        pending: '10',
        processing: 5,
        approved: 20,
        rejected: 3,
        readyToReview: 7,
        published: 50,
        failed: 5,
      } as unknown;
      expect(() => enrichmentStatsSchema.parse(bad)).toThrow();
    });

    it('全て 0 でも parse に成功する', () => {
      const stats = {
        total: 0,
        pending: 0,
        processing: 0,
        approved: 0,
        rejected: 0,
        readyToReview: 0,
        published: 0,
        failed: 0,
      };
      expect(() => enrichmentStatsSchema.parse(stats)).not.toThrow();
    });
  });

  describe('queueStatsSchema の検証', () => {
    it('正常データは parse に成功する', () => {
      const q = {
        queueName: 'enrichment',
        waiting: 1,
        active: 2,
        completed: 3,
        failed: 4,
        delayed: 0,
        total: 10,
      };
      expect(() => queueStatsSchema.parse(q)).not.toThrow();
    });

    it('必須フィールド欠落（queueName）で失敗する', () => {
      const bad = {
        waiting: 1,
        active: 2,
        completed: 3,
        failed: 4,
        delayed: 0,
        total: 10,
      } as unknown;
      expect(() => queueStatsSchema.parse(bad)).toThrow();
    });

    it('数値でないフィールド（waiting が string）で失敗', () => {
      const bad = {
        queueName: 'enrichment',
        waiting: '1',
        active: 2,
        completed: 3,
        failed: 4,
        delayed: 0,
        total: 10,
      } as unknown;
      expect(() => queueStatsSchema.parse(bad)).toThrow();
    });
  });

  describe('fullWorkflowResponseSchema の検証', () => {
    it('{ jobId: "abc" } は parse 成功', () => {
      expect(() => fullWorkflowResponseSchema.parse({ jobId: 'abc' })).not.toThrow();
    });

    it('{} は parse 失敗', () => {
      expect(() => fullWorkflowResponseSchema.parse({})).toThrow();
    });
  });

  describe('reject-modal reasonSchema の検証', () => {
    // reject-modal.tsx の実装: const reasonSchema = z.object({ reason: z.string().trim().min(1) });
    const reasonSchema = z.object({ reason: z.string().trim().min(1) });

    it("'スペック誤記' が parse に成功する", () => {
      const parsed = reasonSchema.parse({ reason: 'スペック誤記' });
      expect(parsed.reason).toBe('スペック誤記');
    });

    it('空文字は parse に失敗する', () => {
      expect(() => reasonSchema.parse({ reason: '' })).toThrow();
    });

    it('スペースのみは trim 後に空となり失敗', () => {
      expect(() => reasonSchema.parse({ reason: '   ' })).toThrow();
    });

    it('自由入力テキストが parse に成功する', () => {
      const parsed = reasonSchema.parse({ reason: 'ユーザー入力の自由記述テキスト' });
      expect(parsed.reason).toBe('ユーザー入力の自由記述テキスト');
    });

    it("' その他 ' は trim されて成功する", () => {
      const parsed = reasonSchema.parse({ reason: '  その他  ' });
      expect(parsed.reason).toBe('その他');
    });

    it('プリセットの別理由（禁制品の疑い）も成功する', () => {
      const parsed = reasonSchema.parse({ reason: '禁制品の疑い' });
      expect(parsed.reason).toBe('禁制品の疑い');
    });
  });

  describe('型エクスポートの確認', () => {
    it('全型が import 可能であること', () => {
      // 型レベルのチェック（コンパイルが通れば OK）
      const _status: EnrichmentStatusType = 'PENDING';
      const _task: EnrichmentTask = {
        id: 't',
        productId: 'p',
        status: 'PENDING',
        priority: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        product: { id: 'p', title: 'x', price: 1 },
      };
      const _q: QueueStats = {
        queueName: 'q',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0,
      };
      const _s: EnrichmentStats = {
        total: 0,
        pending: 0,
        processing: 0,
        approved: 0,
        rejected: 0,
        readyToReview: 0,
        published: 0,
        failed: 0,
      };
      const _f: FullWorkflowResponse = { jobId: 'abc' };
      // ランタイムでは単純なアサートでカウント
      expect(!!_status && !!_task && !!_q && !!_s && !!_f).toBe(true);
    });
  });
});

