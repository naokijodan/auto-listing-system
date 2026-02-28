
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  RefreshCw,
  Play,
  Share2,
  Star,
  Trash2,
  Eye,
  LayoutDashboard,
  BarChart3,
  Table as TableIcon,
  PieChart,
  Download,
  Clock,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface CustomReport {
  id: string;
  name: string;
  description?: string;
  type: string;
  dataSource: string;
  chartType?: string;
  visibility: string;
  viewCount: number;
  isFavorite: boolean;
  lastGeneratedAt?: string;
  createdAt: string;
  _count?: { executions: number };
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  viewCount: number;
  embedEnabled: boolean;
  createdAt: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type: string;
  dataSource: string;
  useCount: number;
  isSystem: boolean;
}

interface Stats {
  totalReports: number;
  totalDashboards: number;
  totalTemplates: number;
  totalExecutions: number;
  byType: Record<string, number>;
}

export default function CustomReportsPage() {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'TABLE',
    dataSource: 'ORDERS',
    chartType: '',
    visibility: 'PRIVATE',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, dashboardsRes, templatesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/custom-reports`),
        fetch(`${API_URL}/api/custom-reports/dashboards/list`),
        fetch(`${API_URL}/api/custom-reports/templates/list`),
        fetch(`${API_URL}/api/custom-reports/stats`),
      ]);

      const reportsData = await reportsRes.json();
      const dashboardsData = await dashboardsRes.json();
      const templatesData = await templatesRes.json();
      const statsData = await statsRes.json();

      setReports(reportsData.data || []);
      setDashboards(dashboardsData.data || []);
      setTemplates(templatesData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/custom-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          query: { select: '*' },
          columns: [{ field: 'id', label: 'ID' }],
          createdBy: 'demo-user',
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setFormData({
          name: '',
          description: '',
          type: 'TABLE',
          dataSource: 'ORDERS',
          chartType: '',
          visibility: 'PRIVATE',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const handleExecute = async (id: string) => {
    setExecuting(id);
    try {
      const res = await fetch(`${API_URL}/api/custom-reports/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executedBy: 'demo-user' }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`レポート実行完了: ${data.data?.length || 0}件のデータを取得`);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to execute report:', error);
    } finally {
      setExecuting(null);
    }
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await fetch(`${API_URL}/api/custom-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !current }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このレポートを削除しますか？')) return;

    try {
      await fetch(`${API_URL}/api/custom-reports/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/custom-reports/templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdBy: 'demo-user' }),
      });

      if (res.ok) {
        fetchData();
        alert('テンプレートからレポートを作成しました');
      }
    } catch (error) {
      console.error('Failed to use template:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TABLE':
        return <TableIcon className="h-4 w-4" />;
      case 'CHART':
        return <BarChart3 className="h-4 w-4" />;
      case 'PIVOT':
        return <TableIcon className="h-4 w-4" />;
      case 'DASHBOARD':
        return <LayoutDashboard className="h-4 w-4" />;
      case 'KPI':
        return <PieChart className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    const config: Record<string, { color: string; label: string }> = {
      PRIVATE: { color: 'bg-gray-100 text-gray-800', label: '非公開' },
      TEAM: { color: 'bg-blue-100 text-blue-800', label: 'チーム' },
      ORGANIZATION: { color: 'bg-green-100 text-green-800', label: '組織' },
      PUBLIC: { color: 'bg-purple-100 text-purple-800', label: '公開' },
    };
    const { color, label } = config[visibility] || config.PRIVATE;
    return <Badge className={color}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">カスタムレポート</h1>
          <p className="text-gray-500">レポートの作成・管理・共有</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              レポート作成
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規レポート作成</DialogTitle>
              <DialogDescription>
                カスタムレポートを作成します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>名前</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="レポート名"
                />
              </div>
              <div>
                <Label>説明</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="レポートの説明（任意）"
                />
              </div>
              <div>
                <Label>タイプ</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TABLE">テーブル</SelectItem>
                    <SelectItem value="CHART">チャート</SelectItem>
                    <SelectItem value="PIVOT">ピボット</SelectItem>
                    <SelectItem value="KPI">KPIカード</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>データソース</Label>
                <Select
                  value={formData.dataSource}
                  onValueChange={(value) => setFormData({ ...formData, dataSource: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORDERS">注文データ</SelectItem>
                    <SelectItem value="PRODUCTS">商品データ</SelectItem>
                    <SelectItem value="LISTINGS">出品データ</SelectItem>
                    <SelectItem value="CUSTOMERS">顧客データ</SelectItem>
                    <SelectItem value="SALES">売上データ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>公開範囲</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">非公開</SelectItem>
                    <SelectItem value="TEAM">チーム</SelectItem>
                    <SelectItem value="ORGANIZATION">組織</SelectItem>
                    <SelectItem value="PUBLIC">公開</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">
                作成
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">レポート数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.totalReports}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">ダッシュボード</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.totalDashboards}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">テンプレート</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{stats.totalTemplates}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">実行回数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold">{stats.totalExecutions}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="dashboards">ダッシュボード</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {reports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>レポート</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>データソース</TableHead>
                      <TableHead>公開範囲</TableHead>
                      <TableHead>閲覧数</TableHead>
                      <TableHead>最終実行</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(report.type)}
                            <div>
                              <div className="font-medium">{report.name}</div>
                              {report.description && (
                                <div className="text-sm text-gray-500">
                                  {report.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{report.type}</Badge>
                        </TableCell>
                        <TableCell>{report.dataSource}</TableCell>
                        <TableCell>{getVisibilityBadge(report.visibility)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {report.viewCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.lastGeneratedAt
                            ? new Date(report.lastGeneratedAt).toLocaleDateString('ja-JP')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExecute(report.id)}
                              disabled={executing === report.id}
                            >
                              {executing === report.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFavorite(report.id, report.isFavorite)}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  report.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDelete(report.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  レポートがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                    {getVisibilityBadge(dashboard.visibility)}
                  </div>
                  {dashboard.description && (
                    <CardDescription>{dashboard.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {dashboard.viewCount}
                    </div>
                    {dashboard.embedEnabled && (
                      <Badge variant="secondary">埋め込み有効</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {dashboards.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                ダッシュボードがありません
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(template.type)}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    {template.isSystem && (
                      <Badge variant="secondary">システム</Badge>
                    )}
                  </div>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {template.dataSource} • 使用: {template.useCount}回
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      使用
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                テンプレートがありません
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
