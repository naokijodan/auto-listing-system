'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, Server, AlertTriangle, CheckCircle, Clock, Cable, Database, Store } from 'lucide-react';
import Link from 'next/link';

type ApiResp<T> = { success: boolean; data: T };

type QueueState = { name: string; waiting: number; active: number; failed: number; completed: number };
type Scheduler = { marketplace: string; syncType: string; lastRunAt: string | null; isEnabled: boolean };

type SystemHealth = {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  redis: 'CONNECTED' | 'ERROR';
  database: 'CONNECTED' | 'ERROR';
  queues: QueueState[];
  schedulers: Scheduler[];
  timestamp: string;
};

type ScrapingStats = {
  summary: {
    last24h: { total: number; failed: number; successRate: number };
    last7d: { total: number; failed: number; successRate: number; banDetections: number };
    last30d: { total: number; failed: number; successRate: number };
  };
  bySource: Record<string, { total: number; failed: number; successRate: number }>;
  hourly: Array<{ hour: string; total: number; failed: number; errorRate: number }>;
};

type InventoryStats = {
  today: { checked: number; outOfStock: number; priceChanges: number };
  bySource: Record<string, { checked: number; priceChanged: number }>;
};

type MarketplaceSync = Record<string, { counts: { synced: number; pending: number; error: number }; lastSyncAt: string | null }>;

