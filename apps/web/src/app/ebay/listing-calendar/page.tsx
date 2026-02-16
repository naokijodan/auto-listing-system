'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  TrendingUp,
  Zap,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ListingCalendarPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState('2026-02');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: Calendar },
    { id: 'calendar', label: 'カレンダー', icon: Calendar },
    { id: 'schedules', label: 'スケジュール', icon: Clock },
    { id: 'templates', label: 'テンプレート', icon: RefreshCw },
    { id: 'optimal', label: '最適時間', icon: TrendingUp },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Listing Calendar</h1>
                <p className="text-sm text-gray-500">出品スケジュール管理</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                <Plus className="w-4 h-4" />
                新規スケジュール
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-amber-600 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'calendar' && <CalendarTab currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
        {activeTab === 'schedules' && <SchedulesTab />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'optimal' && <OptimalTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/listing-calendar/dashboard/overview`, fetcher);
  const { data: today } = useSWR(`${API_BASE}/ebay/listing-calendar/dashboard/today`, fetcher);
  const { data: upcoming } = useSWR(`${API_BASE}/ebay/listing-calendar/dashboard/upcoming`, fetcher);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今日の出品</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.todayListings || 0}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-2">完了: {overview?.completedToday || 0}件</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今週の予定</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.weekListings || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">承認待ち</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.pendingApproval || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">失敗</p>
              <p className="text-3xl font-bold text-gray-900">{overview?.failedToday || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">今日の予定</h3>
        <div className="space-y-3">
          {today?.listings?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-lg font-medium text-gray-600">{item.scheduledTime}</div>
                <div>
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.marketplace}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.status === 'completed' && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    完了
                  </span>
                )}
                {item.status === 'pending' && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    <Clock className="w-4 h-4" />
                    待機中
                  </span>
                )}
                <button className="p-2 hover:bg-gray-200 rounded-lg">
                  <Play className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">今後の予定</h3>
        <div className="grid grid-cols-4 gap-4">
          {upcoming?.days?.map((day: any) => (
            <div key={day.date} className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">{day.date}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{day.count}</p>
              <p className="text-xs text-gray-500 mt-1">予定件数</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarTab({ currentMonth, setCurrentMonth, selectedDate, setSelectedDate }: any) {
  const { data: month } = useSWR(`${API_BASE}/ebay/listing-calendar/calendar/month?month=${currentMonth}`, fetcher);

  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth('2026-01')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">{currentMonth}</h2>
          <button onClick={() => setCurrentMonth('2026-03')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 5; // Offset for first day of month
            const date = day > 0 && day <= 28 ? `2026-02-${String(day).padStart(2, '0')}` : null;
            const dayData = month?.days?.find((d: any) => d.date === date);

            return (
              <div
                key={i}
                onClick={() => date && setSelectedDate(date)}
                className={`p-2 h-24 rounded-lg border cursor-pointer ${
                  date === selectedDate ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
                } ${!date ? 'bg-gray-50' : ''}`}
              >
                {date && (
                  <>
                    <p className="text-sm font-medium text-gray-900">{day}</p>
                    {dayData && (
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">{dayData.listings}件</span>
                        </div>
                        {dayData.completed > 0 && (
                          <div className="w-full bg-green-200 rounded-full h-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${(dayData.completed / dayData.listings) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-sm text-gray-500">総予定</p>
          <p className="text-2xl font-bold text-gray-900">{month?.summary?.totalScheduled || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-sm text-gray-500">完了</p>
          <p className="text-2xl font-bold text-green-600">{month?.summary?.totalCompleted || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-sm text-gray-500">待機中</p>
          <p className="text-2xl font-bold text-yellow-600">{month?.summary?.totalPending || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-sm text-gray-500">失敗</p>
          <p className="text-2xl font-bold text-red-600">{month?.summary?.totalFailed || 0}</p>
        </div>
      </div>
    </div>
  );
}

function SchedulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/listing-calendar/schedules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Filter className="w-4 h-4" />
            フィルター
          </button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          <Plus className="w-4 h-4" />
          新規スケジュール
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">予定日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">マーケット</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.schedules?.map((schedule: any) => (
              <tr key={schedule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{schedule.title}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{schedule.scheduledAt}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{schedule.marketplace}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    schedule.status === 'completed' ? 'bg-green-100 text-green-700' :
                    schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {schedule.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Play className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <RefreshCw className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/listing-calendar/templates`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">スケジュールテンプレート</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          <Plus className="w-4 h-4" />
          新規テンプレート
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.templates?.map((template: any) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>曜日: {template.schedule.days?.join(', ')}</p>
              <p>時間: {template.schedule.time}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">使用回数: {template.usageCount}回</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OptimalTab() {
  const { data: optimal } = useSWR(`${API_BASE}/ebay/listing-calendar/optimal-times`, fetcher);
  const { data: analysis } = useSWR(`${API_BASE}/ebay/listing-calendar/optimal-times/analysis`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">推奨出品時間</h3>
        <div className="space-y-4">
          {optimal?.recommendations?.map((rec: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{rec.marketplace}</p>
                <p className="text-sm text-gray-500">{rec.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-600">{rec.optimalTime}</p>
                <p className="text-sm text-gray-500">スコア: {rec.score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">時間帯別パフォーマンス</h3>
          <div className="space-y-3">
            {analysis?.hourlyData?.map((hour: any) => (
              <div key={hour.hour} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{hour.hour}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{hour.views}閲覧</span>
                  <span className="text-sm font-medium text-green-600">{hour.conversionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">曜日別パフォーマンス</h3>
          <div className="space-y-3">
            {analysis?.dailyData?.map((day: any) => (
              <div key={day.day} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{day.day}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{day.avgViews}閲覧</span>
                  <span className="text-sm font-medium text-green-600">{day.avgSales}件</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/listing-calendar/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/listing-calendar/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">デフォルトマーケット</p>
              <p className="text-sm text-gray-500">新規スケジュールのデフォルト</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option>{general?.settings?.defaultMarketplace}</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">デフォルト時間</p>
              <p className="text-sm text-gray-500">新規スケジュールの時間</p>
            </div>
            <input type="time" defaultValue={general?.settings?.defaultScheduleTime} className="border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">自動承認</p>
              <p className="text-sm text-gray-500">スケジュールを自動的に承認</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoApprove} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h3>
        <div className="space-y-4">
          {[
            { key: 'onScheduleComplete', label: 'スケジュール完了時', desc: '出品が正常に完了した場合' },
            { key: 'onScheduleFail', label: 'スケジュール失敗時', desc: '出品に失敗した場合' },
            { key: 'onApprovalNeeded', label: '承認待ち', desc: '承認が必要な場合' },
            { key: 'dailyDigest', label: 'デイリーダイジェスト', desc: '毎日の予定をまとめて通知' },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{setting.label}</p>
                <p className="text-sm text-gray-500">{setting.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={(notifications?.settings as any)?.[setting.key]} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
