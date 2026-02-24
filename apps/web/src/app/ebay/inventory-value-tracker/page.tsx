'use client'

import { useEffect, useState } from 'react'

type ApiResponse = { section: string; action: string }

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard' },
  { key: 'products', label: '商品', path: 'products' },
  { key: 'categories', label: 'カテゴリ', path: 'categories' },
  { key: 'reports', label: 'レポート', path: 'reports' },
  { key: 'analytics', label: '分析', path: 'analytics' },
  { key: 'settings', label: '設定', path: 'settings' },
]

const API_BASE = '/api/ebay-inventory-value-tracker/'

export default function InventoryValueTrackerPage() {
  const [active, setActive] = useState<string>('dashboard')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tab = TABS.find((t) => t.key === active)
    if (!tab) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}${tab.path}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as ApiResponse
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [active])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-fuchsia-600">在庫価値トラッカー</h1>
      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              active === t.key ? 'border-fuchsia-600 text-fuchsia-600' : 'border-transparent text-gray-600 hover:text-fuchsia-600'
            }`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border p-4 bg-white">
        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
      <p className="text-xs text-gray-500">API: {API_BASE}</p>
    </div>
  )
}

