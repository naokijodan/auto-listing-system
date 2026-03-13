import { describe, it, expect } from 'vitest'
import {
  ProductsResponseSchema,
  ProductSchema,
  ImportResultSchema,
  sourceSiteLabels,
} from '../types'

describe('ProductSchema', () => {
  const validProduct = {
    id: 'prd-001',
    price: 5000,
    status: 'READY',
    createdAt: '2026-03-14T00:00:00Z',
    updatedAt: '2026-03-14T00:00:00Z',
  }

  it('正常な商品をパースできる', () => {
    expect(ProductSchema.safeParse(validProduct).success).toBe(true)
  })

  it('タイトルがnullでもパースできる', () => {
    const product = { ...validProduct, title: null, titleEn: null }
    expect(ProductSchema.safeParse(product).success).toBe(true)
  })

  it('必須フィールドが欠けている場合を拒否する', () => {
    const { id, ...missing } = validProduct
    expect(ProductSchema.safeParse(missing).success).toBe(false)
  })

  it('priceが文字列の場合を拒否する', () => {
    const invalid = { ...validProduct, price: '5000' }
    expect(ProductSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('ProductsResponseSchema', () => {
  it('正常なレスポンスをパースできる', () => {
    const valid = {
      success: true,
      data: [],
      pagination: { total: 0, limit: 50, offset: 0 },
    }
    expect(ProductsResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('pagination省略時もパースできる', () => {
    const valid = { success: true, data: [] }
    expect(ProductsResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('dataが欠けている場合を拒否する', () => {
    expect(ProductsResponseSchema.safeParse({ success: true }).success).toBe(false)
  })
})

describe('ImportResultSchema', () => {
  it('正常なインポート結果をパースできる', () => {
    const valid = { created: 10, updated: 5, failed: 1, errors: ['row 3: invalid price'] }
    expect(ImportResultSchema.safeParse(valid).success).toBe(true)
  })

  it('errorsが空配列でもパースできる', () => {
    const valid = { created: 0, updated: 0, failed: 0, errors: [] }
    expect(ImportResultSchema.safeParse(valid).success).toBe(true)
  })
})

describe('sourceSiteLabels', () => {
  it('4つの仕入元が定義されている', () => {
    expect(Object.keys(sourceSiteLabels)).toHaveLength(4)
  })

  it('各仕入元にラベルがある', () => {
    for (const label of Object.values(sourceSiteLabels)) {
      expect(label).toBeTruthy()
    }
  })
})

