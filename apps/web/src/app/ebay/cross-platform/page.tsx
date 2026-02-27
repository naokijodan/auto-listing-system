// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 278: eBay Cross-Platform Syncer（クロスプラットフォーム同期）
// テーマカラー: indigo-600

export default function EbayCrossPlatformPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-cross-platform/dashboard', fetcher);
  const { data: connectionsData } = useSWR('/api/ebay-cross-platform/connections', fetcher);
  const { data: rulesData } = useSWR('/api/ebay-cross-platform/rules', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-cross-platform/settings', fetcher);

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'AMAZON': return 'Amazon';
      case 'YAHOO_AUCTION': return 'ヤフオク';
      case 'MERCARI': return 'メルカリ';
      case 'RAKUTEN': return '楽天';
      case 'SHOPIFY': return 'Shopify';
      default: return platform;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-indigo-600">クロスプラットフォーム同期</h1>
        <p className="text-gray-600">複数マーケットプレイス間の在庫・価格を同期</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="connections">接続</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="sync">同期</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">接続プラットフォーム</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-indigo-600">{dashboardData?.connectedPlatforms || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">同期商品数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.totalSyncedProducts?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">同期成功率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.syncSuccessRate || 0}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">保留中</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{dashboardData?.pendingSyncs || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>同期ステータス</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { platform: 'AMAZON', status: 'SYNCED', products: 800, pending: 5 },
                    { platform: 'YAHOO_AUCTION', status: 'SYNCED', products: 600, pending: 3 },
                    { platform: 'MERCARI', status: 'SYNCING', products: 700, pending: 7 },
                    { platform: 'RAKUTEN', status: 'SYNCED', products: 400, pending: 0 },
                  ].map((p) => (
                    <div key={p.platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center font-bold text-indigo-600">{p.platform.slice(0, 2)}</div>
                        <div><div className="font-medium">{getPlatformLabel(p.platform)}</div><div className="text-sm text-gray-500">{p.products}商品</div></div>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.pending > 0 && <span className="text-sm text-yellow-600">{p.pending}保留</span>}
                        <Badge className={p.status === 'SYNCED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{p.status === 'SYNCED' ? '同期済み' : '同期中'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>アラート</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm font-medium text-yellow-800">同期エラー</p><p className="text-sm text-yellow-700">Amazon同期で3件のエラーが発生</p></div>
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded"><p className="text-sm font-medium text-red-800">在庫不一致</p><p className="text-sm text-red-700">5件の商品で在庫の不一致を検出</p></div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"><p className="text-sm font-medium text-blue-800">価格変更</p><p className="text-sm text-blue-700">メルカリで価格変更を検出</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="connections">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>プラットフォーム接続</CardTitle><Button className="bg-indigo-600 hover:bg-indigo-700">新規接続</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connectionsData?.connections?.map((conn: any) => (
                  <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center font-bold text-indigo-600">{conn.platform.slice(0, 2)}</div>
                      <div><div className="font-medium">{getPlatformLabel(conn.platform)}</div><div className="text-sm text-gray-500">接続: {conn.connectedAt} • {conn.products}商品</div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={conn.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{conn.status === 'ACTIVE' ? '有効' : '無効'}</Badge>
                      <Button variant="outline" size="sm">設定</Button>
                      <Button variant="outline" size="sm">テスト</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>同期ルール</CardTitle><Button className="bg-indigo-600 hover:bg-indigo-700">ルール作成</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rulesData?.rules?.map((rule: any) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div><div className="font-medium">{rule.name}</div><div className="text-sm text-gray-500">{rule.source} → {rule.target} • {rule.type}</div></div>
                    <div className="flex items-center gap-4">
                      <Badge className={rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{rule.isActive ? '有効' : '無効'}</Badge>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>手動同期</CardTitle><CardDescription>今すぐ同期を実行</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">プラットフォーム</label>
                  <Select><SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">すべて</SelectItem>
                      <SelectItem value="AMAZON">Amazon</SelectItem>
                      <SelectItem value="YAHOO_AUCTION">ヤフオク</SelectItem>
                      <SelectItem value="MERCARI">メルカリ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">同期タイプ</label>
                  <Select><SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL">完全同期</SelectItem>
                      <SelectItem value="INVENTORY">在庫のみ</SelectItem>
                      <SelectItem value="PRICE">価格のみ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">同期を開始</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>同期履歴</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'INVENTORY', platforms: ['AMAZON'], status: 'COMPLETED', items: 800, duration: 45 },
                    { type: 'PRICE', platforms: ['ALL'], status: 'COMPLETED', items: 2500, duration: 120 },
                    { type: 'FULL', platforms: ['MERCARI'], status: 'FAILED', items: 0, error: 'API rate limit' },
                  ].map((sync, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{sync.type}</div><div className="text-sm text-gray-500">{sync.platforms.join(', ')} • {sync.items}件</div></div>
                      <div className="flex items-center gap-3">
                        {sync.duration && <span className="text-sm">{sync.duration}秒</span>}
                        <Badge className={sync.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{sync.status === 'COMPLETED' ? '完了' : '失敗'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>同期パフォーマンス</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ platform: 'AMAZON', avgSyncTime: 45, successRate: 99.2 },{ platform: 'YAHOO_AUCTION', avgSyncTime: 30, successRate: 98.5 },{ platform: 'MERCARI', avgSyncTime: 60, successRate: 97.8 },{ platform: 'RAKUTEN', avgSyncTime: 40, successRate: 99.5 }].map((p) => (
                    <div key={p.platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{getPlatformLabel(p.platform)}</div>
                      <div className="flex gap-4"><span className="text-sm">{p.avgSyncTime}秒</span><span className="text-sm text-green-600">{p.successRate}%</span></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>在庫ヘルス</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-indigo-600">94%</div>
                  <div className="text-gray-500">ヘルススコア</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>完全同期</span><span className="font-medium">2,350商品</span></div>
                  <div className="flex justify-between"><span>一部同期</span><span className="font-medium text-yellow-600">100商品</span></div>
                  <div className="flex justify-between"><span>未同期</span><span className="font-medium text-red-600">50商品</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>自動同期設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動同期</div><div className="text-sm text-gray-500">定期的に自動で同期</div></div><Badge variant={settingsData?.autoSync ? "default" : "secondary"}>{settingsData?.autoSync ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">同期間隔（分）</label><Input type="number" defaultValue={settingsData?.syncInterval} /></div>
                <div><label className="text-sm font-medium">在庫バッファ</label><Input type="number" defaultValue={settingsData?.inventoryBuffer} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>競合解決</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">優先プラットフォーム</label>
                  <Select defaultValue={settingsData?.conflictResolution}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EBAY_PRIORITY">eBay優先</SelectItem>
                      <SelectItem value="LATEST_UPDATE">最新更新優先</SelectItem>
                      <SelectItem value="MANUAL">手動解決</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between"><div><div className="font-medium">エラー通知</div></div><Badge variant={settingsData?.notifyOnError ? "default" : "secondary"}>{settingsData?.notifyOnError ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-indigo-600 hover:bg-indigo-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
