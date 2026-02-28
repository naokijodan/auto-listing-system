
'use client';

import useSWR from 'swr';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OrderDisputePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-600">注文紛争管理</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="disputes">紛争</TabsTrigger>
          <TabsTrigger value="evidence">証拠</TabsTrigger>
          <TabsTrigger value="responses">対応</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardSection />
        </TabsContent>

        <TabsContent value="disputes">
          <DisputesSection />
        </TabsContent>

        <TabsContent value="evidence">
          <EvidenceSection />
        </TabsContent>

        <TabsContent value="responses">
          <ResponsesSection />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsSection />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardSection() {
  const { data } = useSWR('/api/ebay-order-dispute/dashboard', fetcher);
  const summary = data?.data || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard title="総紛争数" value={summary.totalDisputes ?? '-'} />
      <MetricCard title="オープン" value={summary.open ?? '-'} />
      <MetricCard title="解決済" value={summary.resolved ?? '-'} />
      <MetricCard title="勝率" value={summary.winRate ?? '-'} />
    </div>
  );
}

function DisputesSection() {
  const { data, mutate } = useSWR('/api/ebay-order-dispute/disputes', fetcher);
  const disputes = data?.data || [];

  const escalate = async (id: string) => {
    await fetch(`/api/ebay-order-dispute/disputes/${id}/escalate`, { method: 'POST' });
    mutate();
  };

  const resolve = async (id: string) => {
    await fetch(`/api/ebay-order-dispute/disputes/${id}/resolve`, { method: 'POST' });
    mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>紛争一覧</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {disputes.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between">
              <div>{d.id} — {d.orderId} — {d.status}</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => escalate(d.id)}>エスカレート</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => resolve(d.id)}>解決</Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EvidenceSection() {
  const { data, mutate } = useSWR('/api/ebay-order-dispute/evidence', fetcher);
  const items = data?.data || [];

  const upload = async () => {
    await fetch('/api/ebay-order-dispute/evidence/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'note' }) });
    mutate();
  };

  const remove = async () => {
    await fetch('/api/ebay-order-dispute/evidence/delete', { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={upload} className="bg-red-600 hover:bg-red-700">アップロード</Button>
        <Button variant="outline" onClick={remove}>削除</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>証拠一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6">
            {items.map((e: any) => (
              <li key={e.id}>{e.id} — {e.type} ({e.disputeId})</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ResponsesSection() {
  const { data: templates } = useSWR('/api/ebay-order-dispute/responses/templates', fetcher);
  const { data: list, mutate } = useSWR('/api/ebay-order-dispute/responses', fetcher);
  const items = list?.data || [];
  const tpls = templates?.data || [];

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    await fetch('/api/ebay-order-dispute/responses/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    mutate();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>送信済み対応</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6">
            {items.map((r: any) => (
              <li key={r.id}>{r.disputeId} — {r.message}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>対応送信</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={send} className="space-y-3">
            <div>
              <Label htmlFor="disputeId">紛争ID</Label>
              <Input id="disputeId" name="disputeId" placeholder="D-xxxx" required />
            </div>
            <div>
              <Label htmlFor="message">メッセージ</Label>
              <Textarea id="message" name="message" placeholder="テンプレートまたは自由入力" />
            </div>
            <div>
              <Label htmlFor="template">テンプレート</Label>
              <select id="template" name="template" className="w-full border rounded p-2">
                <option value="">選択しない</option>
                {tpls.map((t: any) => (
                  <option key={t.key} value={t.key}>{t.key}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="bg-red-600 hover:bg-red-700">送信</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsSection() {
  const { data } = useSWR('/api/ebay-order-dispute/analytics', fetcher);
  const analytics = data?.data || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>概要</CardTitle>
        </CardHeader>
        <CardContent>
          <div>総数: {analytics.total ?? '-'}</div>
          <div>オープン: {analytics.open ?? '-'}</div>
          <div>解決済: {analytics.resolved ?? '-'}</div>
          <div>勝率: {analytics.winRate ?? '-'}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSection() {
  const { data, mutate } = useSWR('/api/ebay-order-dispute/settings', fetcher);
  const settings = data?.data || { autoEscalate: false, notifyOnUpdate: true };

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    await fetch('/api/ebay-order-dispute/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoEscalate: body.autoEscalate === 'on',
        notifyOnUpdate: body.notifyOnUpdate === 'on',
      }),
    });
    mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-4">
          <div className="flex items-center gap-2">
            <Input id="autoEscalate" name="autoEscalate" type="checkbox" defaultChecked={settings.autoEscalate} />
            <Label htmlFor="autoEscalate">自動エスカレーション</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input id="notifyOnUpdate" name="notifyOnUpdate" type="checkbox" defaultChecked={settings.notifyOnUpdate} />
            <Label htmlFor="notifyOnUpdate">更新通知</Label>
          </div>
          <Button type="submit" className="bg-red-600 hover:bg-red-700">保存</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value }: { title: string; value: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{String(value)}</div>
      </CardContent>
    </Card>
  );
}

