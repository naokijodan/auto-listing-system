'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Users,
  User,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart,
  PieChart,
  Settings,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Star,
  Heart,
  Clock,
  Mail,
  ShoppingCart,
  Eye,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function CustomerInsightsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: Users },
    { id: 'customers', name: '顧客分析', icon: User },
    { id: 'segments', name: 'セグメント', icon: Target },
    { id: 'behavior', name: '行動分析', icon: Activity },
    { id: 'predictions', name: '予測分析', icon: TrendingUp },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-indigo-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Customer Insights</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'segments' && <SegmentsTab />}
        {activeTab === 'behavior' && <BehaviorTab />}
        {activeTab === 'predictions' && <PredictionsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/customer-insights/dashboard/overview`, fetcher);
  const { data: metrics } = useSWR(`${API_BASE}/ebay/customer-insights/dashboard/metrics`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/customer-insights/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">総顧客数</p>
              <p className="text-2xl font-bold">{overview?.totalCustomers?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">アクティブ顧客</p>
              <p className="text-2xl font-bold">{overview?.activeCustomers?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Heart className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">リピート率</p>
              <p className="text-2xl font-bold">{overview?.repeatCustomerRate || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">顧客満足度</p>
              <p className="text-2xl font-bold">{overview?.customerSatisfaction || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">顧客メトリクス</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {metrics?.metrics?.map((metric: any) => (
                <div key={metric.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{metric.name}</p>
                    <p className="text-2xl font-bold">
                      {metric.name.includes('率') || metric.name.includes('NPS')
                        ? metric.value
                        : `¥${metric.value.toLocaleString()}`}
                    </p>
                  </div>
                  <div className={`flex items-center ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-5 w-5 mr-1" />
                    ) : (
                      <TrendingDown className="h-5 w-5 mr-1" />
                    )}
                    <span>{Math.abs(metric.change)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">アラート</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {alerts?.alerts?.map((alert: any) => (
                <div key={alert.id} className={`p-4 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-50' :
                  alert.severity === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'
                }`}>
                  <div className="flex items-start">
                    <AlertCircle className={`h-5 w-5 mt-0.5 mr-3 ${
                      alert.severity === 'high' ? 'text-red-600' :
                      alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-gray-600 mt-1">{alert.action}</p>
                    </div>
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

function CustomersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-insights/customers`, fetcher);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');

  const filteredCustomers = data?.customers?.filter((c: any) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                         c.email.toLowerCase().includes(search.toLowerCase());
    const matchesSegment = segment === 'all' || c.segment === segment;
    return matchesSearch && matchesSegment;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="顧客を検索..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          <option value="all">全セグメント</option>
          {data?.segments?.map((seg: string) => (
            <option key={seg} value={seg}>{seg}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">セグメント</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注文数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">累計購入額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終注文</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCustomers?.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      customer.segment === 'VIP' ? 'bg-purple-100 text-purple-800' :
                      customer.segment === 'Regular' ? 'bg-blue-100 text-blue-800' :
                      customer.segment === 'New' ? 'bg-green-100 text-green-800' :
                      customer.segment === 'At Risk' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {customer.segment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{customer.totalOrders}</td>
                  <td className="px-6 py-4 whitespace-nowrap">¥{customer.totalSpent.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.lastOrder}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.status === 'active' ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SegmentsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-insights/segments`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.segments?.map((segment: any) => (
          <div key={segment.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{segment.name}</h3>
              <span className="text-2xl font-bold text-indigo-600">{segment.customerCount.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{segment.description}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">平均購入額</span>
                <span className="font-medium">¥{segment.avgSpent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">平均注文数</span>
                <span className="font-medium">{segment.avgOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">総売上</span>
                <span className="font-medium">¥{segment.revenue.toLocaleString()}</span>
              </div>
            </div>
            <button className="mt-4 w-full py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50">
              詳細を見る
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BehaviorTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/customer-insights/behavior/overview`, fetcher);
  const { data: journey } = useSWR(`${API_BASE}/ebay/customer-insights/behavior/journey`, fetcher);
  const { data: cohorts } = useSWR(`${API_BASE}/ebay/customer-insights/behavior/cohorts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均セッション</p>
          <p className="text-2xl font-bold">{Math.floor((overview?.overview?.avgSessionDuration || 0) / 60)}分</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">ページ/セッション</p>
          <p className="text-2xl font-bold">{overview?.overview?.avgPagesPerSession || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">直帰率</p>
          <p className="text-2xl font-bold">{overview?.overview?.bounceRate || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">コンバージョン率</p>
          <p className="text-2xl font-bold">{overview?.overview?.conversionRate || 0}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">カート放棄率</p>
          <p className="text-2xl font-bold">{overview?.overview?.cartAbandonmentRate || 0}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">カスタマージャーニー</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            {journey?.journey?.stages?.map((stage: any, index: number) => (
              <React.Fragment key={stage.stage}>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-indigo-600">{stage.customers.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{stage.stage}</p>
                  {stage.conversion && (
                    <p className="text-xs text-gray-500">{stage.conversion}% 転換</p>
                  )}
                </div>
                {index < journey?.journey?.stages?.length - 1 && (
                  <div className="flex-1 h-1 bg-indigo-200 mx-2"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">コホート分析（リテンション率%）</h3>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">コホート</th>
                <th className="px-4 py-2 text-center">月0</th>
                <th className="px-4 py-2 text-center">月1</th>
                <th className="px-4 py-2 text-center">月2</th>
                <th className="px-4 py-2 text-center">月3</th>
                <th className="px-4 py-2 text-center">月4</th>
                <th className="px-4 py-2 text-center">月5</th>
              </tr>
            </thead>
            <tbody>
              {cohorts?.cohorts?.map((cohort: any) => (
                <tr key={cohort.cohort}>
                  <td className="px-4 py-2 font-medium">{cohort.cohort}</td>
                  {[cohort.month0, cohort.month1, cohort.month2, cohort.month3, cohort.month4, cohort.month5].map((val, i) => (
                    <td key={i} className={`px-4 py-2 text-center ${
                      val === null ? 'bg-gray-50' :
                      val >= 50 ? 'bg-green-100' :
                      val >= 30 ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {val !== null ? `${val}%` : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PredictionsTab() {
  const { data: churn } = useSWR(`${API_BASE}/ebay/customer-insights/predictions/churn`, fetcher);
  const { data: ltv } = useSWR(`${API_BASE}/ebay/customer-insights/predictions/ltv`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">離脱リスク予測</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">高リスク</p>
                  <p className="text-2xl font-bold text-red-800">{churn?.predictions?.highRisk?.count || 0}</p>
                </div>
                <UserX className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">中リスク</p>
                  <p className="text-2xl font-bold text-yellow-800">{churn?.predictions?.mediumRisk?.count || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">低リスク</p>
                  <p className="text-2xl font-bold text-green-800">{churn?.predictions?.lowRisk?.count || 0}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <h4 className="font-medium mb-4">高リスク顧客</h4>
          <div className="space-y-4">
            {churn?.topRiskCustomers?.map((customer: any) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{Math.round(customer.riskScore * 100)}%</p>
                  <p className="text-sm text-gray-500">{customer.daysSinceLastOrder}日前</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">LTV予測</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {ltv?.predictions?.map((pred: any) => (
              <div key={pred.segment} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{pred.segment}</span>
                  <span className="text-sm text-gray-500">信頼度: {Math.round(pred.confidence * 100)}%</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">現在のLTV</p>
                    <p className="font-bold">¥{pred.currentLtv.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">予測LTV</p>
                    <p className="font-bold text-green-600">¥{pred.predictedLtv.toLocaleString()}</p>
                  </div>
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
  const { data: general } = useSWR(`${API_BASE}/ebay/customer-insights/settings/general`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/customer-insights/settings/alerts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">データ保持期間（日）</label>
              <input
                type="number"
                defaultValue={general?.settings?.dataRetentionDays}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">タイムゾーン</label>
              <select
                defaultValue={general?.settings?.timezone}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              >
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">トラッキング有効</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={general?.settings?.trackingEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">アラート設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">離脱リスクしきい値</label>
              <input
                type="number"
                step="0.1"
                defaultValue={alerts?.settings?.churnRiskThreshold}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">非アクティブ判定日数</label>
              <input
                type="number"
                defaultValue={alerts?.settings?.inactivityDays}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">VIP基準（円）</label>
              <input
                type="number"
                defaultValue={alerts?.settings?.vipThreshold}
                className="mt-1 block w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="space-y-4">
            {[
              { key: 'notifyOnHighRisk', label: '高リスク顧客を通知' },
              { key: 'notifyOnVipInactive', label: 'VIP非アクティブを通知' },
              { key: 'dailyDigest', label: 'デイリーダイジェストを送信' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={alerts?.settings?.[item.key]}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}
