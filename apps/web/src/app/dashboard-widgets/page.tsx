'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDashboardWidgets,
  useWidgetTypes,
  useAllWidgetData,
  useQueryPerformanceSummary,
} from '@/lib/hooks';
import { dashboardWidgetApi } from '@/lib/api';
import {
  LayoutGrid,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  TrendingUp,
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  BarChart3,
  Activity,
  Database,
} from 'lucide-react';

export default function DashboardWidgetsPage() {
  const [activeTab, setActiveTab] = useState('widgets');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  const { data: widgetsData, mutate: mutateWidgets } = useDashboardWidgets();
  const { data: typesData } = useWidgetTypes();
  const { data: widgetDataResponse, mutate: mutateWidgetData } = useAllWidgetData();
  const { data: perfData } = useQueryPerformanceSummary();

  const widgets = widgetsData?.data || [];
  const types = typesData?.data || [];
  const allWidgetData = widgetDataResponse?.data || [];
  const perfStats = perfData?.data;

  const handleAddWidget = useCallback(async () => {
    if (!selectedType) return;

    try {
      await dashboardWidgetApi.createWidget({ type: selectedType });
      mutateWidgets();
      mutateWidgetData();
      setAddDialogOpen(false);
      setSelectedType('');
    } catch (error) {
      console.error('Failed to add widget:', error);
    }
  }, [selectedType, mutateWidgets, mutateWidgetData]);

  const handleDeleteWidget = useCallback(async (id: string) => {
    try {
      await dashboardWidgetApi.deleteWidget(id);
      mutateWidgets();
      mutateWidgetData();
    } catch (error) {
      console.error('Failed to delete widget:', error);
    }
  }, [mutateWidgets, mutateWidgetData]);

  const handleToggleVisibility = useCallback(async (id: string, isVisible: boolean) => {
    try {
      await dashboardWidgetApi.updateWidget(id, { isVisible: !isVisible });
      mutateWidgets();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }, [mutateWidgets]);

  const handleSetupDefaults = useCallback(async () => {
    try {
      await dashboardWidgetApi.setupDefaults();
      mutateWidgets();
      mutateWidgetData();
    } catch (error) {
      console.error('Failed to setup defaults:', error);
    }
  }, [mutateWidgets, mutateWidgetData]);

  const getWidgetIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      SALES_SUMMARY: <TrendingUp className="h-4 w-4" />,
      ORDER_STATUS: <ShoppingCart className="h-4 w-4" />,
      INVENTORY_ALERT: <AlertTriangle className="h-4 w-4" />,
      RECENT_ORDERS: <ShoppingCart className="h-4 w-4" />,
      TOP_PRODUCTS: <Package className="h-4 w-4" />,
      PROFIT_CHART: <BarChart3 className="h-4 w-4" />,
      MARKETPLACE_COMPARISON: <BarChart3 className="h-4 w-4" />,
      SHIPMENT_STATUS: <Truck className="h-4 w-4" />,
      FORECAST_SUMMARY: <TrendingUp className="h-4 w-4" />,
      JOB_QUEUE_STATUS: <Activity className="h-4 w-4" />,
      QUICK_ACTIONS: <LayoutGrid className="h-4 w-4" />,
    };
    return icons[type] || <LayoutGrid className="h-4 w-4" />;
  };

  const renderWidgetContent = (widgetData: typeof allWidgetData[0]) => {
    if (widgetData.error) {
      return <p className="text-sm text-red-500">{widgetData.error}</p>;
    }

    const content = widgetData.content as Record<string, unknown>;
    if (!content) return <p className="text-sm text-zinc-500">データなし</p>;

    switch (widgetData.type) {
      case 'SALES_SUMMARY':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">今日</span>
              <span className="font-semibold">
                ${((content.today as Record<string, number>)?.revenue || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">今週</span>
              <span className="font-semibold">
                ${((content.week as Record<string, number>)?.revenue || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">今月</span>
              <span className="font-semibold">
                ${((content.month as Record<string, number>)?.revenue || 0).toFixed(2)}
              </span>
            </div>
          </div>
        );

      case 'ORDER_STATUS':
        return (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(content).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-zinc-500">{status}</span>
                <Badge variant="outline">{count as number}</Badge>
              </div>
            ))}
          </div>
        );

      case 'SHIPMENT_STATUS':
        return (
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{(content.pending as number) || 0}</p>
              <p className="text-xs text-zinc-500">未発送</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{(content.urgent as number) || 0}</p>
              <p className="text-xs text-zinc-500">緊急</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{(content.shippedToday as number) || 0}</p>
              <p className="text-xs text-zinc-500">本日発送</p>
            </div>
          </div>
        );

      case 'FORECAST_SUMMARY':
        return (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">日平均</span>
              <span className="font-semibold">${(content.dailyAverage as number) || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">30日予測</span>
              <span className="font-semibold">${(content.forecast30d as number) || 0}</span>
            </div>
            <Badge variant={content.trend === 'up' ? 'default' : 'secondary'}>
              {content.trend as string}
            </Badge>
          </div>
        );

      case 'RECENT_ORDERS':
        return (
          <div className="space-y-2">
            {(content as unknown[]).slice(0, 3).map((order: unknown, idx: number) => {
              const o = order as Record<string, unknown>;
              return (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="truncate max-w-[120px]">{o.buyerUsername as string}</span>
                  <span className="font-semibold">${o.total as number}</span>
                </div>
              );
            })}
          </div>
        );

      case 'TOP_PRODUCTS':
        return (
          <div className="space-y-2">
            {(content as unknown[]).slice(0, 3).map((product: unknown, idx: number) => {
              const p = product as Record<string, unknown>;
              return (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="truncate max-w-[120px]">{p.title as string}</span>
                  <Badge variant="outline">{p.quantity as number}個</Badge>
                </div>
              );
            })}
          </div>
        );

      default:
        return <pre className="text-xs">{JSON.stringify(content, null, 2)}</pre>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボードウィジェット</h1>
          <p className="text-sm text-zinc-500">カスタマイズ可能なダッシュボードを管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { mutateWidgets(); mutateWidgetData(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新
          </Button>
          <Button variant="outline" onClick={handleSetupDefaults}>
            <Settings className="mr-2 h-4 w-4" />
            デフォルトに戻す
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                ウィジェット追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ウィジェット追加</DialogTitle>
                <DialogDescription>
                  ダッシュボードに追加するウィジェットを選択してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="ウィジェットタイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.type} value={type.type}>
                        <div className="flex items-center gap-2">
                          {getWidgetIcon(type.type)}
                          <span>{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-sm text-zinc-500">
                    {types.find(t => t.type === selectedType)?.description}
                  </p>
                )}
                <Button onClick={handleAddWidget} disabled={!selectedType} className="w-full">
                  追加
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ウィジェット数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{widgets.length}</p>
            <p className="text-xs text-zinc-500">
              表示中: {widgets.filter(w => w.isVisible).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">利用可能タイプ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{types.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">DBヘルス</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{perfStats?.health?.score || '-'}</p>
            <Badge variant={perfStats?.health?.status === 'excellent' ? 'default' : 'secondary'}>
              {perfStats?.health?.status || 'N/A'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">キャッシュヒット率</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{perfStats?.cacheHitRatio?.heap || '-'}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="widgets">ウィジェット管理</TabsTrigger>
          <TabsTrigger value="preview">プレビュー</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
        </TabsList>

        <TabsContent value="widgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>登録済みウィジェット</CardTitle>
              <CardDescription>
                ドラッグ&ドロップで順序を変更できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {widgets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500">ウィジェットがありません</p>
                  <Button variant="outline" className="mt-4" onClick={handleSetupDefaults}>
                    デフォルトをセットアップ
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-zinc-400 cursor-grab" />
                        {getWidgetIcon(widget.type)}
                        <div>
                          <p className="font-medium">{widget.name}</p>
                          <p className="text-xs text-zinc-500">
                            {widget.gridWidth}x{widget.gridHeight} グリッド
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={widget.isVisible ? 'default' : 'secondary'}>
                          {widget.isVisible ? '表示' : '非表示'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleVisibility(widget.id, widget.isVisible)}
                        >
                          {widget.isVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWidget(widget.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボードプレビュー</CardTitle>
              <CardDescription>
                ウィジェットのリアルタイムデータを表示
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {allWidgetData.map((wd) => (
                  <Card key={wd.id} className="overflow-hidden">
                    <CardHeader className="pb-2 bg-zinc-50 dark:bg-zinc-900">
                      <div className="flex items-center gap-2">
                        {getWidgetIcon(wd.type)}
                        <CardTitle className="text-sm">{wd.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {renderWidgetContent(wd)}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {allWidgetData.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-zinc-500">表示するウィジェットがありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                データベースパフォーマンス
              </CardTitle>
              <CardDescription>
                データベースの健全性とパフォーマンス指標
              </CardDescription>
            </CardHeader>
            <CardContent>
              {perfStats ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <p className="text-sm text-zinc-500">テーブル数</p>
                      <p className="text-2xl font-bold">{perfStats.tables}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <p className="text-sm text-zinc-500">インデックス数</p>
                      <p className="text-2xl font-bold">{perfStats.indexes}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <p className="text-sm text-zinc-500">データベースサイズ</p>
                      <p className="text-2xl font-bold">{perfStats.databaseSize}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <p className="text-sm text-zinc-500 mb-2">キャッシュヒット率</p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>ヒープ</span>
                          <Badge variant={perfStats.cacheHitRatio.heap >= 99 ? 'default' : 'secondary'}>
                            {perfStats.cacheHitRatio.heap}%
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>インデックス</span>
                          <Badge variant={perfStats.cacheHitRatio.index >= 99 ? 'default' : 'secondary'}>
                            {perfStats.cacheHitRatio.index}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                      <p className="text-sm text-zinc-500 mb-2">潜在的な問題</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>未使用インデックス</span>
                          <Badge variant={perfStats.unusedIndexes > 10 ? 'destructive' : 'secondary'}>
                            {perfStats.unusedIndexes}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>高Seqスキャンテーブル</span>
                          <Badge variant={perfStats.highSeqScanTables > 3 ? 'destructive' : 'secondary'}>
                            {perfStats.highSeqScanTables}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {perfStats.health.issues.length > 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                        改善が必要な項目
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-amber-700 dark:text-amber-300">
                        {perfStats.health.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-zinc-500 py-8">読み込み中...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
