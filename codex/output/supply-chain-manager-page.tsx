"use client";

import React from "react";
import useSWR from "swr";
import scmApi from "@/ebay-supply-chain-manager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fetcher = <T,>(fn: () => Promise<T>) => fn();

function Dashboard() {
  const summary = useSWR(() => ["scm:dashboard"], () => fetcher(scmApi.getDashboard));
  const alerts = useSWR(() => ["scm:alerts"], () => fetcher(scmApi.getDashboardAlerts));
  if (summary.error || alerts.error) return <div className="text-red-600">読み込みエラー</div>;
  if (summary.isLoading || alerts.isLoading) return <div>読み込み中...</div>;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>サプライヤー数</CardTitle></CardHeader>
        <CardContent className="text-3xl font-bold">{summary.data!.totalSuppliers}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>発注中</CardTitle></CardHeader>
        <CardContent className="text-3xl font-bold">{summary.data!.openOrders}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>在庫不足SKU</CardTitle></CardHeader>
        <CardContent className="space-x-2">
          {summary.data!.lowStockSkus.length === 0 ? "なし" : summary.data!.lowStockSkus.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader><CardTitle>アラート</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {alerts.data!.map((a: any) => (
            <Badge key={a.id} variant={a.type === "warning" ? "destructive" : "secondary"}>{a.message}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Suppliers() {
  const { data, error, isLoading, mutate } = useSWR(() => ["scm:suppliers"], () => fetcher(scmApi.listSuppliers));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>サプライヤー</CardTitle>
        <Button onClick={async () => {
          await scmApi.createSupplier({ name: "New Supplier", rating: 4.0, leadTimeDays: 10, active: true });
          mutate();
        }}>新規作成</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {data!.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-muted-foreground">評価: {s.rating}・LT: {s.leadTimeDays}日・{s.active ? "有効" : "無効"}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={async () => { await scmApi.duplicateSupplier(s.id); mutate(); }}>複製</Button>
              <Button variant="destructive" onClick={async () => { await scmApi.deleteSupplier(s.id); mutate(); }}>削除</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Orders() {
  const { data, error, isLoading, mutate } = useSWR(() => ["scm:orders"], () => fetcher(scmApi.listOrders));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>発注</CardTitle>
        <Button onClick={async () => {
          await scmApi.createOrder({ supplierId: "s1", status: "draft", eta: new Date().toISOString().slice(0,10), items: [{ sku: "SKU-001", qty: 10 }] });
          mutate();
        }}>発注作成</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {data!.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">#{o.id}（{o.status}）</div>
              <div className="text-sm text-muted-foreground">ETA: {o.eta}・品目: {o.items.map((i) => `${i.sku} x${i.qty}`).join(", ")}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={async () => { await scmApi.updateOrder(o.id, { status: "placed" }); mutate(); }}>発注確定</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Inventory() {
  const { data, error, isLoading, mutate } = useSWR(() => ["scm:inventory"], () => fetcher(scmApi.listInventory));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader><CardTitle>在庫</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {data!.map((it) => (
          <div key={it.sku} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">{it.name}（{it.sku}）</div>
              <div className="text-sm text-muted-foreground">在庫: {it.stock}・再発注点: {it.reorderPoint}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={async () => { await scmApi.adjustInventory(it.sku, +10); mutate(); }}>+10</Button>
              <Button size="sm" variant="secondary" onClick={async () => { await scmApi.adjustInventory(it.sku, -10); mutate(); }}>-10</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Logistics() {
  const { data, error, isLoading } = useSWR(() => ["scm:shipments"], () => fetcher(scmApi.listShipments));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  return (
    <Card>
      <CardHeader><CardTitle>物流追跡</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {data!.map((sh) => (
          <div key={sh.id} className="rounded border p-3">
            <div className="font-medium">#{sh.id} - {sh.carrier}</div>
            <div className="text-sm text-muted-foreground">伝票: {sh.trackingNumber}・ステータス: {sh.status}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Settings() {
  const { data, error, isLoading, mutate } = useSWR(() => ["scm:settings"], () => fetcher(scmApi.getSettings));
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  if (isLoading) return <div>読み込み中...</div>;
  const s = data!;
  return (
    <Card>
      <CardHeader><CardTitle>設定</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>テーマカラー: <Badge variant="secondary">{s.themeColor}</Badge></div>
        <div>自動発注: {s.autoReorder ? "有効" : "無効"}</div>
        <div>安全在庫率: {s.safetyStockPct}%</div>
        <Button onClick={async () => { await scmApi.updateSettings({ autoReorder: !s.autoReorder }); mutate(); }}>
          自動発注を{!s.autoReorder ? "有効" : "無効"}にする
        </Button>
      </CardContent>
    </Card>
  );
}

function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-orange-600">サプライチェーン管理</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-2">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="suppliers">サプライヤー</TabsTrigger>
          <TabsTrigger value="orders">発注</TabsTrigger>
          <TabsTrigger value="inventory">在庫</TabsTrigger>
          <TabsTrigger value="logistics">物流</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><Dashboard /></TabsContent>
        <TabsContent value="suppliers"><Suppliers /></TabsContent>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="inventory"><Inventory /></TabsContent>
        <TabsContent value="logistics"><Logistics /></TabsContent>
        <TabsContent value="settings"><Settings /></TabsContent>
      </Tabs>
    </div>
  );
}

export default Page;