type AlertItem = { id: string; type: string; title?: string | null; message: string; severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'; createdAt: string };

const statusColor = (status: SystemHealth['status']) => (
  status === 'HEALTHY' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : status === 'DEGRADED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
);

export default function MonitoringPage() {
  const { data: healthResp } = useSWR<ApiResp<SystemHealth>>('/api/monitoring/system-health', fetcher, { refreshInterval: 30000 });
  const { data: scrapingResp } = useSWR<ApiResp<ScrapingStats>>('/api/monitoring/scraping-stats', fetcher, { refreshInterval: 30000 });
  const { data: inventoryResp } = useSWR<ApiResp<InventoryStats>>('/api/monitoring/inventory-stats', fetcher, { refreshInterval: 30000 });
  const { data: syncResp } = useSWR<ApiResp<MarketplaceSync>>('/api/monitoring/marketplace-sync', fetcher, { refreshInterval: 30000 });
  const { data: alertsResp } = useSWR<ApiResp<AlertItem[]>>('/api/monitoring/alerts/recent', fetcher, { refreshInterval: 30000 });

  const health = healthResp?.data;
  const scraping = scrapingResp?.data;
  const inventory = inventoryResp?.data;
  const sync = syncResp?.data;
  const alerts = alertsResp?.data ?? [];

  const ringData = [{ name: 'Success', value: scraping?.summary.last24h.successRate ?? 0 }];
  const hourlyData = (scraping?.hourly ?? []).map(h => ({ hour: new Date(h.hour).getHours().toString().padStart(2, '0'), errorRate: h.errorRate }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-amber-600" />
          <h1 className="text-2xl font-bold">運用監視</h1>
        </div>
        <div className="text-sm text-zinc-500">自動更新 30秒</div>
      </div>

      {/* セクション1: システムヘルス */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>システムヘルス</CardTitle>
            <CardDescription>ワーカー・DB・Redisの状態</CardDescription>
          </div>
          {health && (
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusColor(health.status)}`}>
              {health.status === 'HEALTHY' ? <CheckCircle className="h-4 w-4" /> : health.status === 'DEGRADED' ? <AlertTriangle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {health.status}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4 dark:border-zinc-800">
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
                <Cable className="h-4 w-4" /> Redis
              </div>
              <Badge variant="secondary" className={health?.redis === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}>
                {health?.redis ?? '—'}
              </Badge>
            </div>
            <div className="rounded-lg border p-4 dark:border-zinc-800">
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
                <Database className="h-4 w-4" /> DB
              </div>
              <Badge variant="secondary" className={health?.database === 'CONNECTED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}>
                {health?.database ?? '—'}
              </Badge>
            </div>
            <div className="rounded-lg border p-4 dark:border-zinc-800 md:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
                <Server className="h-4 w-4" /> ワーカーキュー 状態
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {(health?.queues ?? []).map(q => (
                  <div key={q.name} className="rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
                    <div className="truncate font-medium">{q.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">待機 {q.waiting}</span>
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">処理 {q.active}</span>
                      <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-300">失敗 {q.failed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-sm text-zinc-500">スケジューラー最終実行</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {(health?.schedulers ?? []).map((s, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-md border p-2 text-xs dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{s.marketplace} / {s.syncType}</span>
                  </div>
                  <span className="text-zinc-500">{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('ja-JP') : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* セクション2: スクレイピング成功率 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>スクレイピング成功率（直近24h）</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="60%" outerRadius="90%" data={ringData} startAngle={90} endAngle={-270}>
                <RadialBar minAngle={15} background clockWise dataKey="value" fill="#10b981" cornerRadius={10} />
                <Legend verticalAlign="middle" content={() => (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-600">{scraping?.summary.last24h.successRate ?? 0}%</div>
                    <div className="text-xs text-zinc-500">Total {scraping?.summary.last24h.total ?? 0} / Failed {scraping?.summary.last24h.failed ?? 0}</div>
                  </div>
                )} />
              </RadialBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>時間帯別エラー率（24h）</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                <YAxis unit="%" width={40} />
                <Tooltip />
                <Bar dataKey="errorRate" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ソースタイプ別 成功率（7d）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ソース</TableHead>
                <TableHead className="text-right">成功率</TableHead>
                <TableHead className="text-right">総件数</TableHead>
                <TableHead className="text-right">失敗</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(scraping?.bySource ?? {}).map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell className="font-medium">{k}</TableCell>
                  <TableCell className="text-right">{v.successRate}%</TableCell>
                  <TableCell className="text-right">{v.total}</TableCell>
                  <TableCell className="text-right">{v.failed}</TableCell>
                </TableRow>
              ))}
              {Object.keys(scraping?.bySource ?? {}).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-zinc-500">データなし</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-3 text-sm text-zinc-500">Ban検知（7d）: {scraping?.summary.last7d.banDetections ?? 0} 件</div>
        </CardContent>
      </Card>

      {/* セクション3: 在庫監視 */}
      <Card>
        <CardHeader>
          <CardTitle>在庫監視</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 text-center dark:border-zinc-800">
              <div className="text-sm text-zinc-500">今日のチェック数</div>
              <div className="text-2xl font-bold">{inventory?.today.checked ?? 0}</div>
            </div>
            <div className="rounded-lg border p-4 text-center dark:border-zinc-800">
              <div className="text-sm text-zinc-500">在庫切れ検知</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{inventory?.today.outOfStock ?? 0}</div>
            </div>
            <div className="rounded-lg border p-4 text-center dark:border-zinc-800">
              <div className="text-sm text-zinc-500">価格変動検知</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{inventory?.today.priceChanges ?? 0}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-sm text-zinc-500">ソースタイプ別（今日）</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ソース</TableHead>
                  <TableHead className="text-right">チェック数</TableHead>
                  <TableHead className="text-right">価格変動</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(inventory?.bySource ?? {}).map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="font-medium">{k}</TableCell>
                    <TableCell className="text-right">{v.checked}</TableCell>
                    <TableCell className="text-right">{v.priceChanged}</TableCell>
                  </TableRow>
                ))}
                {Object.keys(inventory?.bySource ?? {}).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-zinc-500">データなし</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* セクション4: マーケットプレイス同期 */}
      <Card>
        <CardHeader>
          <CardTitle>マーケットプレイス同期</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {['joom', 'ebay'].map((mp) => {
              const s = sync?.[mp];
              return (
                <div key={mp} className="flex items-center justify-between rounded-lg border p-4 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Store className="h-6 w-6" />
                    <div>
                      <div className="font-semibold uppercase">{mp}</div>
                      <div className="text-xs text-zinc-500">最終同期: {s?.lastSyncAt ? new Date(s.lastSyncAt).toLocaleString('ja-JP') : '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">同期済 {s?.counts.synced ?? 0}</Badge>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">未同期 {s?.counts.pending ?? 0}</Badge>
                    <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">エラー {s?.counts.error ?? 0}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* セクション5: 直近のアラート */}
      <Card>
        <CardHeader>
          <CardTitle>直近のアラート</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイプ</TableHead>
                <TableHead>メッセージ</TableHead>
                <TableHead>重要度</TableHead>
                <TableHead>時刻</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.type}</TableCell>
                  <TableCell className="max-w-[640px] truncate" title={a.message}>{a.title ? `${a.title} - ` : ''}{a.message}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={
                      a.severity === 'ERROR' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : a.severity === 'WARNING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : a.severity === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }>
                      {a.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">{new Date(a.createdAt).toLocaleString('ja-JP')}</TableCell>
                </TableRow>
              ))}
              {alerts.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-zinc-500">アラートなし</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 戻る/ショートカット */}
      <div className="flex justify-end">
        <Link href="/" className="text-sm text-amber-600 hover:underline">ダッシュボードへ戻る →</Link>
      </div>
    </div>
  );
}

