'use client';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Edit, ExternalLink, ShoppingBag, Loader2 } from 'lucide-react';
import { sourceSiteLabels } from './types';

interface ProductDetailPanelProps {
  product: any;
  exchangeRate: number;
  activeEbayAccounts: Array<{ id: string; name: string; isActive: boolean }>;
  selectedEbayCredentialId: string;
  onSelectEbayCredential: (id: string) => void;
  onCreateEbayListing: (productId: string) => void;
  isCreatingEbayListing: boolean;
  isLoading: boolean;
}

export function ProductDetailPanel(props: ProductDetailPanelProps) {
  const {
    product,
    activeEbayAccounts,
    selectedEbayCredentialId,
    onSelectEbayCredential,
    onCreateEbayListing,
    isCreatingEbayListing,
    isLoading,
  } = props;

  if (!product) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        {isLoading ? '読み込み中...' : '商品を選択してください'}
      </div>
    );
  }

  const imageUrl = product.processedImages?.[0] || product.images?.[0] || `https://placehold.co/400x400/27272a/f59e0b?text=No+Image`;

  return (
    <div className="p-4">
      {/* Product Image */}
      <div className="mb-4 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <img
          src={imageUrl}
          alt={product.title || '商品画像'}
          className="h-48 w-full object-contain"
        />
      </div>

      {/* Product Info */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">{product.title}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{product.titleEn || '翻訳なし'}</p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={product.status} />
          {product.listings && product.listings.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{product.listings.length}件の出品</span>
          )}
        </div>

        {/* Specs Table */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
            詳細情報
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[
              { label: 'ID', value: product.sourceItemId?.slice(0, 12) || product.id.slice(0, 12) },
              { label: 'ブランド', value: product.brand || '-' },
              { label: 'カテゴリ', value: product.category || '-' },
              { label: 'コンディション', value: product.condition || '-' },
              { label: '仕入元', value: sourceSiteLabels[product.source?.type || ''] || product.source?.name || '-' },
              { label: '仕入価格', value: formatCurrency(product.price) },
              {
                label: '出品価格',
                value: product.listings?.[0]?.listingPrice ? `$${product.listings[0].listingPrice.toFixed(2)}` : '-',
              },
              { label: '重量', value: product.weight ? `${product.weight}g` : '-' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-white">{item.value}</span>
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
          {product.sourceUrl && (
            <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4" />
                仕入元
              </Button>
            </a>
          )}
        </div>

        {/* eBayアカウント選択 */}
        {activeEbayAccounts.length > 1 && (
          <select
            value={selectedEbayCredentialId}
            onChange={(e) => onSelectEbayCredential(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">デフォルトアカウント</option>
            {activeEbayAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        )}

        {/* eBay出品作成 */}
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => onCreateEbayListing(product.id)}
          disabled={isCreatingEbayListing}
        >
          {isCreatingEbayListing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
          eBay出品作成
        </Button>
      </div>
    </div>
  );
}

