'use client'

import { useEffect, useState } from 'react'

type TabKey = 'dashboard' | 'products' | 'quality' | 'scoring' | 'analytics' | 'settings'
type ApiResponse = { section: string; action: string } | { error: string }

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'products', label: '商品' },
  { key: 'quality', label: '品質' },
  { key: 'scoring', label: 'スコアリング' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

const API_BASE = '/api/ebay-product-quality-scorer/'

function endpoint(tab: TabKey): string {
  switch (tab) {
    case 'dashboard':
      return 'dashboard'
    case 'products':
      return 'products'
    case 'quality':
      return 'quality/criteria'
    case 'scoring':
      return 'scoring/model'
    case 'analytics':
      return 'analytics'
    case 'settings':
      return 'settings'
    default:
      return 'health'
  }
}

export default function ProductQualityScorerPage() {
  const [active, setActive] = useState<TabKey>('dashboard')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(API_BASE + endpoint(active))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ApiResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [active])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-sky-600">商品クオリティスコアラー</h1>
      <div className="flex gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1 rounded-t ${
              active === t.key ? 'bg-sky-50 text-sky-700 border border-b-0 border-sky-200' : 'text-gray-600 hover:text-sky-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[120px] rounded border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

