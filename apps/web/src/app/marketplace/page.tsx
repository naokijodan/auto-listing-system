'use client'

import React, { useEffect, useMemo, useState } from 'react'

type PlatformKey = 'ebay' | 'joom' | 'etsy' | 'shopify'

type PlatformStatus = {
  connected: boolean
  tokenExpiry?: string | null
  lastSyncedAt?: string | null
  stats?: { listings: number; orders: number; sales: number }
  settings?: {
    inventorySync: boolean
    orderSync: boolean
    priceSync: boolean
    interval: '15m' | '30m' | '1h'
  }
}

type MarketplaceStatus = {
  platforms: Record<PlatformKey, PlatformStatus>
}

type Order = {
  id: string
  platform: string
  amount: number
  status: string
  createdAt: string
}

const platformMeta: Record<PlatformKey, { label: string; color: string }> = {
  ebay: { label: 'eBay', color: 'blue-600' },
  joom: { label: 'Joom', color: 'green-600' },
  etsy: { label: 'Etsy', color: 'orange-600' },
  shopify: { label: 'Shopify', color: 'emerald-600' },
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function MarketplacePage() {
  const [status, setStatus] = useState<MarketplaceStatus | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opLoading, setOpLoading] = useState<Record<string, boolean>>({})

  // Routing settings (local UI state)
  const [routePriceRule, setRoutePriceRule] = useState(false)
  const [routeVintageRule, setRouteVintageRule] = useState(false)
  const [routeBrandRule, setRouteBrandRule] = useState(false)
  const [defaultDest, setDefaultDest] = useState<PlatformKey[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sRes, oRes] = await Promise.all([
          fetch('/api/marketplace/status'),
          fetch('/api/marketplace/orders/recent'),
        ])
        if (!sRes.ok) throw new Error('接続状態の取得に失敗しました')
        if (!oRes.ok) throw new Error('最近の注文取得に失敗しました')
        const sData = (await sRes.json()) as Partial<MarketplaceStatus>
        const oData = (await oRes.json()) as Order[]
        if (!cancelled) {
          setStatus({
            platforms: {
              ebay: sData.platforms?.ebay ?? {
                connected: false,
                tokenExpiry: null,
                lastSyncedAt: null,
                stats: { listings: 0, orders: 0, sales: 0 },
                settings: { inventorySync: true, orderSync: true, priceSync: false, interval: '30m' },
              },
              joom: sData.platforms?.joom ?? {
                connected: false,
                tokenExpiry: null,
                lastSyncedAt: null,
                stats: { listings: 0, orders: 0, sales: 0 },
                settings: { inventorySync: true, orderSync: true, priceSync: false, interval: '30m' },
              },
              etsy: sData.platforms?.etsy ?? {
                connected: false,
                tokenExpiry: null,
                lastSyncedAt: null,
                stats: { listings: 0, orders: 0, sales: 0 },
                settings: { inventorySync: true, orderSync: true, priceSync: false, interval: '30m' },
              },
              shopify: sData.platforms?.shopify ?? {
                connected: false,
                tokenExpiry: null,
                lastSyncedAt: null,
                stats: { listings: 0, orders: 0, sales: 0 },
                settings: { inventorySync: true, orderSync: true, priceSync: false, interval: '30m' },
              },
            },
          })
          setOrders(Array.isArray(oData) ? oData.slice(0, 10) : [])
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? '不明なエラー')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleConnect = async (platform: PlatformKey) => {
    setOpLoading((s) => ({ ...s, [platform]: true }))
    try {
      const res = await fetch(`/api/marketplace/${platform}/connect`, { method: 'POST' })
      if (!res.ok) throw new Error('接続に失敗しました')
      setStatus((prev) =>
        prev
          ? {
              platforms: { ...prev.platforms, [platform]: { ...prev.platforms[platform], connected: true } },
            }
          : prev
      )
    } catch (e) {
      alert('接続に失敗しました')
      console.error(e)
    } finally {
      setOpLoading((s) => ({ ...s, [platform]: false }))
    }
  }

  const handleDisconnect = async (platform: PlatformKey) => {
    setOpLoading((s) => ({ ...s, [platform]: true }))
    try {
      const res = await fetch(`/api/marketplace/${platform}/disconnect`, { method: 'POST' })
      if (!res.ok) throw new Error('切断に失敗しました')
      setStatus((prev) =>
        prev
          ? {
              platforms: { ...prev.platforms, [platform]: { ...prev.platforms[platform], connected: false } },
            }
          : prev
      )
    } catch (e) {
      alert('切断に失敗しました')
      console.error(e)
    } finally {
      setOpLoading((s) => ({ ...s, [platform]: false }))
    }
  }

  const handleReauth = async (platform: PlatformKey) => {
    // 簡易: 再認証＝connectエンドポイントを叩く想定
    await handleConnect(platform)
  }

  const handleSettingChange = async (
    platform: PlatformKey,
    patch: Partial<NonNullable<PlatformStatus['settings']>>
  ) => {
    if (!status) return
    const current = status.platforms[platform]
    const nextSettings = { ...(current.settings ?? {}), ...patch } as NonNullable<PlatformStatus['settings']>
    setStatus({ platforms: { ...status.platforms, [platform]: { ...current, settings: nextSettings } } })
    try {
      const res = await fetch(`/api/marketplace/${platform}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      })
      if (!res.ok) throw new Error('設定更新に失敗しました')
    } catch (e) {
      alert('設定更新に失敗しました')
      console.error(e)
    }
  }

  const platformCards = useMemo(() => {
    if (!status) return null
    return (Object.keys(platformMeta) as PlatformKey[]).map((key) => {
      const meta = platformMeta[key]
      const data = status.platforms[key]
      const color = meta.color
      const settings = data.settings ?? {
        inventorySync: true,
        orderSync: true,
        priceSync: false,
        interval: '30m' as const,
      }
      return (
        <div key={key} className="rounded-lg border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <div className={cn(`rounded bg-${color} px-2 py-1 text-xs font-semibold text-white`)}>{meta.label}</div>
              <span
                className={cn(
                  'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  data.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                )}
              >
                {data.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {data.connected ? (
                <>
                  <button
                    onClick={() => handleDisconnect(key)}
                    disabled={!!opLoading[key]}
                    className={cn(
                      'rounded-md border px-3 py-1 text-xs font-medium',
                      'border-red-200 bg-white text-red-700 hover:bg-red-50',
                      opLoading[key] && 'cursor-wait opacity-50'
                    )}
                  >
                    切断
                  </button>
                  <button
                    onClick={() => handleReauth(key)}
                    disabled={!!opLoading[key]}
                    className={cn(
                      'rounded-md border px-3 py-1 text-xs font-medium',
                      `border-${color} bg-${color} text-white hover:brightness-110`,
                      opLoading[key] && 'cursor-wait opacity-50'
                    )}
                  >
                    再認証
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect(key)}
                  disabled={!!opLoading[key]}
                  className={cn(
                    'rounded-md border px-3 py-1 text-xs font-medium',
                    `border-${color} bg-${color} text-white hover:brightness-110`,
                    opLoading[key] && 'cursor-wait opacity-50'
                  )}
                >
                  接続
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">認証情報</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">トークン有効期限</dt>
                  <dd className="font-medium">{data.tokenExpiry ? new Date(data.tokenExpiry).toLocaleString() : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">最終同期</dt>
                  <dd className="font-medium">{data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : '—'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">統計</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">出品数</dt>
                  <dd className="font-medium">{data.stats?.listings ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">注文数</dt>
                  <dd className="font-medium">{data.stats?.orders ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">売上額</dt>
                  <dd className="font-medium">¥{(data.stats?.sales ?? 0).toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">同期設定</h4>
              <div className="space-y-3 text-sm">
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">在庫同期</span>
                  <input
                    type="checkbox"
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-green-500"
                    checked={!!settings.inventorySync}
                    onChange={(e) => handleSettingChange(key, { inventorySync: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">注文同期</span>
                  <input
                    type="checkbox"
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-green-500"
                    checked={!!settings.orderSync}
                    onChange={(e) => handleSettingChange(key, { orderSync: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">価格同期</span>
                  <input
                    type="checkbox"
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-green-500"
                    checked={!!settings.priceSync}
                    onChange={(e) => handleSettingChange(key, { priceSync: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">同期間隔</span>
                  <select
                    value={settings.interval}
                    onChange={(e) => handleSettingChange(key, { interval: e.target.value as any })}
                    className="rounded-md border border-gray-300 px-2 py-1"
                  >
                    <option value="15m">15分</option>
                    <option value="30m">30分</option>
                    <option value="1h">1時間</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      )
    })
  }, [status, opLoading])

  return (
    <div className="mx-auto max-w-[1100px] p-4 md:p-6 lg:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">マーケットプレイス管理</h1>
      </header>

      {loading ? (
        <div className="rounded-md border border-indigo-100 bg-indigo-50 p-4 text-indigo-700">読み込み中...</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          {/* Platforms */}
          <section className="mb-8 space-y-4">{platformCards}</section>

          {/* Routing rules */}
          <section className="mb-8 rounded-lg border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">出品ルーティング設定</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">価格ルール: ¥900,000超→eBay専用</span>
                  <input
                    type="checkbox"
                    checked={routePriceRule}
                    onChange={(e) => setRoutePriceRule(e.target.checked)}
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-blue-600"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">ヴィンテージルール: 20年以上→Etsy</span>
                  <input
                    type="checkbox"
                    checked={routeVintageRule}
                    onChange={(e) => setRouteVintageRule(e.target.checked)}
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-orange-600"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">ブランドルール: ブランド品→Shopify</span>
                  <input
                    type="checkbox"
                    checked={routeBrandRule}
                    onChange={(e) => setRouteBrandRule(e.target.checked)}
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-emerald-600"
                  />
                </label>
              </div>
              <div className="space-y-2">
                <div className="text-gray-700">デフォルト出品先</div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(Object.keys(platformMeta) as PlatformKey[]).map((p) => (
                    <label key={p} className="flex items-center gap-2 rounded border p-2">
                      <input
                        type="checkbox"
                        checked={defaultDest.includes(p)}
                        onChange={(e) =>
                          setDefaultDest((prev) =>
                            e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                          )
                        }
                      />
                      <span>{platformMeta[p].label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500">ルールと重複する場合は個別ルールを優先します。</p>
              </div>
            </div>
          </section>

          {/* Recent orders */}
          <section className="mb-16 rounded-lg border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">注文統合ビュー（最近の10件）</h2>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">注文ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">プラットフォーム</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">金額</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">ステータス</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        注文がありません
                      </td>
                    </tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2 font-medium text-gray-900">{o.id}</td>
                      <td className="px-4 py-2">{o.platform}</td>
                      <td className="px-4 py-2">¥{(o.amount ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-2">{o.status}</td>
                      <td className="px-4 py-2">{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

