'use client'

import React, { useEffect, useState } from 'react'

type TabKey = 'dashboard' | 'warehouses' | 'zones' | 'transfers' | 'analytics' | 'settings'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'warehouses', label: '倉庫' },
  { key: 'zones', label: 'ゾーン' },
  { key: 'transfers', label: '移送' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

const API_BASE = '/api/ebay-inventory-warehouse-optimizer/'

export default function InventoryWarehouseOptimizerPage() {
  const [active, setActive] = useState<TabKey>('dashboard')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const endpoint = (() => {
          switch (active) {
            case 'dashboard':
              return 'dashboard'
            case 'warehouses':
              return 'warehouses'
            case 'zones':
              return 'zones'
            case 'transfers':
              return 'transfers'
            case 'analytics':
              return 'analytics'
            case 'settings':
              return 'settings'
          }
        })()
        const res = await fetch(`${API_BASE}${endpoint}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message ?? 'Error')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [active])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-rose-600">在庫倉庫最適化</h1>
      <div className="flex gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1.5 rounded-t-md text-sm ${
              active === t.key
                ? 'bg-rose-50 text-rose-700 border border-b-0 border-rose-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border p-4 bg-white">
        <div className="mb-3 text-sm text-gray-600">API: {API_BASE}{active}</div>
        {loading && <div className="text-gray-500">読み込み中…</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

