'use client'

import React, { useEffect, useMemo, useState } from 'react'

type TabKey = 'dashboard' | 'forecasts' | 'models' | 'alerts' | 'analytics' | 'settings'

type ApiResponse = {
  section: string
  action: string
}

const API_BASE = '/api/ebay-smart-inventory-forecaster-pro'

function useApi(tab: TabKey) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const path = useMemo(() => {
    switch (tab) {
      case 'dashboard':
        return `${API_BASE}/dashboard`
      case 'forecasts':
        return `${API_BASE}/forecasts`
      case 'models':
        return `${API_BASE}/models`
      case 'alerts':
        return `${API_BASE}/alerts`
      case 'analytics':
        return `${API_BASE}/analytics`
      case 'settings':
        return `${API_BASE}/settings`
      default:
        return `${API_BASE}/health`
    }
  }, [tab])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    setData(null)
    fetch(path)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json = (await r.json()) as ApiResponse
        if (mounted) setData(json)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        if (mounted) setError(msg)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [path])

  return { data, loading, error }
}

const tabs: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'forecasts', label: '予測' },
  { key: 'models', label: 'モデル' },
  { key: 'alerts', label: 'アラート' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

export default function SmartInventoryForecasterProPage(): JSX.Element {
  const [active, setActive] = useState<TabKey>('dashboard')
  const { data, loading, error } = useApi(active)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-cyan-600">スマート在庫予測Pro</h1>
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-1.5 rounded-t-md text-sm ' +
              (active === t.key
                ? 'bg-cyan-50 text-cyan-700 border-b-2 border-cyan-600'
                : 'text-gray-600 hover:text-cyan-700 hover:bg-gray-50')
            }
            aria-pressed={active === t.key}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 p-4 bg-white">
        {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
        {error && (
          <div className="text-sm text-red-600">エラー: {error}</div>
        )}
        {!loading && !error && (
          <pre className="text-xs text-gray-800 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

