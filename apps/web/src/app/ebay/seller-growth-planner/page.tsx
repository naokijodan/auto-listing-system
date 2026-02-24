'use client'

import React, { useEffect, useState } from 'react'

type TabKey = 'dashboard' | 'plans' | 'milestones' | 'strategies' | 'analytics' | 'settings'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'plans', label: 'プラン' },
  { key: 'milestones', label: 'マイルストーン' },
  { key: 'strategies', label: '戦略' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

const API_BASE = '/api/ebay-seller-growth-planner'

function pathFor(tab: TabKey): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard'
    case 'plans':
      return '/plans'
    case 'milestones':
      return '/milestones'
    case 'strategies':
      return '/strategies'
    case 'analytics':
      return '/analytics'
    case 'settings':
      return '/settings'
    default:
      return '/health'
  }
}

export default function SellerGrowthPlannerPage(): JSX.Element {
  const [active, setActive] = useState<TabKey>('dashboard')
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}${pathFor(active)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-slate-600">セラー成長プランナー</h1>
      <div className="flex gap-2 border-b mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm rounded-t ${
              active === t.key ? 'bg-slate-50 text-slate-700 border border-b-0 border-slate-200' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border p-4 bg-white">
        <div className="mb-2 text-sm text-gray-500">API: {API_BASE}{pathFor(active)}</div>
        {loading && <div className="text-gray-600">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-xs text-gray-800 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

