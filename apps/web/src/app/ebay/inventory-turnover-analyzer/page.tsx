'use client'

import { useEffect, useState } from 'react'

type TabKey = 'dashboard' | 'products' | 'categories' | 'reports' | 'analytics' | 'settings'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'products', label: '商品' },
  { key: 'categories', label: 'カテゴリ' },
  { key: 'reports', label: 'レポート' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

const API_BASE = '/api/ebay-inventory-turnover-analyzer'

function endpointForTab(tab: TabKey): string {
  switch (tab) {
    case 'dashboard':
      return `${API_BASE}/dashboard`
    case 'products':
      return `${API_BASE}/products`
    case 'categories':
      return `${API_BASE}/categories`
    case 'reports':
      return `${API_BASE}/reports`
    case 'analytics':
      return `${API_BASE}/analytics`
    case 'settings':
      return `${API_BASE}/settings`
  }
}

export default function InventoryTurnoverAnalyzerPage() {
  const [active, setActive] = useState<TabKey>('dashboard')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(endpointForTab(active))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (isMounted) setData(json)
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? 'Error')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [active])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-indigo-600">在庫回転率分析</h1>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

