'use client'

import React, { useEffect, useState } from 'react'

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: '/dashboard' },
  { key: 'reservations', label: '予約', endpoint: '/reservations' },
  { key: 'rules', label: 'ルール', endpoint: '/rules' },
  { key: 'inventory', label: '在庫', endpoint: '/inventory' },
  { key: 'analytics', label: '分析', endpoint: '/analytics' },
  { key: 'settings', label: '設定', endpoint: '/settings' },
]

const API_BASE = '/api/ebay-inventory-reservation-manager'

export default function InventoryReservationManagerPage() {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const tab = TABS.find((t) => t.key === activeTab)
    if (!tab) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}${tab.endpoint}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => setData(json))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(String(e))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [activeTab])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-pink-600">在庫予約管理</h1>
      <div className="flex gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              'px-3 py-1 rounded-t text-sm ' +
              (activeTab === tab.key
                ? 'bg-pink-100 text-pink-700 border border-b-0 border-pink-200'
                : 'hover:bg-pink-50 text-gray-700')
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

