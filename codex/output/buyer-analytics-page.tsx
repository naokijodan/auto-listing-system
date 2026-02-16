"use client";

import React from "react";
import useSWR from "swr";
import buyerApi from "@/ebay-buyer-analytics";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = <T,>(fn: () => Promise<T>) => fn();

function BuyersList() {
  const { data, error, isLoading, mutate } = useSWR(() => ["buyers:list"], () => fetcher(buyerApi.listBuyers));
  if (error) return <div className="text-red-600">エラーが発生しました</div>;
  if (isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>バイヤー一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            onClick={async () => {
              await buyerApi.createBuyer({
                name: "New Buyer",
                totalPurchases: 0,
                lastPurchase: new Date().toISOString().slice(0, 10),
                lifetimeValue: 0,
              });
              mutate();
            }}
          >
            新規作成
          </Button>
        </div>
        <div className="space-y-3">
          {data!.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-sm text-muted-foreground">
                  購入回数: {b.totalPurchases}・最終購入: {b.lastPurchase}・LTV: ${b.lifetimeValue}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={async () => { await buyerApi.duplicateBuyer(b.id); mutate(); }}>
                  複製
                </Button>
                <Button variant="destructive" onClick={async () => { await buyerApi.deleteBuyer(b.id); mutate(); }}>
                  削除
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const stats = useSWR(() => ["dashboard:stats"], () => fetcher(buyerApi.getDashboardStats));
  const summary = useSWR(() => ["dashboard:summary"], () => fetcher(buyerApi.getDashboard));
  const alerts = useSWR(() => ["dashboard:alerts"], () => fetcher(buyerApi.getDashboardAlerts));

  if (stats.error || summary.error || alerts.error) return <div className="text-red-600">読み込みエラー</div>;
  if (stats.isLoading || summary.isLoading || alerts.isLoading) return <div>読み込み中...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>総バイヤー数</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">{summary.data!.totalBuyers}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>リピート率</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">{(summary.data!.repeatRate * 100).toFixed(1)}%</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>平均購入額</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">${summary.data!.avgOrderValue.toFixed(2)}</CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>週間購入数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {stats.data!.weeklyPurchases.join(" / ")}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>アラート</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.data!.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2">
              <Badge variant={a.type === "warning" ? "destructive" : "secondary"}>{a.type}</Badge>
              <span>{a.message}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Segments() {
  const { data, error, isLoading } = useSWR(() => ["segments:list"], () => fetcher(buyerApi.listSegments));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>セグメント</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data!.map((s) => (
          <div key={s.id} className="rounded border p-3">
            <div className="font-medium">{s.name}</div>
            <div className="text-sm text-muted-foreground">条件: {s.criteria}</div>
            <div className="text-sm text-muted-foreground">対象数: {s.size}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Behavior() {
  const overview = useSWR(() => ["behavior:overview"], () => fetcher(buyerApi.getBehaviorOverview));
  const funnel = useSWR(() => ["behavior:funnel"], () => fetcher(buyerApi.getBehaviorFunnel));
  if (overview.error || funnel.error) return <div className="text-red-600">読み込みエラー</div>;
  if (overview.isLoading || funnel.isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>行動分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>閲覧→購入率: {(overview.data!.viewToPurchaseRate * 100).toFixed(1)}%</div>
        <div>平均セッション: {overview.data!.avgSessionMinutes} 分</div>
        <div>カゴ落ち率: {(overview.data!.cartAbandonmentRate * 100).toFixed(0)}%</div>
        <div className="text-sm text-muted-foreground">
          ファネル: {funnel.data!.stages.join(" → ")}
          （{funnel.data!.rates.map((r: number) => (r * 100).toFixed(1)).join("% / ")}%）
        </div>
      </CardContent>
    </Card>
  );
}

function Reports() {
  const { data, error, isLoading, mutate } = useSWR(() => ["reports:list"], () => fetcher(buyerApi.listReports));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>レポート</CardTitle>
        <Button
          onClick={async () => {
            await buyerApi.createReport({ title: "On-demand Report" });
            mutate();
          }}
        >
          生成
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {data!.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-sm text-muted-foreground">{r.createdAt}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{r.status}</Badge>
              {r.url ? (
                <a className="text-sm text-primary underline" href={r.url}>
                  ダウンロード
                </a>
              ) : (
                <Button size="sm" variant="secondary" onClick={async () => { await buyerApi.runReport(r.id); mutate(); }}>
                  実行
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Settings() {
  const { data, error, isLoading, mutate } = useSWR(() => ["settings:get"], () => fetcher(buyerApi.getSettings));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  const s = data!;
  return (
    <Card>
      <CardHeader>
        <CardTitle>設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>テーマカラー: <Badge variant="secondary">{s.themeColor}</Badge></div>
        <div>通知: {s.notificationsEnabled ? "有効" : "無効"}</div>
        <div>アラート閾値: {s.alertThreshold}</div>
        <Button onClick={async () => { await buyerApi.updateSettings({ notificationsEnabled: !s.notificationsEnabled }); mutate(); }}>
          通知を{!s.notificationsEnabled ? "有効" : "無効"}にする
        </Button>
      </CardContent>
    </Card>
  );
}

function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-pink-600">バイヤー分析</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="buyers">バイヤー</TabsTrigger>
          <TabsTrigger value="segments">セグメント</TabsTrigger>
          <TabsTrigger value="behavior">行動分析</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><Dashboard /></TabsContent>
        <TabsContent value="buyers"><BuyersList /></TabsContent>
        <TabsContent value="segments"><Segments /></TabsContent>
        <TabsContent value="behavior"><Behavior /></TabsContent>
        <TabsContent value="reports"><Reports /></TabsContent>
        <TabsContent value="settings"><Settings /></TabsContent>
      </Tabs>
    </div>
  );
}

export default Page;

