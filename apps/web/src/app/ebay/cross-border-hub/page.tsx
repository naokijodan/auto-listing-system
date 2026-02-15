'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Globe,
  DollarSign,
  Truck,
  FileText,
  Settings,
  MapPin,
  Flag,
  Languages,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  Package,
  Calculator,
  CreditCard,
  Clock,
  Plane,
  Building,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'markets' | 'shipping' | 'customs' | 'reports' | 'settings';

export default function CrossBorderHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <Globe className="w-4 h-4" /> },
    { id: 'markets', label: 'マーケット', icon: <Flag className="w-4 h-4" /> },
    { id: 'shipping', label: '配送', icon: <Truck className="w-4 h-4" /> },
    { id: 'customs', label: '関税・税金', icon: <Calculator className="w-4 h-4" /> },
    { id: 'reports', label: 'レポート', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">越境取引ハブ</h1>
              <p className="text-sm text-gray-500">Cross-Border Hub</p>
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
                  ? 'border-emerald-600 text-emerald-600'
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
          {activeTab === 'markets' && <MarketsTab />}
          {activeTab === 'shipping' && <ShippingTab />}
          {activeTab === 'customs' && <CustomsTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/cross-border-hub/dashboard/overview`, fetcher);
  const { data: markets } = useSWR(`${API_BASE}/ebay/cross-border-hub/dashboard/markets`, fetcher);
  const { data: compliance } = useSWR(`${API_BASE}/ebay/cross-border-hub/dashboard/compliance-status`, fetcher);
  const { data: currencies } = useSWR(`${API_BASE}/ebay/cross-border-hub/currencies/rates`, fetcher);

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">国際売上</p>
              <p className="text-2xl font-bold">¥{overview?.totalInternationalSales?.toLocaleString()}</p>
            </div>
            <Globe className="w-10 h-10 text-emerald-500 opacity-20" />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            全売上の{overview?.internationalShare}%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">対応国数</p>
              <p className="text-2xl font-bold">{overview?.countriesServed}</p>
            </div>
            <Flag className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {overview?.activeMarketplaces}マーケットプレイス
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均配送時間</p>
              <p className="text-2xl font-bold">{overview?.avgShippingTime}日</p>
            </div>
            <Truck className="w-10 h-10 text-orange-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">コンプライアンススコア</p>
              <p className="text-2xl font-bold">{overview?.complianceScore}/100</p>
            </div>
            <Shield className="w-10 h-10 text-green-500 opacity-20" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${overview?.complianceScore || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 市場概要 & 為替レート */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">市場別売上</h3>
          <div className="space-y-4">
            {markets?.markets?.map((market: {
              market: string;
              sales: number;
              orders: number;
              growth: number;
              share: number;
            }) => (
              <div key={market.market}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{market.market}</span>
                  <span className="text-sm text-gray-500">
                    ¥{market.sales.toLocaleString()} ({market.share}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${market.share}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{market.orders}注文</span>
                  <span className={market.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {market.growth >= 0 ? '+' : ''}{market.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">為替レート</h3>
          <div className="space-y-3">
            {currencies?.rates?.map((rate: { currency: string; rate: number; change: number }) => (
              <div key={rate.currency} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{rate.currency}/JPY</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{(1 / rate.rate).toFixed(2)}</p>
                  <p className={`text-xs ${rate.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {rate.change >= 0 ? '+' : ''}{rate.change}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* コンプライアンス状況 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">コンプライアンス状況</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {compliance?.byCategory?.map((cat: { category: string; status: string; score: number }) => (
            <div key={cat.category} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {cat.status === 'compliant' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-xs font-medium">{cat.category}</span>
              </div>
              <p className="text-lg font-bold">{cat.score}%</p>
            </div>
          ))}
        </div>
        {compliance?.recentIssues?.length > 0 && (
          <div className="space-y-2">
            {compliance.recentIssues.map((issue: { id: string; type: string; message: string; country: string }) => (
              <div
                key={issue.id}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  issue.type === 'warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-blue-50 text-blue-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{issue.message}</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded">{issue.country}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/cross-border-hub/markets`, fetcher);
  const { data: languages } = useSWR(`${API_BASE}/ebay/cross-border-hub/localization/languages`, fetcher);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* マーケット一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">マーケットプレイス</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">マーケット</th>
                <th className="px-4 py-3 text-left text-sm">国</th>
                <th className="px-4 py-3 text-left text-sm">通貨</th>
                <th className="px-4 py-3 text-right text-sm">リスティング</th>
                <th className="px-4 py-3 text-right text-sm">売上</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.markets?.map((market: {
                id: string;
                name: string;
                country: string;
                currency: string;
                status: string;
                listings: number;
                sales: number;
              }) => (
                <tr key={market.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{market.name}</td>
                  <td className="px-4 py-3 text-sm">{market.country}</td>
                  <td className="px-4 py-3 text-sm">{market.currency}</td>
                  <td className="px-4 py-3 text-sm text-right">{market.listings.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">¥{market.sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(market.status)}`}>
                      {market.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {market.status === 'inactive' || market.status === 'pending' ? (
                      <button className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700">
                        有効化
                      </button>
                    ) : (
                      <button className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
                        設定
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 言語対応 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">言語サポート</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {languages?.languages?.map((lang: {
            code: string;
            name: string;
            markets: string[];
            translations: number;
          }) => (
            <div key={lang.code} className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Languages className="w-5 h-5 text-emerald-600" />
                <span className="font-medium">{lang.name}</span>
              </div>
              <p className="text-sm text-gray-500">{lang.markets.join(', ')}</p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${lang.translations}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{lang.translations}% 翻訳済み</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShippingTab() {
  const { data: carriers } = useSWR(`${API_BASE}/ebay/cross-border-hub/shipping/carriers`, fetcher);
  const { data: zones } = useSWR(`${API_BASE}/ebay/cross-border-hub/shipping/zones`, fetcher);
  const [quoteForm, setQuoteForm] = useState({ origin: 'JP', destination: 'US', weight: 1 });

  return (
    <div className="space-y-6">
      {/* 配送見積もり */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">配送見積もり</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">発送元</label>
            <select className="w-full border rounded-lg px-3 py-2">
              <option value="JP">日本</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">配送先</label>
            <select className="w-full border rounded-lg px-3 py-2">
              <option value="US">アメリカ</option>
              <option value="UK">イギリス</option>
              <option value="DE">ドイツ</option>
              <option value="AU">オーストラリア</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">重量 (kg)</label>
            <input type="number" defaultValue={1} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              見積もり取得
            </button>
          </div>
        </div>
      </div>

      {/* キャリア一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">配送キャリア</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carriers?.carriers?.map((carrier: {
            id: string;
            name: string;
            services: string[];
            countries: number;
          }) => (
            <div key={carrier.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Plane className="w-8 h-8 text-emerald-600" />
                <div>
                  <h4 className="font-medium">{carrier.name}</h4>
                  <p className="text-sm text-gray-500">{carrier.countries}カ国対応</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {carrier.services.map((service) => (
                  <span key={service} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 配送ゾーン */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">配送ゾーン</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">ゾーン</th>
                <th className="px-4 py-3 text-left text-sm">地域</th>
                <th className="px-4 py-3 text-left text-sm">対象国</th>
                <th className="px-4 py-3 text-right text-sm">基本料金</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {zones?.zones?.map((zone: {
                zone: number;
                name: string;
                countries: string[];
                baseRate: number;
              }) => (
                <tr key={zone.zone} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">ゾーン {zone.zone}</td>
                  <td className="px-4 py-3 text-sm">{zone.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {zone.countries.length > 0 ? zone.countries.join(', ') : 'その他'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">¥{zone.baseRate.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomsTab() {
  const { data: hsCodes } = useSWR(`${API_BASE}/ebay/cross-border-hub/customs/hs-codes`, fetcher);
  const { data: vatRates } = useSWR(`${API_BASE}/ebay/cross-border-hub/tax/vat-rates`, fetcher);
  const { data: restrictions } = useSWR(`${API_BASE}/ebay/cross-border-hub/customs/restrictions`, fetcher);
  const { data: registrations } = useSWR(`${API_BASE}/ebay/cross-border-hub/tax/registrations`, fetcher);

  return (
    <div className="space-y-6">
      {/* 関税計算 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">関税・税金計算</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">HSコード</label>
            <input type="text" placeholder="例: 8471.30" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">商品価格</label>
            <input type="number" placeholder="10000" className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">配送先国</label>
            <select className="w-full border rounded-lg px-3 py-2">
              <option value="US">アメリカ</option>
              <option value="UK">イギリス</option>
              <option value="DE">ドイツ</option>
              <option value="AU">オーストラリア</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              計算
            </button>
          </div>
        </div>
      </div>

      {/* VAT/GST税率 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">VAT/GST税率</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">国</th>
                <th className="px-4 py-3 text-right text-sm">標準税率</th>
                <th className="px-4 py-3 text-right text-sm">軽減税率</th>
                <th className="px-4 py-3 text-right text-sm">しきい値</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vatRates?.rates?.map((rate: {
                country: string;
                code: string;
                standardRate: number;
                reducedRate: number;
                threshold: number;
              }) => (
                <tr key={rate.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{rate.country}</td>
                  <td className="px-4 py-3 text-sm text-right">{rate.standardRate}%</td>
                  <td className="px-4 py-3 text-sm text-right">{rate.reducedRate}%</td>
                  <td className="px-4 py-3 text-sm text-right">{rate.code === 'UK' ? '£' : rate.code === 'AU' ? 'A$' : '€'}{rate.threshold.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 税務登録状況 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">税務登録</h3>
          <div className="space-y-3">
            {registrations?.registrations?.map((reg: {
              country: string;
              vatNumber: string;
              status: string;
              registeredAt: string | null;
            }) => (
              <div key={reg.country} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{reg.country}</p>
                  <p className="text-sm text-gray-500">{reg.vatNumber}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  reg.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {reg.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">輸出入制限</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2">禁止品目</h4>
              <div className="flex flex-wrap gap-2">
                {restrictions?.prohibited?.map((item: { category: string }) => (
                  <span key={item.category} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    {item.category}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-yellow-700 mb-2">制限品目</h4>
              <div className="space-y-2">
                {restrictions?.restricted?.slice(0, 3).map((item: { category: string; countries: string[]; requirement: string }) => (
                  <div key={item.category} className="p-2 bg-yellow-50 rounded text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-yellow-700 ml-2">({item.countries.join(', ')})</span>
                    <p className="text-xs text-yellow-600">{item.requirement}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: salesReport } = useSWR(`${API_BASE}/ebay/cross-border-hub/reports/international-sales`, fetcher);
  const { data: shippingReport } = useSWR(`${API_BASE}/ebay/cross-border-hub/reports/shipping-performance`, fetcher);

  return (
    <div className="space-y-6">
      {/* 国際売上レポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">国際売上レポート</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">国</th>
                <th className="px-4 py-3 text-right text-sm">売上</th>
                <th className="px-4 py-3 text-right text-sm">注文数</th>
                <th className="px-4 py-3 text-right text-sm">平均注文額</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {salesReport?.byCountry?.map((country: {
                country: string;
                sales: number;
                orders: number;
                avgOrder: number;
              }) => (
                <tr key={country.country} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{country.country}</td>
                  <td className="px-4 py-3 text-sm text-right">¥{country.sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{country.orders.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">¥{country.avgOrder.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 配送パフォーマンス */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">配送パフォーマンス</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">平均配送時間</p>
            <p className="text-2xl font-bold">{shippingReport?.avgDeliveryTime}日</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">定時配送率</p>
            <p className="text-2xl font-bold text-green-800">{shippingReport?.onTimeDelivery}%</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">紛失率</p>
            <p className="text-2xl font-bold text-red-800">{shippingReport?.lostPackages}%</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-700">破損率</p>
            <p className="text-2xl font-bold text-yellow-800">{shippingReport?.damagedPackages}%</p>
          </div>
        </div>

        <h4 className="font-medium mb-3">キャリア別</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">キャリア</th>
                <th className="px-4 py-3 text-right text-sm">平均日数</th>
                <th className="px-4 py-3 text-right text-sm">定時配送率</th>
                <th className="px-4 py-3 text-right text-sm">平均コスト</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shippingReport?.byCarrier?.map((carrier: {
                carrier: string;
                avgTime: number;
                onTime: number;
                cost: number;
              }) => (
                <tr key={carrier.carrier} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{carrier.carrier}</td>
                  <td className="px-4 py-3 text-sm text-right">{carrier.avgTime}日</td>
                  <td className="px-4 py-3 text-sm text-right">{carrier.onTime}%</td>
                  <td className="px-4 py-3 text-sm text-right">¥{carrier.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/cross-border-hub/settings/general`, fetcher);
  const { data: shipping } = useSWR(`${API_BASE}/ebay/cross-border-hub/settings/shipping`, fetcher);
  const { data: excluded } = useSWR(`${API_BASE}/ebay/cross-border-hub/settings/excluded-countries`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">デフォルト通貨</p>
              <p className="text-sm text-gray-500">価格表示のデフォルト通貨</p>
            </div>
            <select defaultValue={general?.defaultCurrency} className="border rounded-lg px-3 py-2">
              <option value="JPY">日本円 (JPY)</option>
              <option value="USD">米ドル (USD)</option>
              <option value="EUR">ユーロ (EUR)</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">自動翻訳</p>
              <p className="text-sm text-gray-500">商品情報を自動的に翻訳</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.autoTranslate} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">関税計算</p>
              <p className="text-sm text-gray-500">関税・税金の自動計算</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.calculateDuties} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">国際返品</p>
              <p className="text-sm text-gray-500">国際配送の返品を受け付ける</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.internationalReturns} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            設定を保存
          </button>
        </div>
      </div>

      {/* 配送設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">配送設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">ハンドリング時間</p>
              <p className="text-sm text-gray-500">出荷までの日数</p>
            </div>
            <select defaultValue={shipping?.handlingTime} className="border rounded-lg px-3 py-2">
              <option value={1}>1日</option>
              <option value={2}>2日</option>
              <option value={3}>3日</option>
              <option value={5}>5日</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">送料無料しきい値</p>
              <p className="text-sm text-gray-500">この金額以上で送料無料</p>
            </div>
            <input
              type="number"
              defaultValue={shipping?.freeShippingThreshold}
              className="border rounded-lg px-3 py-2 w-32 text-right"
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">保険必須</p>
              <p className="text-sm text-gray-500">配送保険を必須にする</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={shipping?.insuranceRequired} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 除外国 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">配送除外国</h3>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            国を追加
          </button>
        </div>
        <div className="space-y-2">
          {excluded?.excluded?.map((country: { code: string; name: string; reason: string }) => (
            <div key={country.code} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium">{country.name} ({country.code})</p>
                <p className="text-sm text-red-600">{country.reason}</p>
              </div>
              <button className="text-red-600 hover:text-red-800">
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
