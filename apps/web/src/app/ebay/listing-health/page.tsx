
'use client';

import useSWR from 'swr';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ListingHealthPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-600">出品健全性モニター</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="listings">出品</TabsTrigger>
          <TabsTrigger value="issues">問題</TabsTrigger>
          <TabsTrigger value="scores">スコア</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardSection />
        </TabsContent>

        <TabsContent value="listings">
          <ListingsSection />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesSection />
        </TabsContent>

        <TabsContent value="scores">
          <ScoresSection />
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
  const { data } = useSWR('/api/ebay-listing-health/dashboard', fetcher);
  const summary = data?.data || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard title="総出品数" value={summary.totalListings ?? '-'} />
      <MetricCard title="健全率" value={summary.healthRate ?? '-'} />
      <MetricCard title="問題数" value={summary.issuesCount ?? '-'} />
      <MetricCard title="改善余地" value={summary.improvementOpportunities ?? '-'} />
    </div>
  );
}

function ListingsSection() {
  const { data, mutate, isLoading } = useSWR('/api/ebay-listing-health/listings', fetcher);
  const listings = data?.data || [];

  const runScan = async () => {
    await fetch('/api/ebay-listing-health/listings/scan', { method: 'POST' });
    mutate();
  };

  const fixFirst = async () => {
    const first = listings?.[0];
    if (!first) return;
    await fetch(`/api/ebay-listing-health/listings/${first.id}/fix`, { method: 'POST' });
    mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={runScan} className="bg-amber-600 hover:bg-amber-700">スキャン</Button>
        <Button onClick={fixFirst} variant="outline">先頭を修復</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>出品一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>読み込み中...</div>
          ) : (
            <ul className="list-disc pl-6">
              {listings.map((l: any) => (
                <li key={l.id}>{l.id} — {l.title}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IssuesSection() {
  const { data } = useSWR('/api/ebay-listing-health/issues', fetcher);
  const issues = data?.data || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>問題</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-6">
          {issues.map((i: any) => (
            <li key={i.id}>{i.id} — {i.type} ({i.listingId})</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ScoresSection() {
  const { data } = useSWR('/api/ebay-listing-health/scores', fetcher);
  const scores = data?.data || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>スコア</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-6">
          {scores.map((s: any) => (
            <li key={s.listingId}>{s.listingId} — {s.score}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AnalyticsSection() {
  const { data } = useSWR('/api/ebay-listing-health/analytics', fetcher);
  const analytics = data?.data || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>トップ問題</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6">
            {(analytics.topIssues || []).map((t: string, idx: number) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>平均スコア</CardTitle>
        </CardHeader>
        <CardContent>
          <div>{analytics.avgScore ?? '-'}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSection() {
  const { data, mutate } = useSWR('/api/ebay-listing-health/settings', fetcher);
  const settings = data?.data || { autoScan: true, autoFix: false, notifyOnIssues: true };

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());
    await fetch('/api/ebay-listing-health/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoScan: body.autoScan === 'on',
        autoFix: body.autoFix === 'on',
        notifyOnIssues: body.notifyOnIssues === 'on',
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
            <Input id="autoScan" name="autoScan" type="checkbox" defaultChecked={settings.autoScan} />
            <Label htmlFor="autoScan">自動スキャン</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input id="autoFix" name="autoFix" type="checkbox" defaultChecked={settings.autoFix} />
            <Label htmlFor="autoFix">自動修復</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input id="notifyOnIssues" name="notifyOnIssues" type="checkbox" defaultChecked={settings.notifyOnIssues} />
            <Label htmlFor="notifyOnIssues">問題の通知</Label>
          </div>
          <Button type="submit" className="bg-amber-600 hover:bg-amber-700">保存</Button>
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

