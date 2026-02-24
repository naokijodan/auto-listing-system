'use client'

import { useEffect, useState } from 'react'

type TabKey = 'dashboard' | 'schedules' | 'timeslots' | 'campaigns' | 'analytics' | 'settings'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'schedules', label: 'スケジュール' },
  { key: 'timeslots', label: 'タイムスロット' },
  { key: 'campaigns', label: 'キャンペーン' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

const API_BASE = '/api/ebay-listing-schedule-optimizer'

function endpointForTab(tab: TabKey): string {
  switch (tab) {
    case 'dashboard':
      return `${API_BASE}/dashboard`
    case 'schedules':
      return `${API_BASE}/schedules`
    case 'timeslots':
      return `${API_BASE}/timeslots`
    case 'campaigns':
      return `${API_BASE}/campaigns`
    case 'analytics':
      return `${API_BASE}/analytics`
    case 'settings':
      return `${API_BASE}/settings`
  }
}

export default function ListingScheduleOptimizerPage() {
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
      <h1 className="text-2xl font-semibold text-rose-600">出品スケジュール最適化</h1>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === t.key
                ? 'border-rose-600 text-rose-600'
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

