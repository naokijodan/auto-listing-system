'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addToast } from '@/components/ui/toast'
import {
  type PlatformKey,
  type PlatformSummary,
  type InventorySummary,
  type Product,
  type InventoryEvent,
  InventorySummarySchema,
  ProductSchema,
  InventoryEventSchema,
} from './types'

const platforms: { key: PlatformKey; label: string }[] = [
  { key: 'ebay', label: 'eBay' },
  { key: 'joom', label: 'Joom' },
  { key: 'etsy', label: 'Etsy' },
  { key: 'shopify', label: 'Shopify' },
  { key: 'instagram_shop', label: 'Instagram' },
  { key: 'tiktok_shop', label: 'TikTok' },
]

function classNames(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function StatusBadge({ status }: { status?: 'listed' | 'paused' | 'unlisted' | 'error' }) {
  const map = {
    listed: { text: '出品中', color: 'bg-green-100 text-green-700 border-green-200' },
    paused: { text: '停止', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    unlisted: { text: '未出品', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    error: { text: 'エラー', color: 'bg-red-100 text-red-700 border-red-200' },
  } as const
  const icon = status === 'listed' ? '✅' : status === 'paused' ? '⏸' : status === 'unlisted' ? '❌' : status === 'error' ? '⚠' : '—'
  const cfg = status ? map[status] : { text: '—', color: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span
      className={classNames('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs', cfg.color)}
      aria-label={cfg.text}
    >
      <span>{icon}</span>
      <span>{cfg.text}</span>
    </span>
  )
}

export default function InventoryDashboardPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [events, setEvents] = useState<InventoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sRes, pRes, eRes] = await Promise.all([
          fetch('/api/inventory/summary'),
          fetch('/api/inventory/products?page=1&limit=20'),
          fetch('/api/inventory/events?limit=50'),
        ])

        if (!sRes.ok) throw new Error('サマリー取得に失敗しました')
        if (!pRes.ok) throw new Error('商品リスト取得に失敗しました')
        if (!eRes.ok) throw new Error('在庫ログ取得に失敗しました')

        // T9: Zod safeParse for API responses
        const sRaw = await sRes.json()
        const sParsed = InventorySummarySchema.safeParse(sRaw)
        const s = sParsed.success ? sParsed.data : null

        const pRaw = await pRes.json()
        const pItems = Array.isArray(pRaw) ? pRaw : pRaw?.items ?? []
        const validProducts = pItems
          .filter((item: unknown) => ProductSchema.safeParse(item).success)
          .map((item: unknown) => ProductSchema.parse(item))

        const eRaw = await eRes.json()
        const eItems = Array.isArray(eRaw) ? eRaw : []
        const validEvents = eItems
          .filter((item: unknown) => InventoryEventSchema.safeParse(item).success)
          .map((item: unknown) => InventoryEventSchema.parse(item))

        if (!cancelled) {
          setSummary({
            totalProducts: s?.totalProducts ?? 0,
            inStock: s?.inStock ?? 0,
            outOfStock: s?.outOfStock ?? 0,
            syncErrors: s?.syncErrors ?? 0,
            platforms: {
              ebay: s?.platforms?.ebay ?? { name: 'eBay', listings: 0, synced: 0, errors: 0, connected: false },
              joom: s?.platforms?.joom ?? { name: 'Joom', listings: 0, synced: 0, errors: 0, connected: false },
              etsy: s?.platforms?.etsy ?? { name: 'Etsy', listings: 0, synced: 0, errors: 0, connected: false },
              shopify: s?.platforms?.shopify ?? { name: 'Shopify', listings: 0, synced: 0, errors: 0, connected: false },
              instagram_shop:
                s?.platforms?.instagram_shop ?? {
                  name: 'Instagram Shop',
                  listings: 0,
                  synced: 0,
                  errors: 0,
                  connected: false,
                },
              tiktok_shop:
                s?.platforms?.tiktok_shop ?? {
                  name: 'TikTok Shop',
                  listings: 0,
                  synced: 0,
                  errors: 0,
                  connected: false,
                },
            },
          })
          setProducts(validProducts)
          setEvents(validEvents)
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

  const handleSync = async (id: string) => {
    setSyncing((s) => ({ ...s, [id]: true }))
    try {
      const res = await fetch(`/api/inventory/sync/${id}`, { method: 'POST' })
      if (!res.ok) throw new Error('同期に失敗しました')
      // T2: Success toast
      addToast({ type: 'success', message: '在庫を同期しました' })
    } catch (e) {
      // T2: Error toast
      addToast({ type: 'error', message: '同期に失敗しました' })
    } finally {
      setSyncing((s) => ({ ...s, [id]: false }))
    }
  }

  const platformCards = useMemo(() => {
    if (!summary) return null
    return platforms.map((p) => {
      const ps = summary.platforms[p.key]
      return (
        <div key={p.key} className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{p.label}</h3>
            <span
              title={ps.connected ? 'Connected' : 'Disconnected'}
              className={classNames(
                'h-3 w-3 rounded-full',
                ps.connected ? 'bg-green-500' : 'bg-gray-300'
              )}
            />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">出品数</dt>
              <dd className="font-medium">{ps.listings}</dd>
            </div>
            <div>
              <dt className="text-gray-500">同期済み</dt>
              <dd className="font-medium">{ps.synced}</dd>
            </div>
            <div>
              <dt className="text-gray-500">エラー数</dt>
              <dd className="font-medium">{ps.errors}</dd>
            </div>
            <div>
              <dt className="text-gray-500">接続状態</dt>
              <dd className={classNames('font-medium', ps.connected ? 'text-green-600' : 'text-gray-500')}>
                {ps.connected ? '接続中' : '未接続'}
              </dd>
            </div>
          </dl>
        </div>
      )
    })
  }, [summary])

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-6 lg:p-8" aria-label="在庫一元管理">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">在庫一元管理</h1>
      </header>

      {loading ? (
        <div role="status" className="rounded-md border border-indigo-100 bg-indigo-50 p-4 text-indigo-700">読み込み中...</div>
      ) : error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : (
        <>
          {/* Summary Cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">総商品数</div>
              <div className="mt-1 text-2xl font-semibold">{summary?.totalProducts ?? 0}</div>
            </div>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">在庫あり</div>
              <div className="mt-1 text-2xl font-semibold text-green-600">{summary?.inStock ?? 0}</div>
            </div>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">在庫切れ</div>
              <div className="mt-1 text-2xl font-semibold text-rose-600">{summary?.outOfStock ?? 0}</div>
            </div>
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">同期エラー</div>
              <div className="mt-1 text-2xl font-semibold text-orange-600">{summary?.syncErrors ?? 0}</div>
            </div>
          </section>

          {/* Platform Cards */}
          <section aria-label="プラットフォーム別統計" className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">{platformCards}</section>

          {/* Products Table */}
          <section aria-label="商品一覧" className="mb-8 rounded-lg border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold text-indigo-700">商品一覧</h2>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-600">商品名</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-600">在庫数</th>
                    {platforms.map((p) => (
                      <th
                        key={p.key}
                        scope="col"
                        className="hidden whitespace-nowrap px-4 py-2 text-left font-medium text-gray-600 md:table-cell"
                      >
                        {p.label}
                      </th>
                    ))}
                    <th scope="col" className="hidden whitespace-nowrap px-4 py-2 text-left font-medium text-gray-600 sm:table-cell">最終同期</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-600">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                        商品がありません
                      </td>
                    </tr>
                  )}
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2 font-medium text-gray-900">{prod.name}</td>
                      <td className="px-4 py-2">{prod.stock}</td>
                      {platforms.map((p) => (
                        <td key={p.key} className="hidden px-4 py-2 md:table-cell">
                          <StatusBadge status={prod.status?.[p.key]} />
                        </td>
                      ))}
                      <td className="hidden px-4 py-2 sm:table-cell">
                        {prod.lastSyncedAt ? new Date(prod.lastSyncedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSync(prod.id)}
                            disabled={!!syncing[prod.id]}
                            aria-label="同期"
                            aria-busy={!!syncing[prod.id]}
                            className={classNames(
                              'rounded-md border px-3 py-1 text-xs font-medium',
                              syncing[prod.id]
                                ? 'cursor-wait border-indigo-200 bg-indigo-100 text-indigo-400'
                                : 'border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700'
                            )}
                          >
                            {syncing[prod.id] ? '同期中…' : '全同期'}
                          </button>
                          <button
                            onClick={() => addToast({ type: 'info', message: 'この機能は今後実装予定です' })}
                            aria-label="出品先変更"
                            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            出品先変更
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Inventory Events */}
          <section aria-label="在庫変動ログ" className="mb-16 rounded-lg border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold text-indigo-700">在庫変動ログ</h2>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-600">日時</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-600">商品名</th>
                    <th scope="col" className="hidden px-4 py-2 text-left font-medium text-gray-600 md:table-cell">イベント種別</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium text-gray-600">変動数</th>
                    <th scope="col" className="hidden px-4 py-2 text-left font-medium text-gray-600 sm:table-cell">発生元</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                        変動履歴がありません
                      </td>
                    </tr>
                  )}
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2">{new Date(ev.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-2 font-medium">{ev.productName}</td>
                      <td className="hidden px-4 py-2 md:table-cell">{ev.type}</td>
                      <td className={classNames('px-4 py-2', ev.diff >= 0 ? 'text-green-600' : 'text-rose-600')}>
                        {ev.diff > 0 ? `+${ev.diff}` : ev.diff}
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">{ev.source}</td>
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
