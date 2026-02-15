'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Globe,
  Plane,
  Package,
  MapPin,
  Truck,
  Calculator,
  Plus,
  RefreshCw,
  Search,
  Settings,
  DollarSign,
  Clock,
  CheckCircle,
  Edit3,
  Trash2,
  Copy,
  Star,
  ChevronRight,
  AlertTriangle,
  X,
  Shield,
  Zap,
  Ship,
  Flag,
  TrendingUp,
  BarChart3,
  Save,
  Loader2,
} from 'lucide-react';

interface ShippingDashboard {
  summary: {
    totalProfiles: number;
    activeProfiles: number;
    totalShipments: number;
    totalShippingRevenue: number;
    averageShippingCost: number;
    freeShippingOrders: number;
  };
  byRegion: Array<{
    region: string;
    shipments: number;
    revenue: number;
    percentage: number;
  }>;
  byMethod: Array<{
    method: string;
    shipments: number;
    percentage: number;
  }>;
  topDestinations: Array<{
    country: string;
    name: string;
    shipments: number;
    flag: string;
  }>;
}

interface ShippingProfile {
  id: string;
  name: string;
  description: string;
  originCountry: string;
  regionCount: number;
  methodCount: number;
  isDefault: boolean;
  listingCount: number;
  createdAt: string;
  updatedAt: string;
}

