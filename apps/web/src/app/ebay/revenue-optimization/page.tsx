'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  TrendingUp,
  DollarSign,
  Target,
  Lightbulb,
  Package,
  Truck,
  Tag,
  BarChart3,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
  Clock,
  Percent,
  ShoppingCart,
  Boxes,
  FileText,
  Download,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'opportunities' | 'pricing' | 'bundles' | 'reports' | 'settings';

export default function RevenueOptimizationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'opportunities', label: '最適化機会', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'pricing', label: '価格最適化', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'bundles', label: 'バンドル', icon: <Package className="w-4 h-4" /> },
    { id: 'reports', label: 'レポート', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">収益最適化</h1>
              <p className="text-sm text-gray-500">Revenue Optimization</p>
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
                  ? 'border-green-600 text-green-600'
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
          {activeTab === 'opportunities' && <OpportunitiesTab />}
          {activeTab === 'pricing' && <PricingTab />}
          {activeTab === 'bundles' && <BundlesTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/revenue-optimization/dashboard/overview`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/revenue-optimization/dashboard/revenue-trends`, fetcher);
  const { data: impact } = useSWR(`${API_BASE}/ebay/revenue-optimization/dashboard/optimization-impact`, fetcher);

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総収益</p>
              <p className="text-2xl font-bold">¥{overview?.totalRevenue?.toLocaleString()}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>{overview?.revenueGrowth}% 成長</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">利益率</p>
              <p className="text-2xl font-bold">{overview?.profitMargin}%</p>
            </div>
            <Percent className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            目標達成率: 95%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">最適化スコア</p>
              <p className="text-2xl font-bold">{overview?.optimizationScore}/100</p>
            </div>
            <Target className="w-10 h-10 text-purple-500 opacity-20" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${overview?.optimizationScore || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">潜在的利益</p>
              <p className="text-2xl font-bold">¥{overview?.potentialGains?.toLocaleString()}</p>
            </div>
            <Lightbulb className="w-10 h-10 text-yellow-500 opacity-20" />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {overview?.pendingOpportunities}件の機会
          </div>
        </div>
      </div>

      {/* 収益トレンド */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">収益トレンド（過去30日）</h3>
        <div className="h-64 flex items-end gap-1">
          {trends?.daily?.slice(-30).map((day: { date: string; revenue: number }, i: number) => (
            <div
              key={i}
              className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-colors"
              style={{ height: `${(day.revenue / 120000) * 100}%` }}
              title={`${day.date}: ¥${Math.floor(day.revenue).toLocaleString()}`}
            />
          ))}
        </div>
      </div>

      {/* 最適化インパクト */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">カテゴリ別インパクト</h3>
          <div className="space-y-4">
            {impact?.byCategory?.map((cat: { category: string; impact: number; optimizations: number }) => (
              <div key={cat.category}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium capitalize">{cat.category}</span>
                  <span className="text-sm text-gray-500">¥{cat.impact.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${(cat.impact / 80000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">アクティブな最適化</h3>
          <div className="text-center py-8">
            <div className="text-5xl font-bold text-green-600">{overview?.activeOptimizations}</div>
            <p className="text-gray-500 mt-2">実行中の最適化</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-xl font-semibold">{overview?.pendingOpportunities}</div>
              <p className="text-xs text-gray-500">保留中</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-xl font-semibold">¥{(overview?.potentialGains / 1000).toFixed(0)}K</div>
              <p className="text-xs text-gray-500">潜在利益</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunitiesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/revenue-optimization/opportunities`, fetcher);
  const [filter, setFilter] = useState('all');

  const filteredOpportunities = data?.opportunities?.filter((opp: { status: string }) =>
    filter === 'all' || opp.status === filter
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      implemented: 'bg-purple-100 text-purple-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      pricing: <DollarSign className="w-5 h-5" />,
      bundling: <Package className="w-5 h-5" />,
      shipping: <Truck className="w-5 h-5" />,
      promotion: <Tag className="w-5 h-5" />,
      inventory: <Boxes className="w-5 h-5" />,
    };
    return icons[type] || <Lightbulb className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          {['all', 'pending', 'reviewing', 'approved', 'implemented'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'すべて' : status}
            </button>
          ))}
        </div>
      </div>

      {/* 機会一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOpportunities?.map((opp: {
          id: string;
          type: string;
          title: string;
          description: string;
          potentialGain: number;
          confidence: number;
          effort: string;
          affectedItems: number;
          status: string;
        }) => (
          <div key={opp.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getTypeIcon(opp.type)}
                </div>
                <div>
                  <h4 className="font-semibold">{opp.title}</h4>
                  <p className="text-sm text-gray-500">{opp.description}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(opp.status)}`}>
                {opp.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">¥{Math.floor(opp.potentialGain).toLocaleString()}</p>
                <p className="text-xs text-gray-500">潜在利益</p>
              </div>
              <div>
                <p className="text-lg font-bold">{opp.confidence.toFixed(0)}%</p>
                <p className="text-xs text-gray-500">信頼度</p>
              </div>
              <div>
                <p className="text-lg font-bold">{opp.affectedItems}</p>
                <p className="text-xs text-gray-500">対象商品</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" />
                適用
              </button>
              <button className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center gap-1">
                <XCircle className="w-4 h-4" />
                却下
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingTab() {
  const { data: analysis } = useSWR(`${API_BASE}/ebay/revenue-optimization/pricing/analysis`, fetcher);
  const { data: recommendations } = useSWR(`${API_BASE}/ebay/revenue-optimization/pricing/recommendations`, fetcher);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      {/* 価格分析サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均マージン</p>
          <p className="text-2xl font-bold">{analysis?.averageMargin}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">価格弾力性（高）</p>
          <p className="text-2xl font-bold">{analysis?.priceElasticity?.elastic}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">価格弾力性（低）</p>
          <p className="text-2xl font-bold">{analysis?.priceElasticity?.inelastic}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">推奨件数</p>
          <p className="text-2xl font-bold">{analysis?.recommendations}</p>
        </div>
      </div>

      {/* マージン分布 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">マージン分布</h3>
        <div className="grid grid-cols-5 gap-4">
          {analysis?.marginDistribution?.map((dist: { range: string; count: number; revenue: number }) => (
            <div key={dist.range} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold">{dist.count}</div>
              <p className="text-sm text-gray-500">{dist.range}</p>
              <p className="text-xs text-gray-400">¥{(dist.revenue / 1000).toFixed(0)}K</p>
            </div>
          ))}
        </div>
      </div>

      {/* 価格推奨一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">価格推奨</h3>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            disabled={selectedItems.length === 0}
          >
            選択した{selectedItems.length}件を適用
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(recommendations?.recommendations?.map((r: { id: string }) => r.id) || []);
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm">SKU</th>
                <th className="px-4 py-3 text-left text-sm">商品名</th>
                <th className="px-4 py-3 text-right text-sm">現在価格</th>
                <th className="px-4 py-3 text-right text-sm">推奨価格</th>
                <th className="px-4 py-3 text-right text-sm">変更率</th>
                <th className="px-4 py-3 text-right text-sm">信頼度</th>
                <th className="px-4 py-3 text-left text-sm">弾力性</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recommendations?.recommendations?.slice(0, 15).map((rec: {
                id: string;
                sku: string;
                title: string;
                currentPrice: number;
                recommendedPrice: number;
                changePercent: number;
                confidence: number;
                elasticity: string;
              }) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(rec.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, rec.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== rec.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">{rec.sku}</td>
                  <td className="px-4 py-3 text-sm">{rec.title}</td>
                  <td className="px-4 py-3 text-sm text-right">¥{rec.currentPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                    ¥{rec.recommendedPrice.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={rec.changePercent > 0 ? 'text-green-600' : 'text-red-600'}>
                      {rec.changePercent > 0 ? '+' : ''}{rec.changePercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{rec.confidence.toFixed(0)}%</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.elasticity === 'high' ? 'bg-red-100 text-red-800' :
                      rec.elasticity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rec.elasticity}
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

function BundlesTab() {
  const { data: suggestions } = useSWR(`${API_BASE}/ebay/revenue-optimization/bundles/suggestions`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/revenue-optimization/bundles/performance`, fetcher);

  return (
    <div className="space-y-6">
      {/* バンドルパフォーマンス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総バンドル数</p>
          <p className="text-2xl font-bold">{performance?.totalBundles}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">アクティブ</p>
          <p className="text-2xl font-bold">{performance?.activeBundles}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総収益</p>
          <p className="text-2xl font-bold">¥{performance?.totalRevenue?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均割引</p>
          <p className="text-2xl font-bold">{performance?.averageDiscount}%</p>
        </div>
      </div>

      {/* バンドル提案 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">バンドル提案</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions?.suggestions?.slice(0, 6).map((sug: {
            id: string;
            items: { sku: string; title: string; price: number }[];
            individualTotal: number;
            bundlePrice: number;
            discount: number;
            potentialGain: number;
            confidence: number;
          }) => (
            <div key={sug.id} className="border rounded-lg p-4">
              <div className="space-y-2 mb-4">
                {sug.items.map((item) => (
                  <div key={item.sku} className="flex justify-between text-sm">
                    <span>{item.title}</span>
                    <span>¥{item.price}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">個別合計</span>
                  <span className="line-through text-gray-400">¥{sug.individualTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">バンドル価格</span>
                  <span className="font-bold text-green-600">¥{sug.bundlePrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">割引率</span>
                  <span className="text-green-600">{sug.discount.toFixed(1)}% OFF</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">潜在利益</p>
                  <p className="font-semibold text-green-600">¥{Math.floor(sug.potentialGain).toLocaleString()}</p>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  作成
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 既存バンドル */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">既存バンドル</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">バンドル名</th>
                <th className="px-4 py-3 text-right text-sm">販売数</th>
                <th className="px-4 py-3 text-right text-sm">収益</th>
                <th className="px-4 py-3 text-right text-sm">マージン</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {performance?.bundles?.map((bundle: {
                id: string;
                name: string;
                sales: number;
                revenue: number;
                margin: number;
                status: string;
              }) => (
                <tr key={bundle.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{bundle.name}</td>
                  <td className="px-4 py-3 text-sm text-right">{bundle.sales}</td>
                  <td className="px-4 py-3 text-sm text-right">¥{Math.floor(bundle.revenue).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{bundle.margin.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      bundle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {bundle.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      {bundle.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
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

function ReportsTab() {
  const { data: revenueReport } = useSWR(`${API_BASE}/ebay/revenue-optimization/reports/revenue`, fetcher);
  const { data: optimizationReport } = useSWR(`${API_BASE}/ebay/revenue-optimization/reports/optimization`, fetcher);

  return (
    <div className="space-y-6">
      {/* 収益レポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">収益レポート</h3>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            エクスポート
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">総収益</p>
            <p className="text-xl font-bold">¥{revenueReport?.totalRevenue?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">総利益</p>
            <p className="text-xl font-bold">¥{revenueReport?.totalProfit?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">注文数</p>
            <p className="text-xl font-bold">{revenueReport?.totalOrders?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">平均注文額</p>
            <p className="text-xl font-bold">¥{revenueReport?.averageOrderValue?.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">チャネル別</h4>
            <div className="space-y-3">
              {revenueReport?.byChannel?.map((ch: { channel: string; revenue: number; profit: number; orders: number }) => (
                <div key={ch.channel} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span>{ch.channel}</span>
                  <div className="text-right">
                    <p className="font-semibold">¥{ch.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{ch.orders}注文</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">カテゴリ別</h4>
            <div className="space-y-3">
              {revenueReport?.byCategory?.map((cat: { category: string; revenue: number; profit: number }) => (
                <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span>{cat.category}</span>
                  <div className="text-right">
                    <p className="font-semibold">¥{cat.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">利益: ¥{cat.profit.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 最適化レポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">最適化レポート</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">総最適化数</p>
            <p className="text-2xl font-bold text-green-800">{optimizationReport?.totalOptimizations}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">実施済み</p>
            <p className="text-2xl font-bold text-blue-800">{optimizationReport?.implementedCount}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">総インパクト</p>
            <p className="text-2xl font-bold text-purple-800">¥{optimizationReport?.totalImpact?.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {optimizationReport?.byType?.map((type: { type: string; count: number; impact: number }) => (
            <div key={type.type} className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500 capitalize">{type.type}</p>
              <p className="text-xl font-bold">{type.count}</p>
              <p className="text-sm text-green-600">¥{type.impact.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: settings } = useSWR(`${API_BASE}/ebay/revenue-optimization/settings/general`, fetcher);
  const { data: rules } = useSWR(`${API_BASE}/ebay/revenue-optimization/settings/rules`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">自動最適化</p>
              <p className="text-sm text-gray-500">自動的に最適化を実行</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.autoOptimization} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">最適化頻度</p>
              <p className="text-sm text-gray-500">最適化の実行間隔</p>
            </div>
            <select defaultValue={settings?.optimizationFrequency} className="border rounded-lg px-3 py-2">
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">最小信頼度しきい値</p>
              <p className="text-sm text-gray-500">この値以上の機会のみ表示</p>
            </div>
            <input
              type="number"
              defaultValue={settings?.minConfidenceThreshold}
              className="border rounded-lg px-3 py-2 w-24 text-right"
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">最大価格変更率</p>
              <p className="text-sm text-gray-500">自動適用の上限</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings?.maxPriceChangePercent}
                className="border rounded-lg px-3 py-2 w-24 text-right"
              />
              <span>%</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">機会通知</p>
              <p className="text-sm text-gray-500">新しい機会が見つかったら通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.notifyOnOpportunity} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">低リスク自動適用</p>
              <p className="text-sm text-gray-500">低リスクの最適化を自動で適用</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.autoApplyLowRisk} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            設定を保存
          </button>
        </div>
      </div>

      {/* 最適化ルール */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">最適化ルール</h3>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            ルール追加
          </button>
        </div>

        <div className="space-y-4">
          {rules?.rules?.map((rule: {
            id: string;
            name: string;
            type: string;
            enabled: boolean;
          }) => (
            <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={rule.enabled} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-gray-500">タイプ: {rule.type}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded text-red-600">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
