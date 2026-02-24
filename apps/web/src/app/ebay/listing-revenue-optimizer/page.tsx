'use client'

import React, { useEffect, useMemo, useState } from 'react'

type TabKey = 'dashboard' | 'optimizations' | 'rules' | 'recommendations' | 'analytics' | 'settings'

type ApiResponse = {
  section: string
  action: string
}

const API_BASE = '/api/ebay-listing-revenue-optimizer'

function useApi(tab: TabKey) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const path = useMemo(() => {
    switch (tab) {
      case 'dashboard':
        return `${API_BASE}/dashboard`
      case 'optimizations':
        return `${API_BASE}/optimizations`
      case 'rules':
        return `${API_BASE}/rules`
      case 'recommendations':
        return `${API_BASE}/recommendations`
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
  { key: 'optimizations', label: '最適化' },
  { key: 'rules', label: 'ルール' },
  { key: 'recommendations', label: 'レコメンド' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

export default function ListingRevenueOptimizerPage(): JSX.Element {
  const [active, setActive] = useState<TabKey>('dashboard')
  const { data, loading, error } = useApi(active)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-lime-600">出品収益最適化</h1>
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-1.5 rounded-t-md text-sm ' +
              (active === t.key
                ? 'bg-lime-50 text-lime-700 border-b-2 border-lime-600'
                : 'text-gray-600 hover:text-lime-700 hover:bg-gray-50')
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

