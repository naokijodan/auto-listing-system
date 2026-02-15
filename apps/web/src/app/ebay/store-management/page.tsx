'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Store,
  LayoutGrid,
  FileText,
  Palette,
  Tag,
  BarChart3,
  Settings,
  Users,
  Eye,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  Bell,
  Search,
  Image,
  Star,
  TrendingUp,
  Globe,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'categories' | 'pages' | 'design' | 'promotions' | 'settings';

export default function StoreManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'categories', label: 'カテゴリ', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'pages', label: 'ページ', icon: <FileText className="w-4 h-4" /> },
    { id: 'design', label: 'デザイン', icon: <Palette className="w-4 h-4" /> },
    { id: 'promotions', label: 'プロモーション', icon: <Tag className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8 text-violet-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ストア管理</h1>
              <p className="text-sm text-gray-500">Store Management</p>
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
                  ? 'border-violet-600 text-violet-600'
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
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'pages' && <PagesTab />}
          {activeTab === 'design' && <DesignTab />}
          {activeTab === 'promotions' && <PromotionsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/store-management/dashboard/overview`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/store-management/dashboard/performance`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/store-management/dashboard/notifications`, fetcher);

  return (
    <div className="space-y-6">
      {/* ストア概要 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-violet-100 rounded-lg flex items-center justify-center">
              <Store className="w-8 h-8 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{overview?.storeName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded text-sm">
                  {overview?.subscriptionLevel}
                </span>
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-sm">
                  {overview?.sellerLevel}
                </span>
              </div>
            </div>
          </div>
          <a
            href={`https://www.ebay.com/str/${overview?.storeName?.toLowerCase().replace(/\s+/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" />
            ストアを表示
          </a>
        </div>
      </div>

      {/* メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ストアヘルス</p>
              <p className="text-2xl font-bold">{overview?.storeHealth}%</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-green-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">アクティブリスティング</p>
          <p className="text-2xl font-bold">{overview?.activeListings?.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">/ {overview?.totalListings?.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">ストア閲覧数</p>
          <p className="text-2xl font-bold">{overview?.storeViews?.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">フォロワー</p>
          <p className="text-2xl font-bold">{overview?.storeFollowers?.toLocaleString()}</p>
        </div>
      </div>

      {/* 通知 & パフォーマンス */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">通知</h3>
          <div className="space-y-3">
            {notifications?.notifications?.map((notif: {
              id: string;
              type: string;
              title: string;
              message: string;
              read: boolean;
            }) => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  notif.read ? 'bg-gray-50' : 'bg-violet-50'
                }`}
              >
                <Bell className={`w-5 h-5 mt-0.5 ${
                  notif.type === 'warning' ? 'text-yellow-600' :
                  notif.type === 'success' ? 'text-green-600' :
                  'text-violet-600'
                }`} />
                <div>
                  <p className="font-medium">{notif.title}</p>
                  <p className="text-sm text-gray-500">{notif.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">パフォーマンス</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">総売上</p>
              <p className="text-xl font-bold">¥{performance?.salesMetrics?.totalSales?.toLocaleString()}</p>
              <p className="text-sm text-green-600">+{performance?.salesMetrics?.salesGrowth}%</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">コンバージョン率</p>
              <p className="text-xl font-bold">{performance?.salesMetrics?.conversionRate}%</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">ページビュー</p>
              <p className="text-xl font-bold">{performance?.trafficMetrics?.pageViews?.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">ユニーク訪問者</p>
              <p className="text-xl font-bold">{performance?.trafficMetrics?.uniqueVisitors?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoriesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/store-management/categories`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">ストアカテゴリ</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Plus className="w-4 h-4" />
            カテゴリ追加
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">順序</th>
                <th className="px-4 py-3 text-left text-sm">カテゴリ名</th>
                <th className="px-4 py-3 text-left text-sm">スラッグ</th>
                <th className="px-4 py-3 text-right text-sm">リスティング数</th>
                <th className="px-4 py-3 text-center text-sm">表示</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.categories?.map((cat: {
                id: string;
                name: string;
                slug: string;
                listingCount: number;
                order: number;
                visible: boolean;
              }) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{cat.order}</td>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{cat.slug}</td>
                  <td className="px-4 py-3 text-sm text-right">{cat.listingCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      cat.visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {cat.visible ? '表示' : '非表示'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
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

function PagesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/store-management/pages`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">ストアページ</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Plus className="w-4 h-4" />
            ページ追加
          </button>
        </div>
        <div className="divide-y">
          {data?.pages?.map((page: {
            id: string;
            title: string;
            slug: string;
            status: string;
            views: number;
          }) => (
            <div key={page.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-medium">{page.title}</p>
                  <p className="text-sm text-gray-500">/{page.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  page.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {page.status === 'published' ? '公開中' : '下書き'}
                </span>
                <span className="text-sm text-gray-500">{page.views} views</span>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignTab() {
  const { data: theme } = useSWR(`${API_BASE}/ebay/store-management/design/theme`, fetcher);
  const { data: banners } = useSWR(`${API_BASE}/ebay/store-management/design/banners`, fetcher);

  return (
    <div className="space-y-6">
      {/* テーマ設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">テーマ設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">プライマリカラー</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                defaultValue={theme?.primaryColor}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                defaultValue={theme?.primaryColor}
                className="border rounded-lg px-3 py-2 flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">セカンダリカラー</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                defaultValue={theme?.secondaryColor}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                defaultValue={theme?.secondaryColor}
                className="border rounded-lg px-3 py-2 flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">ヘッダースタイル</label>
            <select defaultValue={theme?.headerStyle} className="w-full border rounded-lg px-3 py-2">
              <option value="classic">クラシック</option>
              <option value="modern">モダン</option>
              <option value="minimal">ミニマル</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">レイアウトスタイル</label>
            <select defaultValue={theme?.layoutStyle} className="w-full border rounded-lg px-3 py-2">
              <option value="grid">グリッド</option>
              <option value="list">リスト</option>
              <option value="gallery">ギャラリー</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            テーマを保存
          </button>
        </div>
      </div>

      {/* バナー管理 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">バナー管理</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">
            <Plus className="w-4 h-4" />
            バナー追加
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banners?.banners?.map((banner: {
            id: string;
            title: string;
            imageUrl: string;
            position: string;
            active: boolean;
          }) => (
            <div key={banner.id} className="border rounded-lg overflow-hidden">
              <div className="h-32 bg-gray-100 flex items-center justify-center">
                <Image className="w-12 h-12 text-gray-400" />
              </div>
              <div className="p-4">
                <p className="font-medium">{banner.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-500">{banner.position}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    banner.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {banner.active ? 'アクティブ' : '無効'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PromotionsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/store-management/promotions`, fetcher);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      ended: 'bg-gray-100 text-gray-800',
      paused: 'bg-yellow-100 text-yellow-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">プロモーション</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            <Plus className="w-4 h-4" />
            プロモーション作成
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">プロモーション名</th>
                <th className="px-4 py-3 text-left text-sm">タイプ</th>
                <th className="px-4 py-3 text-right text-sm">割引</th>
                <th className="px-4 py-3 text-left text-sm">期間</th>
                <th className="px-4 py-3 text-right text-sm">対象商品</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.promotions?.map((promo: {
                id: string;
                name: string;
                type: string;
                discount: number;
                startDate: string;
                endDate: string;
                status: string;
                itemCount: number;
              }) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{promo.name}</td>
                  <td className="px-4 py-3 text-sm">{promo.type}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {promo.type === 'percentage' ? `${promo.discount}%` : promo.type === 'bogo' ? 'BOGO' : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{promo.startDate} ~ {promo.endDate}</td>
                  <td className="px-4 py-3 text-sm text-right">{promo.itemCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(promo.status)}`}>
                      {promo.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
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

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/store-management/settings/general`, fetcher);
  const { data: seo } = useSWR(`${API_BASE}/ebay/store-management/seo/settings`, fetcher);
  const { data: subscription } = useSWR(`${API_BASE}/ebay/store-management/store/subscription`, fetcher);

  return (
    <div className="space-y-6">
      {/* サブスクリプション */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">サブスクリプション</h3>
        <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg">
          <div>
            <p className="text-lg font-bold text-violet-800">{subscription?.level} プラン</p>
            <p className="text-sm text-violet-600">¥{subscription?.price?.toLocaleString()}/月</p>
          </div>
          <button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            プラン変更
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {subscription?.features?.slice(0, 5).map((feature: { name: string; limit?: number; used?: number; enabled?: boolean }, i: number) => (
            <div key={i} className="p-3 border rounded-lg">
              <p className="text-sm text-gray-500">{feature.name}</p>
              {feature.limit !== undefined ? (
                <p className="font-medium">{feature.used} / {feature.limit}</p>
              ) : (
                <p className="font-medium">{feature.enabled ? '有効' : '無効'}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">タイムゾーン</p>
            </div>
            <select defaultValue={general?.timezone} className="border rounded-lg px-3 py-2">
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">注文通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.orderNotifications} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-violet-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">バケーションモード</p>
              <p className="text-sm text-gray-500">ストアを一時的に休止</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.vacationMode} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-violet-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      {/* SEO設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">SEO設定</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">ストアタイトル</label>
            <input
              type="text"
              defaultValue={seo?.storeTitle}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">ストア説明</label>
            <textarea
              defaultValue={seo?.storeDescription}
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">キーワード</label>
            <input
              type="text"
              defaultValue={seo?.keywords?.join(', ')}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="カンマ区切りで入力"
            />
          </div>
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
            SEO設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}
