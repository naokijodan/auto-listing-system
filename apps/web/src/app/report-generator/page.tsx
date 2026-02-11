'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Plus,
  Play,
  Trash2,
  Calendar,
  Clock,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Settings,
} from 'lucide-react';
import {
  useReports,
  useReportStats,
  useReportTypes,
  useReportFormats,
  useReportTemplates,
  useReportSchedules,
} from '@/lib/hooks';
import { reportApi, ReportType, ReportFormat, ReportStatus } from '@/lib/api';

export default function ReportGeneratorPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // 新規レポート作成フォーム
  const [newReport, setNewReport] = useState({
    name: '',
    reportType: 'SALES_SUMMARY' as ReportType,
    format: 'PDF' as ReportFormat,
    timeRange: 'last_30d',
  });

  // 新規スケジュール作成フォーム
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    templateId: '',
    cronExpression: '0 9 * * *',
    format: 'PDF' as ReportFormat,
    recipients: '',
  });

  const { data: reportsData, mutate: mutateReports } = useReports({
    status: statusFilter === 'all' ? undefined : statusFilter,
    reportType: typeFilter === 'all' ? undefined : typeFilter,
    limit: 50,
  });
  const { data: statsData } = useReportStats();
  const { data: typesData } = useReportTypes();
  const { data: formatsData } = useReportFormats();
  const { data: templatesData } = useReportTemplates({ isActive: true });
  const { data: schedulesData, mutate: mutateSchedules } = useReportSchedules();

  const reports = reportsData?.data || [];
  const stats = statsData?.data;
  const types = typesData?.data || [];
  const formats = formatsData?.data || [];
  const templates = templatesData?.data || [];
  const schedules = schedulesData?.data || [];

  const handleCreateReport = async () => {
    try {
      const result = await reportApi.createReport({
        name: newReport.name || `${getTypeLabel(newReport.reportType)} - ${new Date().toLocaleDateString('ja-JP')}`,
        reportType: newReport.reportType,
        format: newReport.format,
        timeRange: newReport.timeRange,
      });

      if (result.success && result.data) {
        // 即時生成をトリガー
        await reportApi.generateReport(result.data.id);
        mutateReports();
        setIsCreateOpen(false);
        setNewReport({
          name: '',
          reportType: 'SALES_SUMMARY',
          format: 'PDF',
          timeRange: 'last_30d',
        });
      }
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const handleGenerateReport = async (reportId: string) => {
    try {
      await reportApi.generateReport(reportId);
      mutateReports();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('このレポートを削除しますか？')) return;
    try {
      await reportApi.deleteReport(reportId);
      mutateReports();
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await reportApi.createSchedule({
        name: newSchedule.name,
        templateId: newSchedule.templateId,
        cronExpression: newSchedule.cronExpression,
        format: newSchedule.format,
        recipients: newSchedule.recipients.split(',').map((r) => r.trim()).filter(Boolean),
      });
      mutateSchedules();
      setIsScheduleOpen(false);
      setNewSchedule({
        name: '',
        templateId: '',
        cronExpression: '0 9 * * *',
        format: 'PDF',
        recipients: '',
      });
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const handleToggleSchedule = async (scheduleId: string, isActive: boolean) => {
    try {
      await reportApi.updateSchedule(scheduleId, { isActive: !isActive });
      mutateSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('このスケジュールを削除しますか？')) return;
    try {
      await reportApi.deleteSchedule(scheduleId);
      mutateSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" />処理中</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />失敗</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />待機中</Badge>;
    }
  };

  const getFormatIcon = (format: ReportFormat) => {
    switch (format) {
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'EXCEL':
        return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
      case 'CSV':
        return <FileText className="w-4 h-4 text-blue-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: ReportType): string => {
    const typeInfo = types.find((t) => t.value === type);
    return typeInfo?.label || type;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  const describeCron = (cron: string): string => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `毎日 ${hour}:${minute.padStart(2, '0')}`;
    }
    if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      const dayNum = parseInt(dayOfWeek, 10);
      return `毎週${days[dayNum] || dayOfWeek}曜日 ${hour}:${minute.padStart(2, '0')}`;
    }
    if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
      return `毎月${dayOfMonth}日 ${hour}:${minute.padStart(2, '0')}`;
    }
    return cron;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">レポート自動生成</h1>
          <p className="text-muted-foreground">PDF/Excelレポートの生成とスケジュール管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutateReports()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新規レポート
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規レポート作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>レポート名（省略可）</Label>
                  <Input
                    value={newReport.name}
                    onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                    placeholder="自動生成されます"
                  />
                </div>
                <div>
                  <Label>レポートタイプ</Label>
                  <Select
                    value={newReport.reportType}
                    onValueChange={(v) => setNewReport({ ...newReport, reportType: v as ReportType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>出力形式</Label>
                  <Select
                    value={newReport.format}
                    onValueChange={(v) => setNewReport({ ...newReport, format: v as ReportFormat })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formats.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label} ({f.extension})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>期間</Label>
                  <Select
                    value={newReport.timeRange}
                    onValueChange={(v) => setNewReport({ ...newReport, timeRange: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_7d">過去7日間</SelectItem>
                      <SelectItem value="last_30d">過去30日間</SelectItem>
                      <SelectItem value="last_90d">過去90日間</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreateReport}>
                  <Play className="w-4 h-4 mr-2" />
                  作成して生成
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総レポート数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReports ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">生成完了</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completedReports ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">失敗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failedReports ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">成功率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate ?? '0%'}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">レポート一覧</TabsTrigger>
          <TabsTrigger value="schedules">スケジュール</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* フィルター */}
          <div className="flex gap-4">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ReportStatus | 'all')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="PENDING">待機中</SelectItem>
                <SelectItem value="PROCESSING">処理中</SelectItem>
                <SelectItem value="COMPLETED">完了</SelectItem>
                <SelectItem value="FAILED">失敗</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as ReportType | 'all')}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="レポートタイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* レポート一覧 */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">レポート名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">タイプ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">形式</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">サイズ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">作成日時</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{report.name}</div>
                          {report.description && (
                            <div className="text-xs text-muted-foreground">{report.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{getTypeLabel(report.reportType)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {getFormatIcon(report.format)}
                            <span className="text-sm">{report.format}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(report.status)}
                            {report.status === 'PROCESSING' && report.progress > 0 && (
                              <span className="text-xs text-muted-foreground">{report.progress}%</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatFileSize(report.fileSize)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(report.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {report.status === 'COMPLETED' && report.filePath && (
                              <a
                                href={reportApi.downloadFile(report.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                            {(report.status === 'PENDING' || report.status === 'FAILED') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateReport(report.id)}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          レポートがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  新規スケジュール
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新規スケジュール作成</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>スケジュール名</Label>
                    <Input
                      value={newSchedule.name}
                      onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                      placeholder="日次売上レポート"
                    />
                  </div>
                  <div>
                    <Label>テンプレート</Label>
                    <Select
                      value={newSchedule.templateId}
                      onValueChange={(v) => setNewSchedule({ ...newSchedule, templateId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="テンプレートを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cron式</Label>
                    <Input
                      value={newSchedule.cronExpression}
                      onChange={(e) => setNewSchedule({ ...newSchedule, cronExpression: e.target.value })}
                      placeholder="0 9 * * *"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      例: 毎日9時 = &quot;0 9 * * *&quot;, 毎週月曜9時 = &quot;0 9 * * 1&quot;
                    </p>
                  </div>
                  <div>
                    <Label>出力形式</Label>
                    <Select
                      value={newSchedule.format}
                      onValueChange={(v) => setNewSchedule({ ...newSchedule, format: v as ReportFormat })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formats.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>配信先メールアドレス（カンマ区切り）</Label>
                    <Input
                      value={newSchedule.recipients}
                      onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                      placeholder="user@example.com, admin@example.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>
                    キャンセル
                  </Button>
                  <Button onClick={handleCreateSchedule} disabled={!newSchedule.name || !newSchedule.templateId}>
                    作成
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* スケジュール一覧 */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">スケジュール名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">実行タイミング</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">形式</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">次回実行</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">最終実行</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">アクション</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {schedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{schedule.name}</div>
                          {schedule.description && (
                            <div className="text-xs text-muted-foreground">{schedule.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{describeCron(schedule.cronExpression)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {getFormatIcon(schedule.format)}
                            <span className="text-sm">{schedule.format}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                            {schedule.isActive ? '有効' : '無効'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(schedule.nextRunAt)}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm">{formatDate(schedule.lastRunAt)}</div>
                          {schedule.lastRunStatus && (
                            <Badge
                              variant="outline"
                              className={
                                schedule.lastRunStatus === 'success'
                                  ? 'text-green-600 border-green-200'
                                  : 'text-red-600 border-red-200'
                              }
                            >
                              {schedule.lastRunStatus}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleSchedule(schedule.id, schedule.isActive)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {schedules.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          スケジュールがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
