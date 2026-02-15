'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Truck,
  Calculator,
  MapPin,
  Package,
  RefreshCw,
  Settings,
  DollarSign,
  Clock,
  CheckCircle,
  Globe,
  Box,
  FileText,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  Zap,
} from 'lucide-react';

type TabType = 'dashboard' | 'calculator' | 'carriers' | 'zones' | 'rules' | 'settings';

export default function ShippingCalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: Truck },
    { id: 'calculator' as const, label: '計算', icon: Calculator },
    { id: 'carriers' as const, label: 'キャリア', icon: Truck },
    { id: 'zones' as const, label: 'ゾーン', icon: MapPin },
    { id: 'rules' as const, label: 'ルール', icon: FileText },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">送料計算機</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">送料計算・キャリア・ゾーン管理</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'calculator' && <CalculatorTab />}
        {activeTab === 'carriers' && <CarriersTab />}
        {activeTab === 'zones' && <ZonesTab />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data, isLoading } = useSWR('/api/ebay-shipping-calculator/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500" /></div>;
  }

  const dashboard = data || {
    overview: { totalCalculations: 0, avgShippingCost: 0, carriersActive: 0, zonesConfigured: 0 },
    carrierUsage: [],
    costTrends: [],
    topDestinations: [],
    alerts: [],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
              <Calculator className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総計算回数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.totalCalculations.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">平均送料</p>
              <p className="text-xl font-bold text-green-600">${dashboard.overview.avgShippingCost.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">有効キャリア</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.carriersActive}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">ゾーン数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.zonesConfigured}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">キャリア利用状況</h3>
          <div className="space-y-3">
            {dashboard.carrierUsage.map((carrier: { carrier: string; usage: number; avgCost: number }) => (
              <div key={carrier.carrier} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{carrier.carrier}</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">{carrier.usage}% (${carrier.avgCost})</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${carrier.usage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">人気の配送先</h3>
          <div className="space-y-3">
            {dashboard.topDestinations.map((dest: { country: string; state: string | null; shipments: number; avgCost: number }, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {dest.country}{dest.state ? `, ${dest.state}` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-900 dark:text-white">{dest.shipments.toLocaleString()}件</p>
                  <p className="text-xs text-zinc-500">平均${dest.avgCost}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">送料トレンド (7日間)</h3>
        <div className="h-48 flex items-end gap-2">
          {dashboard.costTrends.map((trend: { date: string; avgCost: number; calculations: number }, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-cyan-500 rounded-t"
                style={{ height: `${(trend.avgCost / 15) * 100}px` }}
                title={`$${trend.avgCost} (${trend.calculations}件)`}
              />
              <span className="text-xs text-zinc-500">{trend.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CalculatorTab() {
  const [origin, setOrigin] = useState({ postalCode: '90210', country: 'US' });
  const [destination, setDestination] = useState({ postalCode: '', country: 'US' });
  const [packageInfo, setPackageInfo] = useState({ weight: 16, length: 10, width: 8, height: 6 });
  const [rates, setRates] = useState<{ carrier: string; service: string; rate: number; estimatedDays: { min: number; max: number } }[] | null>(null);

  const handleCalculate = async () => {
    const mockRates = [
      { carrier: 'USPS', service: 'Priority Mail', rate: 8.95, estimatedDays: { min: 2, max: 3 } },
      { carrier: 'USPS', service: 'Priority Mail Express', rate: 26.95, estimatedDays: { min: 1, max: 2 } },
      { carrier: 'FedEx', service: 'Ground', rate: 12.45, estimatedDays: { min: 3, max: 5 } },
      { carrier: 'UPS', service: 'Ground', rate: 11.95, estimatedDays: { min: 3, max: 5 } },
    ];
    setRates(mockRates);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">発送元</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">郵便番号</label>
              <input
                type="text"
                value={origin.postalCode}
                onChange={(e) => setOrigin({ ...origin, postalCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">国</label>
              <select
                value={origin.country}
                onChange={(e) => setOrigin({ ...origin, country: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <option value="US">United States</option>
                <option value="JP">Japan</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">配送先</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">郵便番号</label>
              <input
                type="text"
                value={destination.postalCode}
                onChange={(e) => setDestination({ ...destination, postalCode: e.target.value })}
                placeholder="10001"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">国</label>
              <select
                value={destination.country}
                onChange={(e) => setDestination({ ...destination, country: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="JP">Japan</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">パッケージ情報</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">重量 (oz)</label>
              <input
                type="number"
                value={packageInfo.weight}
                onChange={(e) => setPackageInfo({ ...packageInfo, weight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">長さ (in)</label>
                <input
                  type="number"
                  value={packageInfo.length}
                  onChange={(e) => setPackageInfo({ ...packageInfo, length: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">幅 (in)</label>
                <input
                  type="number"
                  value={packageInfo.width}
                  onChange={(e) => setPackageInfo({ ...packageInfo, width: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">高さ (in)</label>
                <input
                  type="number"
                  value={packageInfo.height}
                  onChange={(e) => setPackageInfo({ ...packageInfo, height: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              </div>
            </div>
          </div>
        </Card>

        <Button variant="primary" className="w-full" onClick={handleCalculate}>
          <Calculator className="h-4 w-4 mr-2" />
          送料を計算
        </Button>
      </div>

      <div>
        <Card className="p-4 h-full">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">計算結果</h3>
          {rates ? (
            <div className="space-y-3">
              {rates.map((rate, i) => (
                <div
                  key={i}
                  className={`p-4 border rounded-lg ${i === 0 ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-white">{rate.carrier}</p>
                        <p className="text-sm text-zinc-500">{rate.service}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-cyan-600">${rate.rate.toFixed(2)}</p>
                      {i === 0 && <span className="text-xs text-cyan-600">最安値</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {rate.estimatedDays.min}-{rate.estimatedDays.max}日
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      追跡あり
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
              <Calculator className="h-12 w-12 mb-4" />
              <p>配送情報を入力して計算してください</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function CarriersTab() {
  const { data, isLoading } = useSWR('/api/ebay-shipping-calculator/carriers', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500" /></div>;
  }

  const carriers = data?.carriers || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {carriers.map((carrier: {
          id: string;
          name: string;
          displayName: string;
          enabled: boolean;
          apiConnected: boolean;
          services: { code: string; name: string; enabled: boolean }[];
          lastSync: string;
        }) => (
          <Card key={carrier.id} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">{carrier.displayName}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${carrier.apiConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-xs text-zinc-500">{carrier.apiConnected ? '接続済み' : '未接続'}</span>
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={carrier.enabled} className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">サービス:</p>
              <div className="flex flex-wrap gap-2">
                {carrier.services.map((service) => (
                  <span
                    key={service.code}
                    className={`px-2 py-1 rounded text-xs ${
                      service.enabled
                        ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                    }`}
                  >
                    {service.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500">最終同期: {new Date(carrier.lastSync).toLocaleString('ja-JP')}</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm"><RefreshCw className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm"><Settings className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ZonesTab() {
  const { data, isLoading } = useSWR('/api/ebay-shipping-calculator/zones', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500" /></div>;
  }

  const zones = data?.zones || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">ゾーン: {zones.length}件</p>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />ゾーン追加</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ゾーン名</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">タイプ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">地域</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">基本料金</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">1ポンドあたり</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {zones.map((zone: {
                id: string;
                name: string;
                type: string;
                countries: string[];
                regions: string[];
                baseRate: number;
                perLbRate: number;
              }) => (
                <tr key={zone.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{zone.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      zone.type === 'domestic'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {zone.type === 'domestic' ? '国内' : '国際'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {zone.regions.length > 0 ? zone.regions.join(', ') : zone.countries.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">${zone.baseRate.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">${zone.perLbRate.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function RulesTab() {
  const { data, isLoading } = useSWR('/api/ebay-shipping-calculator/rules', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500" /></div>;
  }

  const rules = data?.rules || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">ルール: {rules.length}件</p>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />ルール追加</Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule: {
          id: string;
          name: string;
          type: string;
          conditions: Record<string, unknown>;
          action: { type: string; amount?: number; percent?: number };
          priority: number;
          enabled: boolean;
        }) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  rule.type === 'free_shipping' ? 'bg-green-100 dark:bg-green-900/30' :
                  rule.type === 'discount' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                  {rule.type === 'free_shipping' ? <Zap className="h-5 w-5 text-green-600" /> :
                   rule.type === 'discount' ? <DollarSign className="h-5 w-5 text-blue-600" /> :
                   <Box className="h-5 w-5 text-amber-600" />}
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">{rule.name}</h4>
                  <p className="text-sm text-zinc-500">優先度: {rule.priority}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  rule.enabled
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                }`}>
                  {rule.enabled ? '有効' : '無効'}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-sm text-zinc-500">
              <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">{JSON.stringify(rule.conditions)}</span>
              <ArrowRight className="h-4 w-4" />
              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 rounded">
                {rule.action.type === 'free' ? '送料無料' :
                 rule.action.type === 'surcharge' ? `+$${rule.action.amount}` :
                 rule.action.type === 'discount' ? `-${rule.action.percent}%` : rule.action.type}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR('/api/ebay-shipping-calculator/settings', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-cyan-500" /></div>;
  }

  const settings = data || {
    general: { defaultOrigin: { postalCode: '90210', country: 'US' }, weightUnit: 'oz', dimensionUnit: 'in' },
    freeShipping: { enabled: true, threshold: 49.99 },
    markups: { enabled: true, type: 'percent', value: 10 },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">発送元設定</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">郵便番号</label>
              <input
                type="text"
                defaultValue={settings.general.defaultOrigin.postalCode}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">国</label>
              <select
                defaultValue={settings.general.defaultOrigin.country}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <option value="US">United States</option>
                <option value="JP">Japan</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">重量単位</label>
              <select
                defaultValue={settings.general.weightUnit}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <option value="oz">オンス (oz)</option>
                <option value="lb">ポンド (lb)</option>
                <option value="g">グラム (g)</option>
                <option value="kg">キログラム (kg)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">寸法単位</label>
              <select
                defaultValue={settings.general.dimensionUnit}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <option value="in">インチ (in)</option>
                <option value="cm">センチメートル (cm)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">送料無料設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">送料無料を有効化</p>
              <p className="text-sm text-zinc-500">一定金額以上で送料無料にする</p>
            </div>
            <input type="checkbox" defaultChecked={settings.freeShipping.enabled} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">送料無料閾値</p>
              <p className="text-sm text-zinc-500">この金額以上で送料無料</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">$</span>
              <input
                type="number"
                defaultValue={settings.freeShipping.threshold}
                className="w-24 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">マークアップ設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">マークアップを有効化</p>
              <p className="text-sm text-zinc-500">送料にマークアップを追加</p>
            </div>
            <input type="checkbox" defaultChecked={settings.markups.enabled} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">マークアップ率</p>
              <p className="text-sm text-zinc-500">送料に追加する割合</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings.markups.value}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">%</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary">設定を保存</Button>
      </div>
    </div>
  );
}
