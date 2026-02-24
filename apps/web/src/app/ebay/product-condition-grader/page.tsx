'use client'

import React, { useEffect, useState } from 'react'

type TabKey = 'dashboard' | 'products' | 'criteria' | 'templates' | 'analytics' | 'settings'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'products', label: '商品' },
  { key: 'criteria', label: '基準' },
  { key: 'templates', label: 'テンプレート' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
]

const apiBase = '/api/ebay-product-condition-grader'

function endpointForTab(tab: TabKey): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard'
    case 'products':
      return '/products'
    case 'criteria':
      return '/criteria'
    case 'templates':
      return '/templates'
    case 'analytics':
      return '/analytics'
    case 'settings':
      return '/settings'
    default:
      return '/dashboard'
  }
}

export default function ProductConditionGraderPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${apiBase}${endpointForTab(activeTab)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (e: unknown) {
        if ((e as any)?.name !== 'AbortError') {
          setError((e as Error).message)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    return () => controller.abort()
  }, [activeTab])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-lime-600">商品コンディション評価</h1>
      <div className="mt-4 flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              activeTab === t.key ? 'border-lime-600 text-lime-600' : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <div className="text-xs text-gray-500">API: {apiBase + endpointForTab(activeTab)}</div>
        {loading && <div className="mt-2 text-gray-700">読み込み中...</div>}
        {error && <div className="mt-2 text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="mt-3 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-800 border">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )}

