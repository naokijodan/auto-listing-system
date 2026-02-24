'use client'

import { useEffect, useState } from 'react'

type StubResponse = { section: string; action: string }

const API_BASE = '/api/ebay-seller-notification-center'

const tabs = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'notifications', label: '通知' },
  { key: 'channels', label: 'チャネル' },
  { key: 'rules', label: 'ルール' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

function endpointForTab(tab: string): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard'
    case 'notifications':
      return '/notifications/list'
    case 'channels':
      return '/channels/list'
    case 'rules':
      return '/rules/list'
    case 'analytics':
      return '/analytics'
    case 'settings':
      return '/settings'
    default:
      return '/health'
  }
}

export default function SellerNotificationCenterPage() {
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
      <h1 className="text-2xl font-semibold text-lime-600">セラー通知センター</h1>
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === t.key
                ? 'border-lime-600 text-lime-600'
                : 'border-transparent text-gray-600 hover:text-lime-600'
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

