'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FeedbackAutomationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">フィードバック自動化</h1>
      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="automations">自動化</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations">
          <Card>
            <CardHeader>
              <CardTitle>自動化の管理</CardTitle>
            </CardHeader>
            <CardContent>
              <AutomationsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>ルール設定</CardTitle>
            </CardHeader>
            <CardContent>
              <RulesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardPanel() {
  const { data: summary } = useSWR('/api/ebay-feedback-automation/dashboard/summary', fetcher);
  const { data: pending } = useSWR('/api/ebay-feedback-automation/dashboard/pending', fetcher);
  const { data: sent } = useSWR('/api/ebay-feedback-automation/dashboard/sent', fetcher);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge>Summary</Badge>
        <span className="text-sm text-muted-foreground">{summary ? '読み込み完了' : '読込中...'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Pending</Badge>
        <span className="text-sm text-muted-foreground">{pending ? '読み込み完了' : '読込中...'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">Sent</Badge>
        <span className="text-sm text-muted-foreground">{sent ? '読み込み完了' : '読込中...'}</span>
      </div>
    </div>
  );
}

function AutomationsPanel() {
  const { data, mutate, isLoading } = useSWR('/api/ebay-feedback-automation/automations', fetcher);
  const enable = async (id: string) => {
    await fetch(`/api/ebay-feedback-automation/automations/${id}/enable`, { method: 'POST' });
    mutate();
  };
  const test = async (id: string) => {
    await fetch(`/api/ebay-feedback-automation/automations/${id}/test`, { method: 'POST' });
  };
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{isLoading ? '読込中...' : '自動化一覧'}</div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => mutate()}>再読込</Button>
        <Button size="sm" variant="secondary" onClick={() => enable('1')}>ID:1 有効化</Button>
        <Button size="sm" variant="outline" onClick={() => test('1')}>ID:1 テスト</Button>
      </div>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function TemplatesPanel() {
  const { data } = useSWR('/api/ebay-feedback-automation/templates', fetcher);
  const preview = async () => {
    await fetch('/api/ebay-feedback-automation/templates/preview', { method: 'POST', body: JSON.stringify({ sample: true }), headers: { 'Content-Type': 'application/json' } });
  };
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={preview}>プレビュー</Button>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function RulesPanel() {
  const { data } = useSWR('/api/ebay-feedback-automation/rules', fetcher);
  const prioritize = async () => {
    await fetch('/api/ebay-feedback-automation/rules/priority', { method: 'PUT', body: JSON.stringify({ order: [1, 2, 3] }), headers: { 'Content-Type': 'application/json' } });
  };
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={prioritize}>優先度を更新</Button>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function AnalyticsPanel() {
  const { data: overview } = useSWR('/api/ebay-feedback-automation/analytics', fetcher);
  const { data: performance } = useSWR('/api/ebay-feedback-automation/analytics/performance', fetcher);
  const { data: response } = useSWR('/api/ebay-feedback-automation/analytics/response-rate', fetcher);
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(overview, null, 2)}</pre>
        <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(performance, null, 2)}</pre>
        <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(response, null, 2)}</pre>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const { data, mutate } = useSWR('/api/ebay-feedback-automation/settings', fetcher);
  const save = async () => {
    await fetch('/api/ebay-feedback-automation/settings', { method: 'PUT', body: JSON.stringify({ enabled: true }), headers: { 'Content-Type': 'application/json' } });
    mutate();
  };
  return (
    <div className="space-y-3">
      <Button size="sm" className="bg-orange-600 text-white hover:bg-orange-700" onClick={save}>保存</Button>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

