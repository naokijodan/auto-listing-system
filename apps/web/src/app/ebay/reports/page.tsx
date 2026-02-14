'use client';

/**
 * eBayレポート自動生成ページ
 * Phase 122: 売上・パフォーマンスレポート
 */

import { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  BarChart3,
  Clock,
  Loader2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function EbayReportsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    type: 'SALES_SUMMARY',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    format: 'JSON',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  const { data: dashboard } = useSWR(`${API_BASE}/ebay-reports/dashboard`, fetcher);
  const { data: types } = useSWR(`${API_BASE}/ebay-reports/types`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-reports/stats`, fetcher);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      const data = await res.json();
      setGeneratedReport(data);
      setGenerateDialogOpen(false);
    } catch (error) {
      console.error('Generate report failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/ebay-reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reportForm, format: 'CSV' }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportForm.type}_${reportForm.startDate}_${reportForm.endDate}.csv`;
      a.click();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getReportTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      SALES_SUMMARY: <DollarSign className="h-4 w-4" />,
      LISTING_PERFORMANCE: <TrendingUp className="h-4 w-4" />,
      INVENTORY_STATUS: <Package className="h-4 w-4" />,
      COMPETITOR_ANALYSIS: <BarChart3 className="h-4 w-4" />,
    };
    return icons[type] || <FileText className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            レポート
          </h1>
          <p className="text-muted-foreground">
            売上・パフォーマンスレポートの生成
          </p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />
          レポート生成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="reports">レポート一覧</TabsTrigger>
          <TabsTrigger value="results">生成結果</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総リスティング</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.totalListings || 0}</div>
                <p className="text-xs text-muted-foreground">
                  有効: {dashboard?.stats?.activeListings || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">過去30日売上</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${dashboard?.stats?.salesLast30Days?.revenue?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.stats?.salesLast30Days?.count || 0}件
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均注文額</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${dashboard?.stats?.salesLast30Days?.avgOrderValue?.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総収益</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${dashboard?.stats?.totalRevenue?.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 売上トレンド */}
          {stats?.revenuetrend && (
            <Card>
              <CardHeader>
                <CardTitle>売上トレンド（過去30日）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end gap-1">
                  {stats.revenuetrend.map((day: any, idx: number) => {
                    const maxRevenue = Math.max(...stats.revenuetrend.map((d: any) => d.revenue));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-primary/80 rounded-t"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${day.date}: $${day.revenue.toFixed(2)}`}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* レポートタイプ */}
          <Card>
            <CardHeader>
              <CardTitle>利用可能なレポート</CardTitle>
              <CardDescription>
                クリックしてレポートを生成
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dashboard?.reportTypes?.map((type: any) => (
                  <div
                    key={type.type}
                    className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setReportForm({ ...reportForm, type: type.type });
                      setGenerateDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getReportTypeIcon(type.type)}
                      <h3 className="font-medium">{type.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* レポート一覧 */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>レポートタイプ</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイプ</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>出力形式</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types?.types?.map((type: any) => (
                    <TableRow key={type.type}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getReportTypeIcon(type.type)}
                          <span className="font-medium">{type.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {type.description}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {types.formats?.map((f: any) => (
                            <Badge key={f.value} variant="outline" className="text-xs">
                              {f.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setReportForm({ ...reportForm, type: type.type });
                            setGenerateDialogOpen(true);
                          }}
                        >
                          生成
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 生成結果 */}
        <TabsContent value="results" className="space-y-4">
          {generatedReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{generatedReport.typeName}</CardTitle>
                    <CardDescription>
                      {generatedReport.period?.startDate} - {generatedReport.period?.endDate}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleDownloadCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* サマリー */}
                {generatedReport.data?.summary && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">サマリー</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      {Object.entries(generatedReport.data.summary).map(([key, value]) => (
                        <div key={key} className="p-3 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground">{key}</div>
                          <div className="text-lg font-medium">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 詳細データ */}
                {generatedReport.data?.dailySales && (
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">日別売上</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日付</TableHead>
                          <TableHead>件数</TableHead>
                          <TableHead>売上</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generatedReport.data.dailySales.slice(0, 10).map((day: any) => (
                          <TableRow key={day.date}>
                            <TableCell>{day.date}</TableCell>
                            <TableCell>{day.count}</TableCell>
                            <TableCell>${day.revenue.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>レポートを生成してください</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* レポート生成ダイアログ */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>レポート生成</DialogTitle>
            <DialogDescription>
              レポートの種類と期間を選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>レポートタイプ</Label>
              <Select
                value={reportForm.type}
                onValueChange={value => setReportForm({ ...reportForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types?.types?.map((type: any) => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日</Label>
                <Input
                  type="date"
                  value={reportForm.startDate}
                  onChange={e => setReportForm({ ...reportForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>終了日</Label>
                <Input
                  type="date"
                  value={reportForm.endDate}
                  onChange={e => setReportForm({ ...reportForm, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>出力形式</Label>
              <Select
                value={reportForm.format}
                onValueChange={value => setReportForm({ ...reportForm, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types?.formats?.map((f: any) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
