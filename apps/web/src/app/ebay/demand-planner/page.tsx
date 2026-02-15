'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  TrendingUp,
  Package,
  Calendar,
  BarChart2,
  Settings,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Target,
  Clock,
  Zap,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Cpu,
  Play,
  Eye,
  Edit,
  Plus,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function DemandPlannerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: TrendingUp },
    { id: 'forecasts', name: '需要予測', icon: BarChart2 },
    { id: 'seasonality', name: '季節分析', icon: Calendar },
    { id: 'optimization', name: '在庫最適化', icon: Package },
    { id: 'models', name: 'モデル設定', icon: Cpu },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-sky-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Demand Planner</h1>
                <p className="text-sm text-gray-500">需要予測・在庫最適化</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                予測更新
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 mt-4">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'forecasts' && <ForecastsTab />}
        {activeTab === 'seasonality' && <SeasonalityTab />}
        {activeTab === 'optimization' && <OptimizationTab />}
        {activeTab === 'models' && <ModelsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/demand-planner/dashboard/overview`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/demand-planner/dashboard/alerts`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/demand-planner/dashboard/trends`, fetcher);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">予測精度</p>
              <p className="text-3xl font-bold text-sky-600">{overview?.forecastAccuracy || 0}%</p>
            </div>
            <Target className="h-12 w-12 text-sky-200" />
          </div>
          <p className="mt-2 text-sm text-green-600">高精度</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">予測需要</p>
              <p className="text-3xl font-bold text-blue-600">{overview?.forecastedDemand?.toLocaleString() || 0}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-blue-200" />
          </div>
          <p className="mt-2 text-sm text-gray-500">30日間</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">在庫切れリスク</p>
              <p className="text-3xl font-bold text-red-600">{overview?.stockoutRisk || 0}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-red-200" />
          </div>
          <p className="mt-2 text-sm text-red-600">要対応</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">過剰在庫リスク</p>
              <p className="text-3xl font-bold text-yellow-600">{overview?.overstockRisk || 0}</p>
            </div>
            <Package className="h-12 w-12 text-yellow-200" />
          </div>
          <p className="mt-2 text-sm text-yellow-600">確認推奨</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">アラート</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts?.alerts?.map((alert: any) => (
              <div key={alert.id} className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                    alert.severity === 'high' ? 'text-red-500' :
                    alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-400">{alert.createdAt}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trends */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">トレンド商品</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {trends?.trending?.map((item: any) => (
              <div key={item.product} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.product}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.trend === 'up' ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Forecast */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">週次予測</h3>
        <div className="grid grid-cols-4 gap-4">
          {trends?.weekly?.map((week: any) => (
            <div key={week.week} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500">{week.week}</p>
              <p className="text-2xl font-bold text-sky-600">{week.demand.toLocaleString()}</p>
              {week.actual !== null && (
                <p className="text-sm text-gray-500">実績: {week.actual.toLocaleString()}</p>
              )}
              {week.accuracy !== null && (
                <p className="text-sm text-green-600">精度: {week.accuracy}%</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForecastsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/demand-planner/forecasts`, fetcher);
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      case 'overstock': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy': return '正常';
      case 'at_risk': return 'リスクあり';
      case 'overstock': return '過剰在庫';
      case 'critical': return '危機的';
      default: return status;
    }
  };

  const filteredForecasts = data?.forecasts?.filter((f: any) =>
    statusFilter === 'all' || f.status === statusFilter
  ) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="all">すべて</option>
                <option value="healthy">正常</option>
                <option value="at_risk">リスクあり</option>
                <option value="overstock">過剰在庫</option>
                <option value="critical">危機的</option>
              </select>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="商品を検索..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-sky-500 focus:border-sky-500"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <p className="text-sm text-gray-500">全 {data?.total?.toLocaleString() || 0} SKU</p>
        </div>
      </div>

      {/* Forecasts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">現在在庫</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">予測需要</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">信頼度</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredForecasts.map((forecast: any) => (
              <tr key={forecast.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-medium text-gray-900">{forecast.productName}</p>
                  <p className="text-xs text-gray-500">{forecast.productId}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <p className="text-sm font-medium text-gray-900">{forecast.currentStock}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <p className="text-sm font-medium text-sky-600">{forecast.forecastedDemand}</p>
                  <p className="text-xs text-gray-500">{forecast.period}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <p className="text-sm font-medium text-gray-900">{forecast.confidence}%</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(forecast.status)}`}>
                    {getStatusLabel(forecast.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button className="text-sky-600 hover:text-sky-900">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <RefreshCw className="h-4 w-4" />
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

function SeasonalityTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/demand-planner/seasonality/overview`, fetcher);
  const { data: calendar } = useSWR(`${API_BASE}/ebay/demand-planner/seasonality/calendar`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/demand-planner/seasonality/products`, fetcher);

  const getSeasonIcon = (month: number) => {
    if ([3, 4, 5].includes(month)) return <Sun className="h-5 w-5 text-yellow-500" />;
    if ([6, 7, 8].includes(month)) return <Cloud className="h-5 w-5 text-blue-500" />;
    if ([9, 10, 11].includes(month)) return <CloudRain className="h-5 w-5 text-orange-500" />;
    return <Snowflake className="h-5 w-5 text-cyan-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-sm text-gray-500">現在のシーズン</p>
              <p className="text-xl font-bold text-gray-900">{overview?.overview?.currentSeason}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">ピーク月</p>
              <p className="text-xl font-bold text-gray-900">{overview?.overview?.peakMonths?.join(', ')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3">
            <BarChart2 className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-sm text-gray-500">季節性スコア</p>
              <p className="text-xl font-bold text-gray-900">{overview?.overview?.seasonalityScore}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">年間カレンダー</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-4">
            {calendar?.months?.map((month: any) => (
              <div key={month.month} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-center mb-2">
                  {getSeasonIcon(month.month)}
                </div>
                <p className="text-xs font-medium text-gray-500">{month.name.slice(0, 3)}</p>
                <p className={`text-lg font-bold ${
                  month.demandIndex >= 120 ? 'text-green-600' :
                  month.demandIndex >= 100 ? 'text-sky-600' :
                  month.demandIndex >= 80 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {month.demandIndex}
                </p>
                {month.events?.length > 0 && (
                  <div className="mt-1">
                    {month.events.slice(0, 1).map((event: string) => (
                      <span key={event} className="inline-block px-1 py-0.5 text-xs bg-sky-100 text-sky-800 rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product Seasonality */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">商品別季節性</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">季節性スコア</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ピーク月</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">パターン</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products?.products?.map((product: any) => (
                <tr key={product.productId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <p className="text-sm font-medium text-sky-600">{product.seasonalityScore}%</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-500">{product.peakMonths.join(', ')}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                      {product.pattern}
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

function OptimizationTab() {
  const { data: recommendations } = useSWR(`${API_BASE}/ebay/demand-planner/optimization/recommendations`, fetcher);
  const { data: safetyStock } = useSWR(`${API_BASE}/ebay/demand-planner/optimization/safety-stock`, fetcher);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">推奨アクション</p>
          <p className="text-3xl font-bold text-sky-600">{recommendations?.summary?.totalRecommendations || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">推定コスト</p>
          <p className="text-3xl font-bold text-gray-900">¥{(recommendations?.summary?.totalEstimatedCost || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">節約可能額</p>
          <p className="text-3xl font-bold text-green-600">¥{(recommendations?.summary?.potentialSavings || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">最適化推奨</h3>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700">
            <Zap className="h-4 w-4 mr-2" />
            一括適用
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {recommendations?.recommendations?.map((rec: any) => (
            <div key={rec.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                    rec.type === 'reorder' ? 'bg-blue-100' : 'bg-yellow-100'
                  }`}>
                    {rec.type === 'reorder' ? (
                      <Package className="h-5 w-5 text-blue-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低'}
                      </span>
                      <h4 className="text-sm font-medium text-gray-900">{rec.productName}</h4>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{rec.reason}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>現在在庫: {rec.currentStock}</span>
                      {rec.type === 'reorder' && (
                        <>
                          <span>|</span>
                          <span>推奨発注: {rec.recommendedOrder}</span>
                          <span>|</span>
                          <span className="text-sky-600">¥{rec.estimatedCost?.toLocaleString()}</span>
                        </>
                      )}
                      {rec.type === 'markdown' && (
                        <>
                          <span>|</span>
                          <span>推奨割引: {rec.recommendedDiscount}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button className="inline-flex items-center px-3 py-1.5 border border-sky-600 text-sm font-medium rounded-md text-sky-600 hover:bg-sky-50">
                  適用
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Stock */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">安全在庫設定</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">現在の安全在庫</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">推奨値</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">リードタイム</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">変動性</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safetyStock?.products?.map((product: any) => (
                <tr key={product.productId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <p className="text-sm text-gray-900">{product.currentSafetyStock}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <p className={`text-sm font-medium ${
                      product.recommendedSafetyStock > product.currentSafetyStock ? 'text-red-600' :
                      product.recommendedSafetyStock < product.currentSafetyStock ? 'text-green-600' :
                      'text-gray-900'
                    }`}>
                      {product.recommendedSafetyStock}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <p className="text-sm text-gray-500">{product.leadTime}日</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.demandVariability === 'high' ? 'bg-red-100 text-red-800' :
                      product.demandVariability === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {product.demandVariability}
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

function ModelsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/demand-planner/models`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">予測モデル</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data?.models?.map((model: any) => (
            <div key={model.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Cpu className={`h-8 w-8 ${
                    model.id === data?.activeModel ? 'text-sky-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{model.name}</h4>
                      {model.name === data?.activeModel && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800">
                          アクティブ
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">タイプ: {model.type} | 精度: {model.accuracy}%</p>
                    <p className="text-xs text-gray-400">最終訓練: {model.lastTrained}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <Play className="h-4 w-4 mr-1" />
                    再訓練
                  </button>
                  {model.name !== data?.activeModel && (
                    <button className="inline-flex items-center px-3 py-1.5 border border-sky-600 text-sm font-medium rounded-md text-sky-600 hover:bg-sky-50">
                      有効化
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">精度レポート</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['7days', '14days', '30days', '60days', '90days'].map((period) => (
            <div key={period} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-500">{period}</p>
              <p className="text-2xl font-bold text-sky-600">
                {period === '7days' ? '96.5' :
                 period === '14days' ? '94.2' :
                 period === '30days' ? '92.0' :
                 period === '60days' ? '88.5' : '85.0'}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/demand-planner/settings/general`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/demand-planner/settings/alerts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">予測期間（日）</label>
            <select
              defaultValue={data?.settings?.forecastHorizon}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="30">30日</option>
              <option value="60">60日</option>
              <option value="90">90日</option>
              <option value="180">180日</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">更新頻度</label>
            <select
              defaultValue={data?.settings?.updateFrequency}
              className="w-48 border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">信頼度しきい値（%）</label>
            <input
              type="number"
              defaultValue={data?.settings?.confidenceThreshold || 85}
              className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">季節性分析</h4>
              <p className="text-sm text-gray-500">季節性を予測に反映</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.seasonalityEnabled} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">自動最適化</h4>
              <p className="text-sm text-gray-500">推奨を自動適用</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={data?.settings?.autoOptimization} className="sr-only peer" readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700">
            設定を保存
          </button>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">アラート設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">在庫切れ警告（日数）</label>
              <input
                type="number"
                defaultValue={alerts?.settings?.stockoutThreshold || 7}
                className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">過剰在庫警告（日数）</label>
              <input
                type="number"
                defaultValue={alerts?.settings?.overstockThreshold || 90}
                className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">需要急増しきい値（%）</label>
              <input
                type="number"
                defaultValue={alerts?.settings?.demandSpikeThreshold || 50}
                className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">精度低下しきい値（%）</label>
              <input
                type="number"
                defaultValue={alerts?.settings?.accuracyDropThreshold || 10}
                className="w-32 border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700">
            アラート設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}
