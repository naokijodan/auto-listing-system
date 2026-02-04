'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Filter, ExternalLink } from 'lucide-react';

const mockProducts = [
  {
    id: '1',
    title: 'SEIKO SKX007 ダイバーズウォッチ',
    titleEn: 'SEIKO SKX007 Diver Watch',
    sourcePrice: 45000,
    sourceSite: 'mercari',
    status: 'ACTIVE',
    images: ['https://placehold.co/100x100/f59e0b/ffffff?text=SKX007'],
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'ORIENT バンビーノ 自動巻き',
    titleEn: 'ORIENT Bambino Automatic Watch',
    sourcePrice: 28000,
    sourceSite: 'yahoo',
    status: 'ACTIVE',
    images: ['https://placehold.co/100x100/3b82f6/ffffff?text=Bambino'],
    createdAt: '2024-02-02T15:30:00Z',
  },
  {
    id: '3',
    title: 'CASIO G-SHOCK GA-2100',
    titleEn: 'CASIO G-SHOCK GA-2100 CasiOak',
    sourcePrice: 15000,
    sourceSite: 'mercari',
    status: 'OUT_OF_STOCK',
    images: ['https://placehold.co/100x100/10b981/ffffff?text=GA2100'],
    createdAt: '2024-02-03T09:15:00Z',
  },
  {
    id: '4',
    title: 'CITIZEN プロマスター エコドライブ',
    titleEn: 'CITIZEN Promaster Eco-Drive',
    sourcePrice: 52000,
    sourceSite: 'yahoo',
    status: 'PENDING',
    images: ['https://placehold.co/100x100/8b5cf6/ffffff?text=Promaster'],
    createdAt: '2024-02-04T11:00:00Z',
  },
];

const sourceSiteLabels: Record<string, string> = {
  mercari: 'メルカリ',
  yahoo: 'ヤフオク',
  rakuma: 'ラクマ',
};

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            取得した商品の一覧と管理
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          商品を追加
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="商品を検索..."
              className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-amber-500"
            />
          </div>
          <select className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="">すべてのステータス</option>
            <option value="ACTIVE">アクティブ</option>
            <option value="PENDING">保留中</option>
            <option value="OUT_OF_STOCK">在庫切れ</option>
            <option value="ERROR">エラー</option>
          </select>
          <select className="h-10 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="">すべての仕入元</option>
            <option value="mercari">メルカリ</option>
            <option value="yahoo">ヤフオク</option>
            <option value="rakuma">ラクマ</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            詳細フィルター
          </Button>
        </div>
      </Card>

      {/* Product List */}
      <div className="space-y-4">
        {mockProducts.map((product) => (
          <Card key={product.id} className="p-4">
            <div className="flex items-center gap-4">
              {/* Image */}
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                      {product.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {product.titleEn}
                    </p>
                  </div>
                  <StatusBadge status={product.status} />
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>仕入価格: {formatCurrency(product.sourcePrice)}</span>
                  <span>仕入元: {sourceSiteLabels[product.sourceSite]}</span>
                  <span>登録日: {formatDate(product.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  編集
                </Button>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          全 1,234 件中 1-10 件を表示
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            前へ
          </Button>
          <Button variant="outline" size="sm">
            次へ
          </Button>
        </div>
      </div>
    </div>
  );
}
