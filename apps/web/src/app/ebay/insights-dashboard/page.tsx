'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Lightbulb,
  BarChart3,
  Settings,
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Eye,
  Star,
  RefreshCw,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Bell,
  Zap,
  ChartBar,
  LineChart,
  PieChart,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'insights' | 'trends' | 'predictions' | 'reports' | 'settings';

export default function InsightsDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'insights', label: 'インサイト', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'trends', label: 'トレンド', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'predictions', label: '予測', icon: <Brain className="w-4 h-4" /> },
    { id: 'reports', label: 'レポート', icon: <ChartBar className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-cyan-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">インサイトダッシュボード</h1>
              <p className="text-sm text-gray-500">Insights Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-cyan-600 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'trends' && <TrendsTab />}
          {activeTab === 'predictions' && <PredictionsTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/insights-dashboard/dashboard/overview`, fetcher);
  const { data: kpis } = useSWR(`${API_BASE}/ebay/insights-dashboard/dashboard/kpis`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/insights-dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">アクティブインサイト</p>
              <p className="text-2xl font-bold">{overview?.activeInsights}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
          <p className="text-sm text-cyan-600 mt-2">+{overview?.newInsightsToday} 今日</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">トレンドアラート</p>
              <p className="text-2xl font-bold">{overview?.trendAlerts}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">予測精度</p>
              <p className="text-2xl font-bold">{overview?.predictionAccuracy}%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">推奨事項</p>
              <p className="text-2xl font-bold">{overview?.pendingRecommendations}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* KPI & アラート */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">主要KPI</h3>
          <div className="space-y-4">
            {kpis?.metrics?.map((kpi: {
              name: string;
              value: number;
              unit: string;
              change: number;
              trend: string;
            }) => (
              <div key={kpi.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{kpi.name}</p>
                  <p className="text-2xl font-bold">
                    {kpi.unit === 'yen' ? '¥' : ''}{kpi.value.toLocaleString()}{kpi.unit === 'percent' ? '%' : ''}
                  </p>
                </div>
                <div className={`flex items-center gap-1 ${
                  kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {kpi.trend === 'up' ? <ArrowUp className="w-4 h-4" /> :
                   kpi.trend === 'down' ? <ArrowDown className="w-4 h-4" /> : null}
                  <span className="text-sm font-medium">{Math.abs(kpi.change)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">アラート</h3>
          <div className="space-y-3">
            {alerts?.alerts?.slice(0, 5).map((alert: {
              id: string;
              type: string;
              severity: string;
              title: string;
              message: string;
              timestamp: string;
            }) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                alert.severity === 'critical' ? 'bg-red-50' :
                alert.severity === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
              }`}>
                {alert.severity === 'critical' && <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />}
                {alert.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                {alert.severity === 'info' && <Bell className="w-5 h-5 text-blue-600 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-gray-500">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/insights-dashboard/insights`, fetcher);
  const [filter, setFilter] = useState('all');

  const getImpactBadge = (impact: string) => {
    const styles: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return styles[impact] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">インサイト一覧</h3>
            <div className="flex gap-2">
              {['all', 'sales', 'inventory', 'pricing', 'customer'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === f ? 'bg-cyan-100 text-cyan-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {f === 'all' ? 'すべて' : f === 'sales' ? '売上' : f === 'inventory' ? '在庫' :
                   f === 'pricing' ? '価格' : '顧客'}
                </button>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>
        <div className="divide-y">
          {data?.insights?.map((insight: {
            id: string;
            category: string;
            title: string;
            description: string;
            impact: string;
            status: string;
            actionRequired: boolean;
            createdAt: string;
          }) => (
            <div key={insight.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mt-1">
                    <Lightbulb className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${getImpactBadge(insight.impact)}`}>
                        {insight.impact === 'high' ? '高影響' : insight.impact === 'medium' ? '中影響' : '低影響'}
                      </span>
                      {insight.actionRequired && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                          対応必要
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{insight.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{insight.createdAt}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded"><CheckCircle className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/insights-dashboard/trends`, fetcher);

  return (
    <div className="space-y-6">
      {/* トレンド概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.trendSummary?.map((trend: {
          category: string;
          direction: string;
          percentage: number;
          description: string;
        }) => (
          <div key={trend.category} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{trend.category}</h4>
              <div className={`flex items-center gap-1 ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.direction === 'up' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span className="font-bold">{trend.percentage}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{trend.description}</p>
          </div>
        ))}
      </div>

      {/* トレンド詳細 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">トレンド分析</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">上昇トレンド</h4>
            <div className="space-y-3">
              {data?.risingTrends?.map((trend: {
                id: string;
                name: string;
                growth: number;
                period: string;
              }) => (
                <div key={trend.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span>{trend.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">+{trend.growth}%</span>
                    <span className="text-xs text-gray-500">{trend.period}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">下降トレンド</h4>
            <div className="space-y-3">
              {data?.decliningTrends?.map((trend: {
                id: string;
                name: string;
                decline: number;
                period: string;
              }) => (
                <div key={trend.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span>{trend.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-medium">-{trend.decline}%</span>
                    <span className="text-xs text-gray-500">{trend.period}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PredictionsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/insights-dashboard/predictions`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">AI予測</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">予測精度:</span>
            <span className="font-medium text-green-600">{data?.accuracy}%</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data?.predictions?.map((pred: {
            id: string;
            type: string;
            title: string;
            prediction: string;
            confidence: number;
            timeframe: string;
            impact: string;
          }) => (
            <div key={pred.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">{pred.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium">{pred.confidence}%</span>
                </div>
              </div>
              <h4 className="font-medium mt-3">{pred.title}</h4>
              <p className="text-sm text-gray-500 mt-1">{pred.prediction}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <span className="text-xs text-gray-400">{pred.timeframe}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  pred.impact === 'high' ? 'bg-red-100 text-red-800' :
                  pred.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {pred.impact === 'high' ? '高影響' : pred.impact === 'medium' ? '中影響' : '低影響'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 推奨アクション */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">推奨アクション</h3>
        <div className="space-y-3">
          {data?.recommendations?.map((rec: {
            id: string;
            priority: string;
            action: string;
            reason: string;
            expectedOutcome: string;
          }) => (
            <div key={rec.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                rec.priority === 'high' ? 'bg-red-500' :
                rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <div className="flex-1">
                <p className="font-medium">{rec.action}</p>
                <p className="text-sm text-gray-500 mt-1">{rec.reason}</p>
                <p className="text-sm text-cyan-600 mt-2">期待効果: {rec.expectedOutcome}</p>
              </div>
              <button className="px-3 py-1 bg-cyan-600 text-white rounded text-sm hover:bg-cyan-700">
                実行
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/insights-dashboard/reports`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">レポート</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
            <Plus className="w-4 h-4" />
            レポート作成
          </button>
        </div>
        <div className="divide-y">
          {data?.reports?.map((report: {
            id: string;
            name: string;
            type: string;
            schedule: string;
            lastGenerated: string;
            status: string;
          }) => (
            <div key={report.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  {report.type === 'chart' ? <LineChart className="w-5 h-5 text-cyan-600" /> :
                   report.type === 'table' ? <ChartBar className="w-5 h-5 text-cyan-600" /> :
                   <PieChart className="w-5 h-5 text-cyan-600" />}
                </div>
                <div>
                  <p className="font-medium">{report.name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{report.schedule}</span>
                    <span>•</span>
                    <span>最終生成: {report.lastGenerated}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  report.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {report.status === 'active' ? 'アクティブ' : '停止中'}
                </span>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded"><Download className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* カスタムダッシュボード */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">カスタムダッシュボード</h3>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.customDashboards?.map((dash: {
            id: string;
            name: string;
            widgets: number;
            lastViewed: string;
          }) => (
            <div key={dash.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
              <h4 className="font-medium">{dash.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{dash.widgets} ウィジェット</p>
              <p className="text-xs text-gray-400 mt-2">最終閲覧: {dash.lastViewed}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/insights-dashboard/settings/general`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/insights-dashboard/settings/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">データ更新頻度</p>
              <p className="text-sm text-gray-500">インサイトの自動更新間隔</p>
            </div>
            <select defaultValue={general?.refreshInterval} className="border rounded-lg px-3 py-2">
              <option value={5}>5分</option>
              <option value={15}>15分</option>
              <option value={30}>30分</option>
              <option value={60}>1時間</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">予測期間</p>
              <p className="text-sm text-gray-500">AI予測の対象期間</p>
            </div>
            <select defaultValue={general?.predictionPeriod} className="border rounded-lg px-3 py-2">
              <option value={7}>1週間</option>
              <option value={14}>2週間</option>
              <option value={30}>1ヶ月</option>
              <option value={90}>3ヶ月</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">AIインサイト自動生成</p>
              <p className="text-sm text-gray-500">機械学習によるインサイトの自動生成</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.autoGenerateInsights} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      {/* アラート設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">アラート設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">トレンドアラート</p>
              <p className="text-sm text-gray-500">急激なトレンド変化を通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.trendAlerts} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">予測アラート</p>
              <p className="text-sm text-gray-500">重要な予測結果を通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.predictionAlerts} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">KPIアラート</p>
              <p className="text-sm text-gray-500">KPI閾値超過時に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.kpiAlerts} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">週次サマリー</p>
              <p className="text-sm text-gray-500">週次インサイトサマリーをメール送信</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.weeklySummary} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}
