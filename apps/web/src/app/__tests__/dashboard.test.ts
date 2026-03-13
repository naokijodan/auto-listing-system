import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  KpiDataSchema,
  TrendDataSchema,
  DashboardResponseSchema,
  type KpiData,
  type TrendData,
} from '../types'

function makeKpi(overrides: Partial<KpiData> = {}): KpiData {
  return {
    totalProducts: 1200,
    totalListings: 800,
    activeListings: 750,
    soldToday: 5,
    soldThisWeek: 42,
    soldThisMonth: 180,
    revenue: { today: 250, thisWeek: 6000, thisMonth: 25500 },
    grossProfit: { today: 120, thisWeek: 3000, thisMonth: 12000 },
    outOfStockCount: 7,
    staleListings30: 40,
    staleListings60: 12,
    staleRate: 10,
    healthScore: 82,
    healthScoreBreakdown: { staleScore: 85, stockScore: 78, profitScore: 90 },
    productsByStatus: { ACTIVE: 750, DRAFT: 50 },
    ...overrides,
  }
}

function makeTrend(overrides: Partial<TrendData> = {}): TrendData {
  return {
    date: '2026-03-01',
    listings: 30,
    sold: 12,
    revenue: 560,
    ...overrides,
  }
}

describe('KpiDataSchema', () => {
  it('validates a full valid KPI object', () => {
    const kpi = makeKpi()
    const res = KpiDataSchema.safeParse(kpi)
    expect(res.success).toBe(true)
  })

  it('rejects when required fields are missing', () => {
    const { totalProducts, ...rest } = makeKpi()
    const res = KpiDataSchema.safeParse(rest as unknown)
    expect(res.success).toBe(false)
  })
})

describe('TrendDataSchema', () => {
  it('validates a correct trend record', () => {
    const trend = makeTrend()
    const res = TrendDataSchema.safeParse(trend)
    expect(res.success).toBe(true)
  })

  it('rejects wrong types', () => {
    const bad = makeTrend({ sold: '10' as unknown as number })
    const res = TrendDataSchema.safeParse(bad)
    expect(res.success).toBe(false)
  })
})

describe('DashboardResponseSchema', () => {
  it('accepts success flag with any data', () => {
    const input = { success: true, data: { foo: 'bar' } }
    const res = DashboardResponseSchema.safeParse(input)
    expect(res.success).toBe(true)
  })

  it('rejects when success is missing', () => {
    const input = { data: {} } as unknown
    const res = DashboardResponseSchema.safeParse(input)
    expect(res.success).toBe(false)
  })

  it('rejects when success is missing (data only)', () => {
    const input = { data: { foo: 'bar' } } as unknown
    const res = DashboardResponseSchema.safeParse(input)
    expect(res.success).toBe(false)
  })

  it('validates KPI response when extended', () => {
    const Schema = DashboardResponseSchema.extend({ data: KpiDataSchema })
    const input = { success: true, data: makeKpi() }
    const res = Schema.safeParse(input)
    expect(res.success).toBe(true)
  })

  it('validates Trend response array when extended', () => {
    const Schema = DashboardResponseSchema.extend({ data: z.array(TrendDataSchema) })
    const input = { success: true, data: [makeTrend(), makeTrend({ sold: 0 })] }
    const res = Schema.safeParse(input)
    expect(res.success).toBe(true)
  })
})
