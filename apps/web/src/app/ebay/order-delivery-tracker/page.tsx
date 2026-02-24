'use client'

import { useEffect, useState } from 'react'

type ApiData = { section: string; action: string } | { error: string }

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard' },
  { key: 'shipments', label: '配送', path: 'shipments/list' },
  { key: 'carriers', label: 'キャリア', path: 'carriers/list' },
  { key: 'notifications', label: '通知', path: 'notifications/list' },
  { key: 'analytics', label: '分析', path: 'analytics' },
  { key: 'settings', label: '設定', path: 'settings' },
]

const API_BASE = '/api/ebay-order-delivery-tracker/'

export default function OrderDeliveryTrackerPage() {
  const [active, setActive] = useState(TABS[0].key)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ApiData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tab = TABS.find(t => t.key === active)!
    setLoading(true)
    setError(null)
    setData(null)
    fetch(API_BASE + tab.path)
      .then(async (r) => {
        if (!r.ok) throw new Error('API error: ' + r.status)
        return r.json()
      })
      .then((j: ApiData) => setData(j))
      .catch((e: unknown) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [active])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-fuchsia-600">注文配達トラッカー</h1>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1.5 rounded border text-sm ${
              active === t.key ? 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700' : 'hover:bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded border border-fuchsia-200 p-4">
        <div className="text-xs text-fuchsia-500 mb-2">API: {API_BASE}{TABS.find(t => t.key === active)?.path}</div>
        {loading && <div className="text-fuchsia-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-fuchsia-700 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}
