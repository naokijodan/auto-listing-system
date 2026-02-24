'use client'

import React, { useEffect, useState } from 'react'

type ApiResponse = Record<string, unknown>

const apiBase = '/api/ebay-order-customer-feedback-analyzer'

const tabs = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard' },
  { key: 'feedbacks', label: 'フィードバック', endpoint: 'feedbacks' },
  { key: 'sentiments', label: '感情分析', endpoint: 'sentiments' },
  { key: 'actions', label: 'アクション', endpoint: 'actions' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
]

export default function OrderCustomerFeedbackAnalyzerPage() {
  const [active, setActive] = useState<string>(tabs[0].key)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const tab = tabs.find((t) => t.key === active)!
    setLoading(true)
    setError(null)
    fetch(`${apiBase}/${tab.endpoint}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'エラーが発生しました')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [active])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-violet-600">注文顧客フィードバック分析</h1>
      <div className="mt-4 flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-2 text-sm' +
              (active === t.key
                ? ' border-b-2 border-violet-600 text-violet-600'
                : ' text-gray-600 hover:text-gray-900')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {loading ? (
          <p>読み込み中...</p>
        ) : error ? (
          <p className="text-red-600">エラー: {error}</p>
        ) : (
          <pre className="text-sm bg-gray-50 p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

