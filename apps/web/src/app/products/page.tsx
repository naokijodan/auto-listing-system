'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  MoreHorizontal,
} from 'lucide-react';

// Mock data - 実際はAPIから取得
const mockProducts = Array.from({ length: 50 }, (_, i) => ({
  id: `prod-${String(i + 1).padStart(5, '0')}`,
  sku: `nt${String(i + 1).padStart(4, '0')}`,
  title: ['SEIKO SKX007', 'ORIENT バンビーノ', 'CASIO G-SHOCK', 'CITIZEN プロマスター', 'HERMES ネクタイ', 'Dior カフリンクス', 'Tiffany ネックレス'][i % 7],
  titleEn: ['SEIKO SKX007 Diver Watch', 'ORIENT Bambino Automatic', 'CASIO G-SHOCK GA-2100', 'CITIZEN Promaster Eco-Drive', 'Hermes Silk Tie', 'Christian Dior Cufflinks', 'Tiffany Necklace'][i % 7],
  sourcePrice: [8980, 10980, 11980, 8980, 7780, 4400, 13700][i % 7],
  listingPrice: [126.30, 146.68, 156.87, 126.30, 114.07, 79.64, 174.88][i % 7],
  sourceSite: ['mercari', 'yahoo', 'mercari', 'yahoo', 'mercari', 'yahoo', 'mercari'][i % 7],
  status: ['ACTIVE', 'ACTIVE', 'PENDING', 'OUT_OF_STOCK', 'ACTIVE', 'ERROR', 'ACTIVE'][i % 7],
  watchCount: Math.floor(Math.random() * 10),
  category: ['時計', '時計', '時計', '時計', 'ネクタイ', 'カフリンクス', 'ネックレス'][i % 7],
  images: [`https://placehold.co/400x400/27272a/f59e0b?text=${encodeURIComponent(['SKX', 'Bambino', 'G-SHOCK', 'Promaster', 'Hermes', 'Dior', 'Tiffany'][i % 7])}`],
  brand: ['SEIKO', 'ORIENT', 'CASIO', 'CITIZEN', 'HERMES', 'Dior', 'Tiffany'][i % 7],
  condition: '美品',
  listingStatus: '出品中',
}));

const sourceSiteLabels: Record<string, string> = {
  mercari: 'メルカリ',
  yahoo: 'ヤフオク',
  rakuma: 'ラクマ',
};

export default function ProductsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(mockProducts[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedProduct = mockProducts.find((p) => p.id === focusedId);
  const isMultiSelect = selectedIds.size > 1;

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = mockProducts.findIndex((p) => p.id === focusedId);

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < mockProducts.length - 1) {
            setFocusedId(mockProducts[currentIndex + 1].id);
          }
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setFocusedId(mockProducts[currentIndex - 1].id);
          }
          break;
        case ' ':
          e.preventDefault();
          if (focusedId) {
            toggleSelect(focusedId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === mockProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mockProducts.map((p) => p.id)));
    }
  }, [selectedIds.size]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {mockProducts.length.toLocaleString()} 件の商品
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4" />
            インポート
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="商品を検索... (SKU, 商品名)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <select className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">すべてのステータス</option>
          <option value="ACTIVE">アクティブ</option>
          <option value="PENDING">保留中</option>
          <option value="OUT_OF_STOCK">在庫切れ</option>
          <option value="ERROR">エラー</option>
        </select>
        <select className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
          <option value="">すべての仕入元</option>
          <option value="mercari">メルカリ</option>
          <option value="yahoo">ヤフオク</option>
        </select>
        <Button variant="ghost" size="sm">
          <Filter className="h-4 w-4" />
          詳細
        </Button>
        <Button variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content: Table + Detail Panel */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Table */}
        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Table Header */}
          <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <div className="w-8">
              <input
                type="checkbox"
                checked={selectedIds.size === mockProducts.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
              />
            </div>
            <div className="w-12">画像</div>
            <div className="w-24">SKU</div>
            <div className="flex-1 min-w-0">商品名</div>
            <div className="w-24 text-right">仕入価格</div>
            <div className="w-24 text-right">出品価格</div>
            <div className="w-20">仕入元</div>
            <div className="w-24">ステータス</div>
          </div>

          {/* Table Body */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
            {mockProducts.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const isFocused = focusedId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => setFocusedId(product.id)}
                  className={cn(
                    'flex items-center border-b border-zinc-100 px-3 py-1.5 cursor-pointer transition-colors',
                    'dark:border-zinc-800/50',
                    isFocused && 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-l-amber-500',
                    !isFocused && isSelected && 'bg-zinc-50 dark:bg-zinc-800/30',
                    !isFocused && !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                  )}
                >
                  <div className="w-8">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(product.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-500"
                    />
                  </div>
                  <div className="w-12">
                    <div className="h-10 w-10 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={product.images[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="w-24">
                    <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {product.sku}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {product.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {product.titleEn}
                    </p>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm text-zinc-900 dark:text-white">
                      {formatCurrency(product.sourcePrice)}
                    </span>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      ${product.listingPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-20">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {sourceSiteLabels[product.sourceSite]}
                    </span>
                  </div>
                  <div className="w-24">
                    <StatusBadge status={product.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {selectedProduct ? (
            <div className="p-4">
              {/* Product Image */}
              <div className="mb-4 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.title}
                  className="h-48 w-full object-contain"
                />
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {selectedProduct.title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {selectedProduct.titleEn}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedProduct.status} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedProduct.listingStatus}
                  </span>
                </div>

                {/* Specs Table */}
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                    詳細情報
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {[
                      { label: 'SKU', value: selectedProduct.sku },
                      { label: 'ブランド', value: selectedProduct.brand },
                      { label: 'カテゴリ', value: selectedProduct.category },
                      { label: 'コンディション', value: selectedProduct.condition },
                      { label: '仕入元', value: sourceSiteLabels[selectedProduct.sourceSite] },
                      { label: '仕入価格', value: formatCurrency(selectedProduct.sourcePrice) },
                      { label: '出品価格', value: `$${selectedProduct.listingPrice.toFixed(2)}` },
                      { label: 'ウォッチ数', value: selectedProduct.watchCount },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4" />
                    編集
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <ExternalLink className="h-4 w-4" />
                    仕入元
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              商品を選択してください
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div
        className={cn(
          'mt-4 flex items-center justify-between rounded-lg border px-4 py-3 transition-colors',
          isMultiSelect
            ? 'border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20'
            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
        )}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {selectedIds.size > 0 ? (
              <span className={isMultiSelect ? 'font-medium text-amber-700 dark:text-amber-400' : ''}>
                {selectedIds.size} 件選択中
              </span>
            ) : (
              'アクションを選択'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            <Edit className="h-4 w-4" />
            一括編集
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            価格一括変更
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            一括出品
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0}>
            <Download className="h-4 w-4" />
            エクスポート
          </Button>
          <Button variant="danger" size="sm" disabled={selectedIds.size === 0}>
            <Trash2 className="h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-400">
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">J</kbd> / <kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">K</kbd> 移動</span>
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">Space</kbd> 選択</span>
        <span><kbd className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-700">Enter</kbd> 詳細</span>
      </div>
    </div>
  );
}
