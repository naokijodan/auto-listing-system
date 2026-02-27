// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ScheduleItem {
  id: string;
  listingId: string;
  productTitle: string;
  productImage?: string;
  listingPrice?: number;
  scheduledAt: string;
  status: string;
  executedAt?: string;
  error?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: '予定', color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: '完了', color: 'bg-green-100 text-green-800' },
  FAILED: { label: '失敗', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'キャンセル', color: 'bg-gray-100 text-gray-800' },
};

export default function EbayScheduledPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState('');

  const [newSchedule, setNewSchedule] = useState({
    listingId: '',
    scheduledDate: '',
    scheduledTime: '10:00',
  });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(`${API_BASE}/ebay-scheduled/dashboard`, fetcher);
  const { data: schedules, mutate: mutateSchedules } = useSWR(
    `${API_BASE}/ebay-scheduled?${statusFilter ? `status=${statusFilter}&` : ''}limit=100`,
    fetcher
  );
  const { data: calendar, mutate: mutateCalendar } = useSWR(
    `${API_BASE}/ebay-scheduled/calendar?year=${calendarYear}&month=${calendarMonth}`,
    fetcher
  );
  const { data: stats } = useSWR(`${API_BASE}/ebay-scheduled/stats`, fetcher);

  // 下書きリスティング一覧（スケジュール作成用）
  const { data: draftListings } = useSWR(`${API_BASE}/ebay-listings/listings?status=DRAFT`, fetcher);

  const handleCreateSchedule = async () => {
    if (!newSchedule.listingId || !newSchedule.scheduledDate) return;

    const scheduledAt = new Date(`${newSchedule.scheduledDate}T${newSchedule.scheduledTime}:00`).toISOString();

    await fetch(`${API_BASE}/ebay-scheduled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: newSchedule.listingId, scheduledAt }),
    });

    setCreateDialogOpen(false);
    setNewSchedule({ listingId: '', scheduledDate: '', scheduledTime: '10:00' });
    mutateDashboard();
    mutateSchedules();
    mutateCalendar();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('このスケジュールをキャンセルしますか？')) return;
    await fetch(`${API_BASE}/ebay-scheduled/${id}/cancel`, { method: 'POST' });
    mutateDashboard();
    mutateSchedules();
    mutateCalendar();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このスケジュールを削除しますか？')) return;
    await fetch(`${API_BASE}/ebay-scheduled/${id}`, { method: 'DELETE' });
    mutateDashboard();
    mutateSchedules();
    mutateCalendar();
  };

  const handleExecuteNow = async (id: string) => {
    if (!confirm('今すぐ出品を実行しますか？')) return;
    await fetch(`${API_BASE}/ebay-scheduled/${id}/execute`, { method: 'POST' });
    alert('出品ジョブをキューに追加しました');
    mutateDashboard();
    mutateSchedules();
  };

  const prevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  // カレンダー生成
  const generateCalendarDays = () => {
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
    const lastDay = new Date(calendarYear, calendarMonth, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: string; day: number; isCurrentMonth: boolean; count: number }> = [];

    // 前月の日
    const prevMonthLastDay = new Date(calendarYear, calendarMonth - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(calendarYear, calendarMonth - 2, day).toISOString().split('T')[0];
      days.push({ date, day, isCurrentMonth: false, count: 0 });
    }

    // 今月の日
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calendarYear, calendarMonth - 1, day).toISOString().split('T')[0];
      const scheduleData = calendar?.schedules?.find((s: any) => s.date === date);
      days.push({ date, day, isCurrentMonth: true, count: scheduleData?.count || 0 });
    }

    // 次月の日（6週分になるように）
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(calendarYear, calendarMonth, day).toISOString().split('T')[0];
      days.push({ date, day, isCurrentMonth: false, count: 0 });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">eBayスケジュール出品</h1>
          <p className="text-muted-foreground">出品を予約して指定日時に自動公開</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          スケジュール作成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="calendar">カレンダー</TabsTrigger>
          <TabsTrigger value="list">一覧</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">予定中</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary?.totalPending || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">今日の予定</CardTitle>
                <Calendar className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboard?.summary?.todayCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">今週の予定</CardTitle>
                <Calendar className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{dashboard?.summary?.weekCount || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 次の予定 */}
          <Card>
            <CardHeader>
              <CardTitle>次の出品予定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.upcomingSchedules?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">予定なし</p>
                )}
                {dashboard?.upcomingSchedules?.map((s: ScheduleItem) => (
                  <div key={s.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    {s.productImage && (
                      <img src={s.productImage} alt="" className="w-12 h-12 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{s.productTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(s.scheduledAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <Badge className={statusConfig[s.status]?.color}>
                      {statusConfig[s.status]?.label}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleExecuteNow(s.id)} title="今すぐ実行">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleCancel(s.id)} title="キャンセル">
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近の完了 */}
          <Card>
            <CardHeader>
              <CardTitle>最近の出品完了</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboard?.recentCompleted?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">完了なし</p>
                )}
                {dashboard?.recentCompleted?.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{s.productTitle}</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(s.executedAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* カレンダー */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle>{calendarYear}年{calendarMonth}月</CardTitle>
                <Button variant="ghost" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                  <div key={day} className="text-center text-sm font-medium py-2">{day}</div>
                ))}
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`p-2 min-h-[80px] border rounded cursor-pointer hover:bg-gray-50 ${
                      !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                    } ${selectedDate === day.date ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm">{day.day}</span>
                      {day.count > 0 && (
                        <Badge variant="secondary" className="text-xs">{day.count}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 選択日の詳細 */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedDate} の予定</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const daySchedules = calendar?.schedules?.find((s: any) => s.date === selectedDate)?.items || [];
                  if (daySchedules.length === 0) {
                    return <p className="text-center text-muted-foreground py-4">予定なし</p>;
                  }
                  return (
                    <div className="space-y-2">
                      {daySchedules.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{s.productTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(s.scheduledAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <Badge className={statusConfig[s.status]?.color}>
                            {statusConfig[s.status]?.label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 一覧 */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="すべてのステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="PENDING">予定</SelectItem>
                <SelectItem value="COMPLETED">完了</SelectItem>
                <SelectItem value="FAILED">失敗</SelectItem>
                <SelectItem value="CANCELLED">キャンセル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {schedules?.schedules?.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  スケジュールなし
                </CardContent>
              </Card>
            )}
            {schedules?.schedules?.map((s: ScheduleItem) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {s.productImage && (
                      <img src={s.productImage} alt="" className="w-16 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{s.productTitle}</p>
                      {s.listingPrice && (
                        <p className="text-sm text-muted-foreground">${s.listingPrice.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{new Date(s.scheduledAt).toLocaleDateString('ja-JP')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(s.scheduledAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge className={statusConfig[s.status]?.color}>
                      {statusConfig[s.status]?.label}
                    </Badge>
                    {s.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleExecuteNow(s.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCancel(s.id)}>
                          <X className="h-4 w-4 text-yellow-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                    {s.status === 'FAILED' && s.error && (
                      <AlertCircle className="h-4 w-4 text-red-500" title={s.error} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* スケジュール作成ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>出品スケジュールを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">出品する商品</label>
              <Select
                value={newSchedule.listingId}
                onValueChange={(v) => setNewSchedule({ ...newSchedule, listingId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="下書きを選択" />
                </SelectTrigger>
                <SelectContent>
                  {draftListings?.listings?.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.product?.titleEn || l.product?.title} - ${l.listingPrice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">出品日</label>
              <Input
                type="date"
                value={newSchedule.scheduledDate}
                onChange={(e) => setNewSchedule({ ...newSchedule, scheduledDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="text-sm font-medium">出品時刻</label>
              <Input
                type="time"
                value={newSchedule.scheduledTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, scheduledTime: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreateSchedule}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
