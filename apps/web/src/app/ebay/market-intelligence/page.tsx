'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Globe,
  BarChart3,
  Settings,
  TrendingUp,
  TrendingDown,
  Search,
  Target,
  Users,
  DollarSign,
  Eye,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Zap,
  Activity,
  PieChart,
  Layers,
  Tag,
  Award,
  Bell,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'market' | 'pricing' | 'keywords' | 'competitors' | 'settings';

export default function MarketIntelligencePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'market', label: '市場分析', icon: <Globe className="w-4 h-4" /> },
    { id: 'pricing', label: '価格分析', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'keywords', label: 'キーワード', icon: <Search className="w-4 h-4" /> },
    { id: 'competitors', label: '競合分析', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">市場インテリジェンス</h1>
              <p className="text-sm text-gray-500">Market Intelligence</p>
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
                  ? 'border-orange-600 text-orange-600'
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
          {activeTab === 'market' && <MarketTab />}
          {activeTab === 'pricing' && <PricingTab />}
          {activeTab === 'keywords' && <KeywordsTab />}
          {activeTab === 'competitors' && <CompetitorsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/market-intelligence/dashboard/overview`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/market-intelligence/dashboard/trends`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/market-intelligence/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* 市場概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">市場規模</p>
          <p className="text-2xl font-bold">¥{(overview?.marketSize / 100000000)?.toFixed(0)}億</p>
          <p className="text-sm text-green-600 mt-1">+{overview?.marketGrowth}% 成長</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">あなたの市場シェア</p>
          <p className="text-2xl font-bold">{(overview?.yourMarketShare * 100)?.toFixed(3)}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総セラー数</p>
          <p className="text-2xl font-bold">{overview?.totalSellers?.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">平均価格</p>
          <p className="text-2xl font-bold">¥{overview?.averagePrice?.toLocaleString()}</p>
        </div>
      </div>

      {/* トレンド */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            上昇トレンド
          </h3>
          <div className="space-y-3">
            {trends?.risingTrends?.map((trend: { keyword: string; growth: number; volume: number }) => (
              <div key={trend.keyword} className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="font-medium">{trend.keyword}</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">+{trend.growth}%</span>
                  <span className="text-xs text-gray-500">{(trend.volume / 1000).toFixed(0)}K</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            下降トレンド
          </h3>
          <div className="space-y-3">
            {trends?.decliningTrends?.map((trend: { keyword: string; decline: number; volume: number }) => (
              <div key={trend.keyword} className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="font-medium">{trend.keyword}</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">-{trend.decline}%</span>
                  <span className="text-xs text-gray-500">{(trend.volume / 1000).toFixed(0)}K</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            新興トレンド
          </h3>
          <div className="space-y-3">
            {trends?.emergingTrends?.map((trend: { keyword: string; emergence: number; volume: number }) => (
              <div key={trend.keyword} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                <span className="font-medium">{trend.keyword}</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">+{trend.emergence}%</span>
                  <span className="text-xs text-gray-500">{(trend.volume / 1000).toFixed(1)}K</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* アラート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">市場アラート</h3>
        <div className="space-y-3">
          {alerts?.alerts?.map((alert: {
            id: string;
            type: string;
            title: string;
            message: string;
            category: string;
            timestamp: string;
          }) => (
            <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg ${
              alert.type === 'opportunity' ? 'bg-green-50' :
              alert.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
            }`}>
              {alert.type === 'opportunity' && <Lightbulb className="w-5 h-5 text-green-600 mt-0.5" />}
              {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />}
              {alert.type === 'info' && <Bell className="w-5 h-5 text-blue-600 mt-0.5" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{alert.title}</p>
                  <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">{alert.category}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-2">{alert.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketTab() {
  const { data: size } = useSWR(`${API_BASE}/ebay/market-intelligence/market/size`, fetcher);
  const { data: demand } = useSWR(`${API_BASE}/ebay/market-intelligence/market/demand`, fetcher);
  const { data: supply } = useSWR(`${API_BASE}/ebay/market-intelligence/market/supply`, fetcher);

  return (
    <div className="space-y-6">
      {/* 市場規模 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">市場規模</h3>
        <p className="text-3xl font-bold mb-6">¥{(size?.totalMarketSize / 100000000)?.toFixed(0)}億</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">カテゴリ別</h4>
            <div className="space-y-3">
              {size?.byCategory?.map((cat: {
                category: string;
                size: number;
                growth: number;
                share: number;
              }) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span>{cat.category}</span>
                      <span className="text-sm text-gray-500">¥{(cat.size / 100000000).toFixed(0)}億</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-orange-500 rounded-full" style={{ width: `${cat.share}%` }}></div>
                    </div>
                  </div>
                  <span className={`text-sm ${cat.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cat.growth > 0 ? '+' : ''}{cat.growth}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">地域別</h4>
            <div className="space-y-3">
              {size?.byRegion?.map((region: {
                region: string;
                size: number;
                growth: number;
                share: number;
              }) => (
                <div key={region.region} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span>{region.region}</span>
                      <span className="text-sm text-gray-500">¥{(region.size / 100000000).toFixed(0)}億</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${region.share}%` }}></div>
                    </div>
                  </div>
                  <span className={`text-sm ${region.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {region.growth > 0 ? '+' : ''}{region.growth}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 需要分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">高需要商品</h3>
          <div className="space-y-3">
            {demand?.highDemand?.map((item: {
              product: string;
              demandScore: number;
              searchVolume: number;
              supplyDemandRatio: number;
            }) => (
              <div key={item.product} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.product}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                    需要スコア: {item.demandScore}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>検索: {(item.searchVolume / 1000).toFixed(0)}K</span>
                  <span>需給比: {item.supplyDemandRatio}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">ニッチ機会</h3>
          <div className="space-y-3">
            {demand?.underservedNiches?.map((niche: {
              niche: string;
              opportunity: number;
              competition: string;
              avgPrice: number;
            }) => (
              <div key={niche.niche} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{niche.niche}</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">
                    機会スコア: {niche.opportunity}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>競合: {niche.competition === 'low' ? '低' : niche.competition === 'medium' ? '中' : '高'}</span>
                  <span>平均価格: ¥{niche.avgPrice.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingTab() {
  const { data: analysis } = useSWR(`${API_BASE}/ebay/market-intelligence/pricing/analysis`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/market-intelligence/pricing/trends`, fetcher);
  const { data: competitive } = useSWR(`${API_BASE}/ebay/market-intelligence/pricing/competitive`, fetcher);

  return (
    <div className="space-y-6">
      {/* 価格分布 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">価格帯分析</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">価格帯</th>
                <th className="px-4 py-3 text-right text-sm">リスティング数</th>
                <th className="px-4 py-3 text-right text-sm">販売率</th>
                <th className="px-4 py-3 text-center text-sm">競合度</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analysis?.priceRanges?.map((range: {
                range: string;
                listings: number;
                avgSellThrough: number;
                competition: string;
              }) => (
                <tr key={range.range} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{range.range}</td>
                  <td className="px-4 py-3 text-right">{range.listings.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{range.avgSellThrough}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      range.competition === 'high' ? 'bg-red-100 text-red-800' :
                      range.competition === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {range.competition === 'high' ? '高' : range.competition === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 価格最適化提案 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">価格最適化提案</h3>
        <div className="space-y-3">
          {analysis?.priceOptimization?.map((opt: {
            product: string;
            currentPrice: number;
            optimalPrice: number;
            expectedSalesIncrease?: number;
            expectedProfitIncrease?: number;
          }) => (
            <div key={opt.product} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{opt.product}</p>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="text-gray-500">現在: ¥{opt.currentPrice.toLocaleString()}</span>
                  <ArrowDown className="w-4 h-4 text-gray-400" />
                  <span className="text-orange-600 font-medium">推奨: ¥{opt.optimalPrice.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                {opt.expectedSalesIncrease && (
                  <p className="text-green-600 font-medium">売上 +{opt.expectedSalesIncrease}%</p>
                )}
                {opt.expectedProfitIncrease && (
                  <p className="text-green-600 font-medium">利益 +{opt.expectedProfitIncrease}%</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 価格トレンド */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">価格トレンド</h3>
          <div className="space-y-3">
            {trends?.trends?.map((trend: {
              category: string;
              direction: string;
              change: number;
              period: string;
            }) => (
              <div key={trend.category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{trend.category}</span>
                <div className="flex items-center gap-2">
                  {trend.direction === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : trend.direction === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  ) : (
                    <Activity className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={
                    trend.direction === 'up' ? 'text-green-600' :
                    trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
                  }>
                    {trend.change > 0 ? '+' : ''}{trend.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">競合価格比較</h3>
          <div className="space-y-3">
            {competitive?.comparisons?.map((comp: {
              product: string;
              yourPrice: number;
              avgCompetitorPrice: number;
              lowestPrice: number;
              highestPrice: number;
            }) => (
              <div key={comp.product} className="p-3 border rounded-lg">
                <p className="font-medium mb-2">{comp.product}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">あなた:</span>
                    <span className="font-medium">¥{comp.yourPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">競合平均:</span>
                    <span>¥{comp.avgCompetitorPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">最安:</span>
                    <span>¥{comp.lowestPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">最高:</span>
                    <span>¥{comp.highestPrice.toLocaleString()}</span>
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

function KeywordsTab() {
  const { data: trending } = useSWR(`${API_BASE}/ebay/market-intelligence/keywords/trending`, fetcher);
  const { data: suggestions } = useSWR(`${API_BASE}/ebay/market-intelligence/keywords/suggestions`, fetcher);
  const { data: gaps } = useSWR(`${API_BASE}/ebay/market-intelligence/keywords/gaps`, fetcher);

  return (
    <div className="space-y-6">
      {/* トレンドキーワード */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">トレンドキーワード</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">キーワード</th>
                <th className="px-4 py-3 text-right text-sm">検索ボリューム</th>
                <th className="px-4 py-3 text-center text-sm">トレンド</th>
                <th className="px-4 py-3 text-right text-sm">成長率</th>
                <th className="px-4 py-3 text-center text-sm">競合度</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trending?.keywords?.map((kw: {
                keyword: string;
                volume: number;
                trend: string;
                growth: number;
                competition: string;
              }) => (
                <tr key={kw.keyword} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                  <td className="px-4 py-3 text-right">{kw.volume.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {kw.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-600 inline" />
                    ) : kw.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-600 inline" />
                    ) : (
                      <Activity className="w-4 h-4 text-gray-400 inline" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={kw.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                      {kw.growth > 0 ? '+' : ''}{kw.growth}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      kw.competition === 'high' ? 'bg-red-100 text-red-800' :
                      kw.competition === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {kw.competition === 'high' ? '高' : kw.competition === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* キーワード提案 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">キーワード提案</h3>
          <div className="space-y-3">
            {suggestions?.suggestions?.map((sug: {
              keyword: string;
              relevance: number;
              volume: number;
              difficulty: string;
              recommendation: string;
            }) => (
              <div key={sug.keyword} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{sug.keyword}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    sug.recommendation === '強く推奨' ? 'bg-green-100 text-green-800' :
                    sug.recommendation === '推奨' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {sug.recommendation}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>関連度: {sug.relevance}%</span>
                  <span>ボリューム: {(sug.volume / 1000).toFixed(0)}K</span>
                  <span>難易度: {sug.difficulty === 'low' ? '低' : sug.difficulty === 'medium' ? '中' : '高'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* キーワードギャップ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">キーワードギャップ</h3>
          <div className="space-y-3">
            {gaps?.gaps?.map((gap: {
              keyword: string;
              competitorUsage: number;
              yourUsage: number;
              opportunity: string;
            }) => (
              <div key={gap.keyword} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{gap.keyword}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    gap.opportunity === 'high' ? 'bg-green-100 text-green-800' :
                    gap.opportunity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    機会: {gap.opportunity === 'high' ? '高' : gap.opportunity === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-500">競合使用率</span>
                    <span>{gap.competitorUsage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-orange-500 rounded-full" style={{ width: `${gap.competitorUsage}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-1 mt-2">
                    <span className="text-gray-500">あなたの使用率</span>
                    <span>{gap.yourUsage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${gap.yourUsage}%` }}></div>
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

function CompetitorsTab() {
  const { data: landscape } = useSWR(`${API_BASE}/ebay/market-intelligence/competitors/landscape`, fetcher);
  const { data: movements } = useSWR(`${API_BASE}/ebay/market-intelligence/competitors/movements`, fetcher);

  return (
    <div className="space-y-6">
      {/* 競合環境 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">総競合数</p>
          <p className="text-2xl font-bold">{landscape?.totalCompetitors?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">直接競合</p>
          <p className="text-2xl font-bold">{landscape?.directCompetitors}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">あなたの順位</p>
          <p className="text-2xl font-bold">#{landscape?.yourPosition?.rank}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">市場シェア</p>
          <p className="text-2xl font-bold">{landscape?.yourPosition?.marketShare}%</p>
        </div>
      </div>

      {/* トップ競合 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">トップ競合</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">セラー</th>
                <th className="px-4 py-3 text-right text-sm">リスティング数</th>
                <th className="px-4 py-3 text-right text-sm">フィードバック</th>
                <th className="px-4 py-3 text-right text-sm">推定売上</th>
                <th className="px-4 py-3 text-right text-sm">シェア</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {landscape?.topCompetitors?.map((comp: {
                id: string;
                name: string;
                listings: number;
                feedbackScore: number;
                estimatedRevenue: number;
                marketShare: number;
              }) => (
                <tr key={comp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{comp.name}</td>
                  <td className="px-4 py-3 text-right">{comp.listings.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{comp.feedbackScore}%</td>
                  <td className="px-4 py-3 text-right">¥{(comp.estimatedRevenue / 1000000).toFixed(0)}M</td>
                  <td className="px-4 py-3 text-right">{comp.marketShare}%</td>
                </tr>
              ))}
              <tr className="bg-orange-50 font-medium">
                <td className="px-4 py-3">🔶 あなた</td>
                <td className="px-4 py-3 text-right">{landscape?.yourPosition?.listings?.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{landscape?.yourPosition?.feedbackScore}%</td>
                <td className="px-4 py-3 text-right">¥{(landscape?.yourPosition?.estimatedRevenue / 1000000)?.toFixed(1)}M</td>
                <td className="px-4 py-3 text-right">{landscape?.yourPosition?.marketShare}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 競合動向 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">競合動向</h3>
        <div className="space-y-3">
          {movements?.movements?.map((move: {
            competitor: string;
            action: string;
            details: string;
            date: string;
          }, index: number) => (
            <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                move.action === 'price_drop' ? 'bg-red-100' :
                move.action === 'new_category' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {move.action === 'price_drop' && <TrendingDown className="w-5 h-5 text-red-600" />}
                {move.action === 'new_category' && <Layers className="w-5 h-5 text-blue-600" />}
                {move.action === 'market_entry' && <Users className="w-5 h-5 text-green-600" />}
              </div>
              <div>
                <p className="font-medium">{move.competitor}</p>
                <p className="text-sm text-gray-500">{move.details}</p>
                <p className="text-xs text-gray-400 mt-1">{move.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/market-intelligence/settings/general`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/market-intelligence/settings/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">トラッキングカテゴリ</p>
              <p className="text-sm text-gray-500">監視するカテゴリ</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {general?.settings?.trackingCategories?.map((cat: string) => (
                <span key={cat} className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">{cat}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">競合トラッキング</p>
              <p className="text-sm text-gray-500">競合の動向を監視</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.competitorTracking} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">更新頻度</p>
            </div>
            <select defaultValue={general?.settings?.refreshFrequency} className="border rounded-lg px-3 py-2">
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>
        </div>
      </div>

      {/* アラート設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">アラート設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">価格下落アラート</p>
              <p className="text-sm text-gray-500">しきい値: {alerts?.settings?.priceDropThreshold}%</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.priceDropAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">新規競合アラート</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.newCompetitorAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">トレンド変化アラート</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.trendChangeAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">機会アラート</p>
              <p className="text-sm text-gray-500">ニッチ機会を通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={alerts?.settings?.opportunityAlert} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}
