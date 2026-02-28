
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Package,
  FolderTree,
  Tags,
  Image,
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  CheckCircle,
  FileText,
  Archive,
  Settings,
  Upload,
  Download,
  Filter,
  ChevronRight,
} from 'lucide-react';

type TabType = 'dashboard' | 'products' | 'categories' | 'attributes' | 'images' | 'settings';

export default function ProductCatalogPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: Package },
    { id: 'products' as const, label: '商品', icon: Package },
    { id: 'categories' as const, label: 'カテゴリ', icon: FolderTree },
    { id: 'attributes' as const, label: '属性', icon: Tags },
    { id: 'images' as const, label: '画像', icon: Image },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品カタログ</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">商品・カテゴリ・属性管理</p>
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
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
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
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'attributes' && <AttributesTab />}
        {activeTab === 'images' && <ImagesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-product-catalog/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const dashboard = data || {
    overview: { totalProducts: 0, activeProducts: 0, draftProducts: 0, archivedProducts: 0 },
    categories: { total: 0, topLevel: 0 },
    attributes: { total: 0, required: 0 },
    healthScore: { overall: 0, completeness: 0, imageQuality: 0, seoScore: 0 },
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総商品数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.totalProducts.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">アクティブ</p>
              <p className="text-xl font-bold text-green-600">{dashboard.overview.activeProducts.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">下書き</p>
              <p className="text-xl font-bold text-amber-600">{dashboard.overview.draftProducts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Archive className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">アーカイブ</p>
              <p className="text-xl font-bold text-zinc-600">{dashboard.overview.archivedProducts}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">カタログ品質</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">総合スコア</span>
                <span className="font-semibold text-indigo-600">{dashboard.healthScore.overall}%</span>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${dashboard.healthScore.overall}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">情報完全性</span>
                <span className="font-semibold text-green-600">{dashboard.healthScore.completeness}%</span>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${dashboard.healthScore.completeness}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">画像品質</span>
                <span className="font-semibold text-blue-600">{dashboard.healthScore.imageQuality}%</span>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${dashboard.healthScore.imageQuality}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">SEOスコア</span>
                <span className="font-semibold text-purple-600">{dashboard.healthScore.seoScore}%</span>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${dashboard.healthScore.seoScore}%` }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">カテゴリ・属性</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-indigo-500" />
                <span className="text-zinc-700 dark:text-zinc-300">カテゴリ</span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">{dashboard.categories.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-purple-500" />
                <span className="text-zinc-700 dark:text-zinc-300">属性</span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">{dashboard.attributes.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-amber-500" />
                <span className="text-zinc-700 dark:text-zinc-300">必須属性</span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">{dashboard.attributes.required}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">最近のアクティビティ</h3>
          <div className="space-y-3">
            {dashboard.recentActivity.map((activity: { type: string; productId?: string; title?: string; categoryId?: string; name?: string; date: string }, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {activity.type === 'product_created' && <Plus className="h-4 w-4 text-green-500" />}
                  {activity.type === 'product_updated' && <Edit className="h-4 w-4 text-blue-500" />}
                  {activity.type === 'category_created' && <FolderTree className="h-4 w-4 text-purple-500" />}
                  <span className="text-zinc-600 dark:text-zinc-400">{activity.title || activity.name}</span>
                </div>
                <span className="text-xs text-zinc-500">{new Date(activity.date).toLocaleDateString('ja-JP')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProductsTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-product-catalog/products', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const products = data?.products || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="商品を検索..."
              className="pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 w-64"
            />
          </div>
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのカテゴリ</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
          </select>
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="draft">下書き</option>
            <option value="archived">アーカイブ</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" />インポート</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />エクスポート</Button>
          <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />商品追加</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">商品</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">カテゴリ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">価格</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">在庫</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">完全性</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">ステータス</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {products.map((product: {
                id: string;
                sku: string;
                title: string;
                images: { primary: string; count: number };
                category: { name: string };
                price: { retail: number };
                inventory: { available: number };
                completeness: number;
                status: string;
              }) => (
                <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <img src={product.images.primary} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white text-sm">{product.title}</p>
                        <p className="text-xs text-zinc-500">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{product.category.name}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-white">
                    ${product.price.retail.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {product.inventory.available}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                        <div
                          className={`h-full rounded-full ${product.completeness >= 90 ? 'bg-green-500' : product.completeness >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${product.completeness}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{product.completeness}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      product.status === 'draft' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {product.status === 'active' ? 'アクティブ' : product.status === 'draft' ? '下書き' : 'アーカイブ'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
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

function CategoriesTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-product-catalog/categories', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const categories = data?.categories || [];

  const renderCategory = (category: { id: string; name: string; productCount: number; children: unknown[] }, depth: number = 0) => (
    <div key={category.id}>
      <div
        className={`flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <div className="flex items-center gap-2">
          {category.children.length > 0 && <ChevronRight className="h-4 w-4 text-zinc-400" />}
          <FolderTree className="h-4 w-4 text-indigo-500" />
          <span className="font-medium text-zinc-900 dark:text-white">{category.name}</span>
          <span className="text-sm text-zinc-500">({category.productCount})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm"><Plus className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {category.children.map((child) => renderCategory(child as typeof category, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">カテゴリ: {data?.total || 0}件</p>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />カテゴリ追加</Button>
      </div>

      <Card className="overflow-hidden">
        {categories.map((cat: { id: string; name: string; productCount: number; children: unknown[] }) => renderCategory(cat))}
      </Card>
    </div>
  );
}

function AttributesTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-product-catalog/attributes', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const attributes = data?.attributes || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのタイプ</option>
            <option value="text">テキスト</option>
            <option value="select">選択</option>
            <option value="number">数値</option>
          </select>
        </div>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />属性追加</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">属性名</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">タイプ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">必須</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">使用数</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {attributes.map((attr: {
                id: string;
                name: string;
                type: string;
                required: boolean;
                options: string[] | null;
                usageCount: number;
              }) => (
                <tr key={attr.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{attr.name}</p>
                      {attr.options && (
                        <p className="text-xs text-zinc-500">{attr.options.slice(0, 3).join(', ')}{attr.options.length > 3 && ` +${attr.options.length - 3}`}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
                      {attr.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {attr.required ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {attr.usageCount}
                  </td>
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

function ImagesTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-product-catalog/images', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const images = data?.images || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべての画像</option>
            <option value="unused">未使用</option>
            <option value="used">使用中</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">未使用画像を削除</Button>
          <Button variant="primary" size="sm"><Upload className="h-4 w-4 mr-1" />アップロード</Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {images.map((image: {
          id: string;
          url: string;
          filename: string;
          productId: string | null;
          isPrimary: boolean;
        }) => (
          <Card key={image.id} className="overflow-hidden group relative">
            <div className="aspect-square bg-zinc-100 dark:bg-zinc-800">
              <img src={image.url} alt={image.filename} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" className="text-white"><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className="text-white"><Trash2 className="h-4 w-4" /></Button>
            </div>
            {image.isPrimary && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-indigo-500 text-white text-xs rounded">
                メイン
              </div>
            )}
            {!image.productId && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-xs rounded">
                未使用
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-product-catalog/settings', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  const settings = data || {
    general: { defaultStatus: 'draft', autoGenerateSku: true, skuPrefix: 'SKU-' },
    images: { maxSize: 5000000, autoResize: true },
    validation: { requireDescription: true, minDescriptionLength: 50 },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">デフォルトステータス</p>
              <p className="text-sm text-zinc-500">新規商品のデフォルトステータス</p>
            </div>
            <select defaultValue={settings.general.defaultStatus} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <option value="draft">下書き</option>
              <option value="active">アクティブ</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">SKU自動生成</p>
              <p className="text-sm text-zinc-500">SKUを自動的に生成</p>
            </div>
            <input type="checkbox" defaultChecked={settings.general.autoGenerateSku} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">SKUプレフィックス</p>
              <p className="text-sm text-zinc-500">自動生成SKUのプレフィックス</p>
            </div>
            <input
              type="text"
              defaultValue={settings.general.skuPrefix}
              className="w-32 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">画像設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">最大ファイルサイズ</p>
              <p className="text-sm text-zinc-500">アップロード可能な最大サイズ</p>
            </div>
            <span className="text-zinc-600">{(settings.images.maxSize / 1000000).toFixed(0)} MB</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">自動リサイズ</p>
              <p className="text-sm text-zinc-500">画像を自動的にリサイズ</p>
            </div>
            <input type="checkbox" defaultChecked={settings.images.autoResize} className="toggle" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">バリデーション設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">説明必須</p>
              <p className="text-sm text-zinc-500">商品説明を必須にする</p>
            </div>
            <input type="checkbox" defaultChecked={settings.validation.requireDescription} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">最小説明文字数</p>
              <p className="text-sm text-zinc-500">商品説明の最小文字数</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings.validation.minDescriptionLength}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">文字</span>
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
