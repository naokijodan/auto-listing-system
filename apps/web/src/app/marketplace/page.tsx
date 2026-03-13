'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addToast } from '@/components/ui/toast'
import { postApi, putApi } from '@/lib/api'
import {
  PlatformKey,
  PlatformStatus,
  MarketplaceStatus,
  Order,
  platformMeta,
  MarketplaceOverviewSchema,
  defaultPlatformStatus,
} from './types'

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function MarketplacePage() {
  const [status, setStatus] = useState<MarketplaceStatus | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [opLoading, setOpLoading] = useState<Record<string, boolean>>({})

  // Routing settings state
  const [routePriceRule, setRoutePriceRule] = useState(false)
  const [routeVintageRule, setRouteVintageRule] = useState(false)
  const [routeBrandRule, setRouteBrandRule] = useState(false)
  const [defaultDest, setDefaultDest] = useState<PlatformKey[]>([])
  const [savingRouting, setSavingRouting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const sRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/marketplaces/overview`
        )
        if (!sRes.ok) throw new Error('接続状態の取得に失敗しました')
        const rawData = await sRes.json()
        const parsed = MarketplaceOverviewSchema.safeParse(rawData)
        if (!parsed.success) {
          throw new Error('データ形式が不正です')
        }
        const overview = parsed.data.data
        if (!cancelled) {
          const ebayListingsTotal = overview.ebay.listings
            ? Object.values(overview.ebay.listings).reduce((a, b) => a + b, 0)
            : 0
          const joomListingsTotal = overview.joom.listings
            ? Object.values(overview.joom.listings).reduce((a, b) => a + b, 0)
            : 0
          setStatus({
            platforms: {
              ebay: {
                connected: overview.ebay.connected,
                tokenExpiry:
                  overview.ebay.tokenExpired !== null
                    ? overview.ebay.tokenExpired
                      ? 'expired'
                      : null
                    : null,
                lastSyncedAt: null,
                stats: { listings: ebayListingsTotal, orders: 0, sales: 0 },
                settings: { inventorySync: true, orderSync: true, priceSync: false, interval: '30m' },
              },
              joom: {
                connected: overview.joom.connected,
                tokenExpiry: null,
                lastSyncedAt: null,
                stats: { listings: joomListingsTotal, orders: 0, sales: 0 },
                settings: { inventorySync: true, orderSync: true, priceSync: false, interval: '30m' },
              },
              etsy: { ...defaultPlatformStatus },
              shopify: { ...defaultPlatformStatus },
              instagram_shop: { ...defaultPlatformStatus },
              tiktok_shop: { ...defaultPlatformStatus },
            },
          })
          // 注文APIは未実装のため空配列のまま
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

  // Load routing settings on mount
  useEffect(() => {
    const loadRoutingSettings = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/system-settings/category/MARKETPLACE`
        )
        const json = await res.json()
        if (json.success && json.data) {
          if (json.data['marketplace.route.price_rule'] !== undefined)
            setRoutePriceRule(json.data['marketplace.route.price_rule'])
          if (json.data['marketplace.route.vintage_rule'] !== undefined)
            setRouteVintageRule(json.data['marketplace.route.vintage_rule'])
          if (json.data['marketplace.route.brand_rule'] !== undefined)
            setRouteBrandRule(json.data['marketplace.route.brand_rule'])
          if (json.data['marketplace.route.default_dest'] !== undefined)
            setDefaultDest(json.data['marketplace.route.default_dest'])
        }
      } catch (e) {
        addToast('ルーティング設定の読み込みに失敗しました', 'error')
      }
    }
    loadRoutingSettings()
  }, [])

  const handleSaveRouting = async () => {
    setSavingRouting(true)
    try {
      const settings = {
        'marketplace.route.price_rule': routePriceRule,
        'marketplace.route.vintage_rule': routeVintageRule,
        'marketplace.route.brand_rule': routeBrandRule,
        'marketplace.route.default_dest': defaultDest,
      }

      const result = await putApi<any>('/api/system-settings', { settings, reason: 'Marketplace routing update' })

      if (result?.data?.results) {
        for (const r of result.data.results) {
          if (!r.success && r.error === 'Not found') {
            const val = settings[r.key as keyof typeof settings]
            await postApi('/api/system-settings', {
              key: r.key,
              value: val,
              category: 'MARKETPLACE',
              valueType: typeof val === 'boolean' ? 'BOOLEAN' : 'JSON',
              label: r.key,
            })
          }
        }
      }

      addToast('ルーティング設定を保存しました', 'success')
    } catch (error) {
      addToast('保存に失敗しました', 'error')
    } finally {
      setSavingRouting(false)
    }
  }

  const handleConnect = async (platform: PlatformKey) => {
    addToast(`${platformMeta[platform].label}の接続機能は準備中です`, 'info')
  }

  const handleDisconnect = async (platform: PlatformKey) => {
    addToast(`${platformMeta[platform].label}の切断機能は準備中です`, 'info')
  }

  const handleReauth = async (platform: PlatformKey) => {
    addToast(`${platformMeta[platform].label}の再認証機能は準備中です`, 'info')
  }

  const handleSettingChange = async (
    platform: PlatformKey,
    patch: Partial<NonNullable<PlatformStatus['settings']>>
  ) => {
    if (!status) return
    const current = status.platforms[platform]
    const nextSettings = { ...(current.settings ?? {}), ...patch } as NonNullable<PlatformStatus['settings']>
    setStatus({ platforms: { ...status.platforms, [platform]: { ...current, settings: nextSettings } } })
    addToast('同期設定の保存はAPIが準備中です', 'info')
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
                role="status"
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
                    aria-label={`${meta.label}から切断`}
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
                    aria-label={`${meta.label}を再認証`}
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
                  aria-label={`${meta.label}に接続`}
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
                    aria-label={`${meta.label}の在庫同期を切り替え`}
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">注文同期</span>
                  <input
                    type="checkbox"
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-green-500"
                    checked={!!settings.orderSync}
                    onChange={(e) => handleSettingChange(key, { orderSync: e.target.checked })}
                    aria-label={`${meta.label}の注文同期を切り替え`}
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">価格同期</span>
                  <input
                    type="checkbox"
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-green-500"
                    checked={!!settings.priceSync}
                    onChange={(e) => handleSettingChange(key, { priceSync: e.target.checked })}
                    aria-label={`${meta.label}の価格同期を切り替え`}
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-600">同期間隔</span>
                  <select
                    value={settings.interval}
                    onChange={(e) => handleSettingChange(key, { interval: e.target.value as '15m' | '30m' | '1h' })}
                    className="rounded-md border border-gray-300 px-2 py-1"
                    aria-label={`${meta.label}の同期間隔を選択`}
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

          {/* Routing Settings */}
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
                    aria-label="価格ルールを切り替え"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">ヴィンテージルール: 20年以上→Etsy</span>
                  <input
                    type="checkbox"
                    checked={routeVintageRule}
                    onChange={(e) => setRouteVintageRule(e.target.checked)}
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-orange-600"
                    aria-label="ヴィンテージルールを切り替え"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className="text-gray-700">ブランドルール: ブランド品→Shopify</span>
                  <input
                    type="checkbox"
                    checked={routeBrandRule}
                    onChange={(e) => setRouteBrandRule(e.target.checked)}
                    className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-gray-200 outline-none transition peer checked:bg-emerald-600"
                    aria-label="ブランドルールを切り替え"
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
                        aria-label={`${platformMeta[p].label}をデフォルト出品先に設定`}
                      />
                      <span>{platformMeta[p].label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500">ルールと重複する場合は個別ルールを優先します。</p>
              </div>
            </div>
            <div className="flex items-center justify-end border-t p-4">
              <Button onClick={handleSaveRouting} disabled={savingRouting}>
                {savingRouting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </section>

          {/* Recent orders */}
          <section className="mb-16 rounded-lg border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">注文統合ビュー（最近の10件）</h2>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="最近の注文一覧">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">注文ID</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">プラットフォーム</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">金額</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">ステータス</th>
                    <th className="hidden md:table-cell px-4 py-2 text-left font-medium text-gray-600">日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        注文統合APIは準備中です
                      </td>
                    </tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2 font-medium text-gray-900">{o.id}</td>
                      <td className="px-4 py-2">{o.platform}</td>
                      <td className="px-4 py-2">¥{(o.amount ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-2">{o.status}</td>
                      <td className="hidden md:table-cell px-4 py-2">{new Date(o.createdAt).toLocaleString()}</td>
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