const regionConfig: Record<string, { name: string; color: string }> = {
  NORTH_AMERICA: { name: '北米', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  EUROPE: { name: 'ヨーロッパ', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  ASIA_PACIFIC: { name: 'アジア太平洋', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  LATIN_AMERICA: { name: '中南米', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  MIDDLE_EAST: { name: '中東', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  AFRICA: { name: 'アフリカ', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const methodConfig: Record<string, { name: string; icon: typeof Zap; color: string }> = {
  OVERNIGHT: { name: 'オーバーナイト', icon: Zap, color: 'text-red-500' },
  EXPRESS: { name: 'エクスプレス', icon: Plane, color: 'text-blue-500' },
  STANDARD: { name: 'スタンダード', icon: Truck, color: 'text-green-500' },
  ECONOMY: { name: 'エコノミー', icon: Ship, color: 'text-gray-500' },
};

export default function EbayShippingInternationalPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculator' | 'profiles' | 'settings'>('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Calculator state
  const [calcDestination, setCalcDestination] = useState('US');
  const [calcWeight, setCalcWeight] = useState('500');
  const [calcWeightUnit, setCalcWeightUnit] = useState('G');
  const [calcResults, setCalcResults] = useState<Array<{ carrier: string; method: string; price: number; deliveryDays: { min: number; max: number } }> | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: dashboard, mutate: mutateDashboard } = useSWR<ShippingDashboard>(
    '/api/ebay-shipping-international/dashboard',
    fetcher
  );

  const { data: profilesData, mutate: mutateProfiles } = useSWR<{ profiles: ShippingProfile[] }>(
    '/api/ebay-shipping-international/profiles',
    fetcher
  );

  const { data: countriesData } = useSWR<{ countries: Array<{ code: string; name: string; nameJa: string; flag: string }> }>(
    '/api/ebay-shipping-international/countries',
    fetcher
  );

  const profiles = profilesData?.profiles || [];
  const countries = countriesData?.countries || [];

  const handleRefresh = () => {
    mutateDashboard();
    mutateProfiles();
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    try {
      const result = await postApi('/api/ebay-shipping-international/calculate', {
        originCountry: 'JP',
        destinationCountry: calcDestination,
        weight: parseFloat(calcWeight),
        weightUnit: calcWeightUnit,
      }) as { rates: Array<{ carrier: string; method: string; price: number; deliveryDays: { min: number; max: number } }> };
      setCalcResults(result.rates);
    } catch {
      addToast({ type: 'error', message: '送料計算に失敗しました' });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSetDefault = async (profileId: string) => {
    try {
      await postApi(`/api/ebay-shipping-international/profiles/${profileId}/set-default`, {});
      addToast({ type: 'success', message: 'デフォルトプロファイルを設定しました' });
      mutateProfiles();
    } catch {
      addToast({ type: 'error', message: '設定に失敗しました' });
    }
  };

  const handleDuplicate = async (profileId: string) => {
    try {
      await postApi(`/api/ebay-shipping-international/profiles/${profileId}/duplicate`, {});
      addToast({ type: 'success', message: 'プロファイルを複製しました' });
      mutateProfiles();
    } catch {
      addToast({ type: 'error', message: '複製に失敗しました' });
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
    { id: 'calculator', label: '送料計算', icon: Calculator },
    { id: 'profiles', label: 'プロファイル', icon: Package },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">国際送料</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              国際配送料金の計算・管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規プロファイル
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                    <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">プロファイル</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                      {dashboard.summary.totalProfiles}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">有効</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {dashboard.summary.activeProfiles}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <Plane className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">発送数</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                      {dashboard.summary.totalShipments.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">送料収益</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${dashboard.summary.totalShippingRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">平均送料</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      ${dashboard.summary.averageShippingCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-900/30">
                    <Star className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">送料無料</p>
                    <p className="text-xl font-bold text-pink-600 dark:text-pink-400">
                      {dashboard.summary.freeShippingOrders}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* By Region */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-cyan-500" />
                  地域別発送
                </h3>
                <div className="space-y-3">
                  {dashboard.byRegion.map((item) => {
                    const config = regionConfig[item.region] || { name: item.region, color: 'bg-zinc-100 text-zinc-700' };
                    return (
                      <div key={item.region} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={cn('px-2 py-0.5 rounded', config.color)}>
                            {config.name}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {item.shipments}件 / ${item.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Top Destinations */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-500" />
                  トップ送付先
                </h3>
                <div className="space-y-3">
                  {dashboard.topDestinations.map((item, index) => (
                    <div
                      key={item.country}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.flag}</span>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-zinc-500">{item.country}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {item.shipments}件
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* By Method */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-500" />
                配送方法別
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {dashboard.byMethod.map((item) => {
                  const config = methodConfig[item.method] || { name: item.method, icon: Package, color: 'text-zinc-500' };
                  const Icon = config.icon;
                  return (
                    <div key={item.method} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-center">
                      <Icon className={cn('h-6 w-6 mx-auto mb-2', config.color)} />
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{config.name}</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-white">{item.shipments}</p>
                      <p className="text-xs text-zinc-500">{item.percentage.toFixed(1)}%</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-cyan-500" />
                送料計算
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      発送元
                    </label>
                    <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                      <span className="text-lg">🇯🇵</span>
                      <span className="text-sm">日本</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      送付先
                    </label>
                    <select
                      value={calcDestination}
                      onChange={(e) => setCalcDestination(e.target.value)}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      重量
                    </label>
                    <input
                      type="number"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(e.target.value)}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      単位
                    </label>
                    <select
                      value={calcWeightUnit}
                      onChange={(e) => setCalcWeightUnit(e.target.value)}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="G">グラム (g)</option>
                      <option value="KG">キログラム (kg)</option>
                      <option value="OZ">オンス (oz)</option>
                      <option value="LB">ポンド (lb)</option>
                    </select>
                  </div>
                </div>

                <Button variant="primary" onClick={handleCalculate} disabled={isCalculating} className="w-full">
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-1" />
                  )}
                  送料を計算
                </Button>
              </div>
            </Card>

            {/* Results */}
            {calcResults && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">
                  計算結果
                </h3>
                <div className="space-y-3">
                  {calcResults.map((rate, index) => {
                    const config = methodConfig[rate.method] || { name: rate.method, icon: Package, color: 'text-zinc-500' };
                    const Icon = config.icon;
                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border',
                          index === 0
                            ? 'border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-900/20'
                            : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('h-5 w-5', config.color)} />
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              {rate.carrier} - {config.name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {rate.deliveryDays.min}-{rate.deliveryDays.max}日
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-zinc-900 dark:text-white">
                            ${rate.price.toFixed(2)}
                          </p>
                          {index === 0 && (
                            <span className="text-xs text-cyan-600 dark:text-cyan-400">最安</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Profiles Tab */}
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="プロファイルを検索..."
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-cyan-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              {profiles.map((profile) => (
                <Card key={profile.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                        <Globe className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                            {profile.name}
                          </h4>
                          {profile.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                              <Star className="h-3 w-3" />
                              デフォルト
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {profile.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500">
                            {profile.regionCount}地域
                          </span>
                          <span className="text-xs text-zinc-500">
                            {profile.methodCount}配送方法
                          </span>
                          <span className="text-xs text-zinc-500">
                            {profile.listingCount}出品に適用
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!profile.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(profile.id)}
                          title="デフォルトに設定"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(profile.id)}
                        title="複製"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="編集">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="削除">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">基本設定</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      デフォルト発送元
                    </label>
                    <select className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <option value="JP">🇯🇵 日本</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      デフォルト通貨
                    </label>
                    <select className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <option value="USD">USD - 米ドル</option>
                      <option value="EUR">EUR - ユーロ</option>
                      <option value="GBP">GBP - ポンド</option>
                      <option value="JPY">JPY - 日本円</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      デフォルト重量単位
                    </label>
                    <select className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <option value="G">グラム (g)</option>
                      <option value="KG">キログラム (kg)</option>
                      <option value="OZ">オンス (oz)</option>
                      <option value="LB">ポンド (lb)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      デフォルトサイズ単位
                    </label>
                    <select className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <option value="CM">センチメートル (cm)</option>
                      <option value="IN">インチ (in)</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">追加料金</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      ハンドリング料
                    </label>
                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      梱包料
                    </label>
                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">保険設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">保険を有効化</p>
                    <p className="text-xs text-zinc-500">高額商品に自動的に保険を適用</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">保険適用しきい値</p>
                    <p className="text-xs text-zinc-500">この金額以上で保険を適用</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={100}
                    className="w-20 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">同梱設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">同梱を許可</p>
                    <p className="text-xs text-zinc-500">複数商品の同梱発送を許可</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">同梱割引率</p>
                    <p className="text-xs text-zinc-500">2個目以降の送料割引</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-16 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <span className="text-sm text-zinc-500">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">最大同梱数</p>
                    <p className="text-xs text-zinc-500">1回の発送で同梱できる最大数</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={5}
                    className="w-20 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button variant="primary">
                <Save className="h-4 w-4 mr-1" />
                設定を保存
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-zinc-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                新規配送プロファイル
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  プロファイル名
                </label>
                <input
                  type="text"
                  placeholder="例: Standard International"
                  className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  説明
                </label>
                <textarea
                  placeholder="プロファイルの説明..."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  対象地域
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(regionConfig).map(([key, config]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{config.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => { setShowCreateModal(false); addToast({ type: 'success', message: 'プロファイルを作成しました' }); }}>
                <Plus className="h-4 w-4 mr-1" />
                作成
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
