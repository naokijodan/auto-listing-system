// @ts-nocheck
'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck,
  Settings,
  Play,
  Workflow,
  Zap,
  Users,
  Eye,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  MessageSquare
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function OrderWorkflowManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/order-workflow-manager/dashboard/overview`, fetcher);
  const { data: pipeline } = useSWR(`${API_BASE}/ebay/order-workflow-manager/dashboard/pipeline`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/order-workflow-manager/dashboard/alerts`, fetcher);
  const { data: orders } = useSWR(`${API_BASE}/ebay/order-workflow-manager/orders`, fetcher);
  const { data: workflows } = useSWR(`${API_BASE}/ebay/order-workflow-manager/workflows`, fetcher);
  const { data: automationRules } = useSWR(`${API_BASE}/ebay/order-workflow-manager/automation/rules`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/order-workflow-manager/settings/general`, fetcher);

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'new': return <Package className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'packed': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'packed': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-teal-100 text-teal-800';
      case 'delivered': case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-teal-600">Order Workflow Manager</h1>
          <p className="text-gray-500">注文ワークフロー管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            ワークフロー作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="orders">注文</TabsTrigger>
          <TabsTrigger value="workflows">ワークフロー</TabsTrigger>
          <TabsTrigger value="automation">自動化</TabsTrigger>
          <TabsTrigger value="bulk">一括処理</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総注文数</CardTitle>
                <Package className="w-4 h-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalOrders?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">保留中: {overview?.pendingOrders}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">処理中</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.processingOrders}</div>
                <p className="text-xs text-muted-foreground">平均: {overview?.avgProcessingTime}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">発送済み</CardTitle>
                <Truck className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.shippedOrders?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">完了: {overview?.completedOrders?.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">自動化率</CardTitle>
                <Zap className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.automationRate}%</div>
                <Progress value={overview?.automationRate || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>注文パイプライン</CardTitle>
              <CardDescription>各ステージの注文数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {pipeline?.pipeline?.map((stage: any, index: number) => (
                  <React.Fragment key={stage.stage}>
                    <div className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getStageColor(stage.stage)}`}>
                        <span className="text-lg font-bold">{stage.count}</span>
                      </div>
                      <p className="text-sm font-medium mt-2 capitalize">{stage.stage}</p>
                      <p className="text-xs text-gray-500">{stage.avgTime}</p>
                    </div>
                    {index < pipeline.pipeline.length - 1 && (
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>アラート</CardTitle>
              <CardDescription>注意が必要な注文</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts?.alerts?.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className={`w-5 h-5 ${alert.priority === 'high' ? 'text-red-500' : alert.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-gray-500">注文ID: {alert.orderId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={alert.priority === 'high' ? 'destructive' : 'secondary'}>
                        {alert.priority}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>注文一覧</CardTitle>
                  <CardDescription>すべての注文を管理</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="注文検索..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="ステージ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="new">新規</SelectItem>
                      <SelectItem value="processing">処理中</SelectItem>
                      <SelectItem value="shipped">発送済み</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文ID</TableHead>
                    <TableHead>購入者</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>商品数</TableHead>
                    <TableHead>ステージ</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.orders?.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.ebayOrderId}</TableCell>
                      <TableCell>{order.buyer}</TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>{order.items}</TableCell>
                      <TableCell>
                        <Badge className={getStageColor(order.stage)}>
                          {order.stage}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ワークフロー</CardTitle>
                  <CardDescription>注文処理ワークフローの設定</CardDescription>
                </div>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  ワークフロー作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflows?.workflows?.map((workflow: any) => (
                  <div key={workflow.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Workflow className="w-6 h-6 text-teal-600" />
                        <div>
                          <h3 className="font-medium">{workflow.name}</h3>
                          <p className="text-sm text-gray-500">{workflow.stages}ステージ</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{workflow.ordersProcessed}件処理</span>
                        <Switch checked={workflow.active} />
                        <Button variant="outline" size="sm">編集</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>自動化ルール</CardTitle>
                  <CardDescription>注文処理の自動化設定</CardDescription>
                </div>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Zap className="w-4 h-4 mr-2" />
                  ルール追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ルール名</TableHead>
                    <TableHead>トリガー</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automationRules?.rules?.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.trigger}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rule.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={rule.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>一括ステージ進行</CardTitle>
                <CardDescription>複数注文を次のステージへ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="現在のステージ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">新規</SelectItem>
                    <SelectItem value="confirmed">確認済み</SelectItem>
                    <SelectItem value="processing">処理中</SelectItem>
                    <SelectItem value="packed">梱包済み</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full bg-teal-600 hover:bg-teal-700">
                  <Play className="w-4 h-4 mr-2" />
                  次のステージへ進める
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>一括担当者割り当て</CardTitle>
                <CardDescription>注文を担当者に割り当て</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="担当者を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff1">Staff 1</SelectItem>
                    <SelectItem value="staff2">Staff 2</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full bg-teal-600 hover:bg-teal-700">
                  <Users className="w-4 h-4 mr-2" />
                  割り当て実行
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>ワークフローの設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルトワークフロー</p>
                  <p className="text-sm text-gray-500">新規注文に適用</p>
                </div>
                <Select defaultValue={settings?.settings?.defaultWorkflow}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workflow_001">Standard Order</SelectItem>
                    <SelectItem value="workflow_002">Express Order</SelectItem>
                    <SelectItem value="workflow_003">International Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動確認</p>
                  <p className="text-sm text-gray-500">支払い完了で自動確認</p>
                </div>
                <Switch checked={settings?.settings?.autoConfirm} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動ラベル作成</p>
                  <p className="text-sm text-gray-500">梱包完了で自動作成</p>
                </div>
                <Switch checked={settings?.settings?.autoCreateLabel} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">遅延通知</p>
                  <p className="text-sm text-gray-500">処理遅延時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnDelay} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">遅延閾値</p>
                  <p className="text-sm text-gray-500">アラート発生までの時間</p>
                </div>
                <Select defaultValue={String(settings?.settings?.delayThreshold)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12時間</SelectItem>
                    <SelectItem value="24">24時間</SelectItem>
                    <SelectItem value="48">48時間</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">担当者割り当てモード</p>
                  <p className="text-sm text-gray-500">注文の割り当て方法</p>
                </div>
                <Select defaultValue={settings?.settings?.assignmentMode}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">ラウンドロビン</SelectItem>
                    <SelectItem value="manual">手動</SelectItem>
                    <SelectItem value="load_based">負荷ベース</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-teal-600 hover:bg-teal-700">
                <Settings className="w-4 h-4 mr-2" />
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
