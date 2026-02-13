'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import {
  Download,
  Upload,
  RefreshCw,
  Plus,
  FileDown,
  FileUp,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Eye,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface DataExport {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  format: string;
  status: string;
  totalRecords: number | null;
  processedRecords: number;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface DataImport {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  format: string;
  status: string;
  totalRecords: number | null;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  skipCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface ImportTemplate {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
}

interface ExportSchedule {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  format: string;
  schedule: string;
  deliveryMethod: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface Stats {
  exports: {
    total: number;
    pending: number;
    completed: number;
    recent: DataExport[];
  };
  imports: {
    total: number;
    pending: number;
    completed: number;
    recent: DataImport[];
  };
  templates: number;
  schedules: number;
}

const ENTITY_TYPES = [
  { value: 'PRODUCTS', label: '商品' },
  { value: 'ORDERS', label: '注文' },
  { value: 'LISTINGS', label: '出品' },
  { value: 'CUSTOMERS', label: '顧客' },
  { value: 'SHIPMENTS', label: '発送' },
  { value: 'SUPPLIERS', label: 'サプライヤー' },
  { value: 'INVENTORY', label: '在庫' },
];

const EXPORT_FORMATS = [
  { value: 'CSV', label: 'CSV' },
  { value: 'XLSX', label: 'Excel (XLSX)' },
  { value: 'JSON', label: 'JSON' },
  { value: 'XML', label: 'XML' },
  { value: 'PDF', label: 'PDF' },
];

const IMPORT_FORMATS = [
  { value: 'CSV', label: 'CSV' },
  { value: 'XLSX', label: 'Excel (XLSX)' },
  { value: 'JSON', label: 'JSON' },
  { value: 'XML', label: 'XML' },
];

export default function DataTransferPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exports, setExports] = useState<DataExport[]>([]);
  const [imports, setImports] = useState<DataImport[]>([]);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  // エクスポートフォーム
  const [exportForm, setExportForm] = useState({
    name: '',
    description: '',
    entityType: 'PRODUCTS',
    format: 'CSV',
  });

  // インポートフォーム
  const [importForm, setImportForm] = useState({
    name: '',
    description: '',
    entityType: 'PRODUCTS',
    format: 'CSV',
    sourceFileName: '',
  });

  // スケジュールフォーム
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    description: '',
    entityType: 'PRODUCTS',
    format: 'CSV',
    schedule: '0 9 * * *',
    deliveryMethod: 'EMAIL',
    recipients: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, exportsRes, importsRes, templatesRes, schedulesRes] = await Promise.all([
        fetch(`${API_BASE}/data-export-import/stats`),
        fetch(`${API_BASE}/data-export-import/exports?limit=20`),
        fetch(`${API_BASE}/data-export-import/imports?limit=20`),
        fetch(`${API_BASE}/data-export-import/templates`),
        fetch(`${API_BASE}/data-export-import/schedules`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (exportsRes.ok) {
        const data = await exportsRes.json();
        setExports(data.exports || []);
      }
      if (importsRes.ok) {
        const data = await importsRes.json();
        setImports(data.imports || []);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateExport = async () => {
    if (!exportForm.name) {
      toast.error('エクスポート名を入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/data-export-import/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportForm),
      });

      if (res.ok) {
        toast.success('エクスポートを開始しました');
        setIsExportDialogOpen(false);
        setExportForm({ name: '', description: '', entityType: 'PRODUCTS', format: 'CSV' });
        fetchData();
      }
    } catch (error) {
      toast.error('エクスポートに失敗しました');
    }
  };

  const handleCreateImport = async () => {
    if (!importForm.name) {
      toast.error('インポート名を入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/data-export-import/imports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importForm),
      });

      if (res.ok) {
        toast.success('インポートを作成しました');
        setIsImportDialogOpen(false);
        setImportForm({ name: '', description: '', entityType: 'PRODUCTS', format: 'CSV', sourceFileName: '' });
        fetchData();
      }
    } catch (error) {
      toast.error('インポートに失敗しました');
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.name) {
      toast.error('スケジュール名を入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/data-export-import/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleForm,
          recipients: scheduleForm.recipients.split(',').map(r => r.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        toast.success('スケジュールを作成しました');
        setIsScheduleDialogOpen(false);
        setScheduleForm({
          name: '',
          description: '',
          entityType: 'PRODUCTS',
          format: 'CSV',
          schedule: '0 9 * * *',
          deliveryMethod: 'EMAIL',
          recipients: '',
        });
        fetchData();
      }
    } catch (error) {
      toast.error('スケジュール作成に失敗しました');
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const res = await fetch(`${API_BASE}/data-export-import/exports/${exportId}/download`);
      if (res.ok) {
        const data = await res.json();
        toast.success(`ダウンロードURL: ${data.downloadUrl}`);
        // 実際はwindow.open(data.downloadUrl)などでダウンロード
      }
    } catch (error) {
      toast.error('ダウンロードに失敗しました');
    }
  };

  const handleValidateImport = async (importId: string) => {
    try {
      const res = await fetch(`${API_BASE}/data-export-import/imports/${importId}/validate`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('バリデーションを開始しました');
        fetchData();
      }
    } catch (error) {
      toast.error('バリデーションに失敗しました');
    }
  };

  const handleProcessImport = async (importId: string) => {
    try {
      const res = await fetch(`${API_BASE}/data-export-import/imports/${importId}/process`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('インポート処理を開始しました');
        fetchData();
      }
    } catch (error) {
      toast.error('インポートに失敗しました');
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/data-export-import/schedules/${scheduleId}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('スケジュールを更新しました');
        fetchData();
      }
    } catch (error) {
      toast.error('更新に失敗しました');
    }
  };

  const handleRunScheduleNow = async (scheduleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/data-export-import/schedules/${scheduleId}/run-now`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('エクスポートを開始しました');
        fetchData();
      }
    } catch (error) {
      toast.error('実行に失敗しました');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      VALIDATING: { color: 'bg-purple-100 text-purple-800', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      VALIDATED: { color: 'bg-cyan-100 text-cyan-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      PARTIALLY_COMPLETED: { color: 'bg-amber-100 text-amber-800', icon: <AlertTriangle className="h-3 w-3" /> },
      FAILED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const { color, icon } = config[status] || { color: 'bg-gray-100', icon: null };
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {status}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">データ転送</h1>
          <p className="text-muted-foreground">データのエクスポート・インポート管理</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">エクスポート</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.exports.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              処理中: {stats?.exports.pending || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">インポート</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.imports.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              処理中: {stats?.imports.pending || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">テンプレート</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.templates || 0}</div>
            <p className="text-xs text-muted-foreground">
              登録済み
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">スケジュール</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.schedules || 0}</div>
            <p className="text-xs text-muted-foreground">
              有効なスケジュール
            </p>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="exports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exports">エクスポート</TabsTrigger>
          <TabsTrigger value="imports">インポート</TabsTrigger>
          <TabsTrigger value="schedules">スケジュール</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
        </TabsList>

        {/* エクスポート */}
        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>エクスポート一覧</CardTitle>
                  <CardDescription>データエクスポートの履歴</CardDescription>
                </div>
                <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      新規エクスポート
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規エクスポート</DialogTitle>
                      <DialogDescription>エクスポートするデータを選択します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>エクスポート名</Label>
                        <Input
                          value={exportForm.name}
                          onChange={(e) => setExportForm({ ...exportForm, name: e.target.value })}
                          placeholder="例：商品データ_2026年2月"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>データタイプ</Label>
                          <Select
                            value={exportForm.entityType}
                            onValueChange={(v) => setExportForm({ ...exportForm, entityType: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENTITY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>フォーマット</Label>
                          <Select
                            value={exportForm.format}
                            onValueChange={(v) => setExportForm({ ...exportForm, format: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPORT_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>説明（任意）</Label>
                        <Textarea
                          value={exportForm.description}
                          onChange={(e) => setExportForm({ ...exportForm, description: e.target.value })}
                          placeholder="このエクスポートの説明..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateExport}>
                        <Download className="mr-2 h-4 w-4" />
                        エクスポート開始
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>データタイプ</TableHead>
                    <TableHead>フォーマット</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>レコード数</TableHead>
                    <TableHead>サイズ</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{exp.entityType}</Badge>
                      </TableCell>
                      <TableCell>{exp.format}</TableCell>
                      <TableCell>{getStatusBadge(exp.status)}</TableCell>
                      <TableCell>{exp.totalRecords?.toLocaleString() || '-'}</TableCell>
                      <TableCell>{formatFileSize(exp.fileSize)}</TableCell>
                      <TableCell>{new Date(exp.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell>
                        {exp.status === 'COMPLETED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(exp.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {exports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        エクスポートがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* インポート */}
        <TabsContent value="imports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>インポート一覧</CardTitle>
                  <CardDescription>データインポートの履歴</CardDescription>
                </div>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      新規インポート
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規インポート</DialogTitle>
                      <DialogDescription>インポートするデータを設定します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>インポート名</Label>
                        <Input
                          value={importForm.name}
                          onChange={(e) => setImportForm({ ...importForm, name: e.target.value })}
                          placeholder="例：商品データ一括登録"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>データタイプ</Label>
                          <Select
                            value={importForm.entityType}
                            onValueChange={(v) => setImportForm({ ...importForm, entityType: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENTITY_TYPES.slice(0, 7).map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>フォーマット</Label>
                          <Select
                            value={importForm.format}
                            onValueChange={(v) => setImportForm({ ...importForm, format: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {IMPORT_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>ファイル名</Label>
                        <Input
                          value={importForm.sourceFileName}
                          onChange={(e) => setImportForm({ ...importForm, sourceFileName: e.target.value })}
                          placeholder="products.csv"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateImport}>
                        <Upload className="mr-2 h-4 w-4" />
                        インポート作成
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>データタイプ</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>進捗</TableHead>
                    <TableHead>成功/エラー/スキップ</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell className="font-medium">{imp.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{imp.entityType}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(imp.status)}</TableCell>
                      <TableCell>
                        {imp.totalRecords ? (
                          <div className="space-y-1">
                            <Progress value={(imp.processedRecords / imp.totalRecords) * 100} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {imp.processedRecords}/{imp.totalRecords}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{imp.successCount}</span>
                        {' / '}
                        <span className="text-red-600">{imp.errorCount}</span>
                        {' / '}
                        <span className="text-gray-600">{imp.skipCount}</span>
                      </TableCell>
                      <TableCell>{new Date(imp.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {imp.status === 'PENDING' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleValidateImport(imp.id)}
                            >
                              検証
                            </Button>
                          )}
                          {imp.status === 'VALIDATED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcessImport(imp.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {imports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        インポートがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* スケジュール */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>エクスポートスケジュール</CardTitle>
                  <CardDescription>定期エクスポートの設定</CardDescription>
                </div>
                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      スケジュール追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規スケジュール</DialogTitle>
                      <DialogDescription>定期エクスポートを設定します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>スケジュール名</Label>
                        <Input
                          value={scheduleForm.name}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                          placeholder="例：日次商品レポート"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>データタイプ</Label>
                          <Select
                            value={scheduleForm.entityType}
                            onValueChange={(v) => setScheduleForm({ ...scheduleForm, entityType: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENTITY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>フォーマット</Label>
                          <Select
                            value={scheduleForm.format}
                            onValueChange={(v) => setScheduleForm({ ...scheduleForm, format: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPORT_FORMATS.map((format) => (
                                <SelectItem key={format.value} value={format.value}>
                                  {format.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cron式</Label>
                        <Input
                          value={scheduleForm.schedule}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, schedule: e.target.value })}
                          placeholder="0 9 * * *"
                        />
                        <p className="text-xs text-muted-foreground">
                          例: 0 9 * * * (毎日9時)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>配信先メールアドレス</Label>
                        <Input
                          value={scheduleForm.recipients}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                          placeholder="user@example.com, admin@example.com"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateSchedule}>作成</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>データタイプ</TableHead>
                    <TableHead>スケジュール</TableHead>
                    <TableHead>配信方法</TableHead>
                    <TableHead>次回実行</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{schedule.entityType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{schedule.schedule}</TableCell>
                      <TableCell>{schedule.deliveryMethod}</TableCell>
                      <TableCell>
                        {schedule.nextRunAt
                          ? new Date(schedule.nextRunAt).toLocaleString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={() => handleToggleSchedule(schedule.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunScheduleNow(schedule.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        スケジュールがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* テンプレート */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>インポートテンプレート</CardTitle>
              <CardDescription>フィールドマッピングと変換ルールのテンプレート</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>データタイプ</TableHead>
                    <TableHead>使用回数</TableHead>
                    <TableHead>デフォルト</TableHead>
                    <TableHead>作成日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.entityType}</Badge>
                      </TableCell>
                      <TableCell>{template.usageCount}</TableCell>
                      <TableCell>
                        {template.isDefault && (
                          <Badge className="bg-amber-100 text-amber-800">デフォルト</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(template.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        テンプレートがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
