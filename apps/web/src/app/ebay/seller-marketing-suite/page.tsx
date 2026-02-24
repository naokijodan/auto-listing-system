'use client'

import { useEffect, useMemo, useState } from 'react'

type ApiData = Record<string, unknown>

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard' },
  { key: 'sellers', label: 'セラー', path: 'sellers/list' },
  { key: 'marketing', label: 'マーケティング', path: 'marketing/strategies' },
  { key: 'campaigns', label: 'キャンペーン', path: 'campaigns/list' },
  { key: 'analytics', label: '分析', path: 'analytics' },
  { key: 'settings', label: '設定', path: 'settings' },
]

const API_BASE = '/api/ebay-seller-marketing-suite/'

export default function SellerMarketingSuitePage() {
  const [active, setActive] = useState<string>('dashboard')
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const endpoint = useMemo(() => {
    const tab = TABS.find((t) => t.key === active)
    return tab ? `${API_BASE}${tab.path}` : `${API_BASE}health`
  }, [active])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(endpoint, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ApiData
      setData(json)
    } catch (e) {
      setError((e as Error).message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-orange-600">セラーマーケティングスイート</h1>

      <nav className="flex gap-4 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'py-2 -mb-px border-b-2 transition-colors ' +
              (active === t.key
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-900')
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">API</h2>
          <button
            onClick={() => void fetchData()}
            className="px-3 py-1.5 text-sm rounded bg-orange-600 text-white hover:bg-orange-700"
          >
            再読み込み
          </button>
        </div>
        <div className="rounded border p-4 bg-white">
          <div className="text-sm text-gray-500 mb-2">GET {endpoint}</div>
          {loading && <div>読み込み中...</div>}
          {error && <div className="text-red-600">エラー: {error}</div>}
          {!loading && !error && (
            <pre className="text-sm overflow-auto">{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      </section>
    </div>
  )
}

