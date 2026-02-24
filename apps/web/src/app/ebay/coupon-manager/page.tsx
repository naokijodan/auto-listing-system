'use client'

import { useEffect, useState } from 'react'

type StubResponse = { section: string; action: string }

const API_BASE = '/api/ebay-coupon-manager'

const tabs = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'coupons', label: 'クーポン' },
  { key: 'campaigns', label: 'キャンペーン' },
  { key: 'redemptions', label: '利用' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

function endpointForTab(tab: string): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard'
    case 'coupons':
      return '/coupons/list'
    case 'campaigns':
      return '/campaigns/list'
    case 'redemptions':
      return '/redemptions/list'
    case 'analytics':
      return '/analytics'
    case 'settings':
      return '/settings'
    default:
      return '/health'
  }
}

export default function CouponManagerPage() {
  const [active, setActive] = useState<string>('dashboard')
  const [data, setData] = useState<StubResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const res = await fetch(`${API_BASE}${endpointForTab(active)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: StubResponse = await res.json()
        setData(json)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [active])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-purple-600">クーポン管理</h1>
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === t.key
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-purple-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border bg-white p-4">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
      <div className="text-xs text-gray-500">
        API: <code>{API_BASE}{endpointForTab(active)}</code>
      </div>
    </div>
  )
}

