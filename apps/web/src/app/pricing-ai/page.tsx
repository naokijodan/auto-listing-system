'use client';

import { useState } from 'react';
import {
  usePricingStats,
  usePriceRecommendations,
  PriceRecommendation,
  PricingStrategy,
} from '@/lib/hooks';
import { postApi, patchApi } from '@/lib/api';

const STRATEGIES: { value: PricingStrategy; label: string; description: string }[] = [
  { value: 'PROFIT_MAXIMIZE', label: '利益最大化', description: '利益率を最大化する価格設定' },
  { value: 'COMPETITIVE', label: '競争力重視', description: '競合より低い価格で競争力を確保' },
  { value: 'MARKET_AVERAGE', label: '市場平均', description: '市場平均価格に合わせる' },
  { value: 'PENETRATION', label: '市場浸透', description: '低価格で市場シェアを獲得' },
  { value: 'PREMIUM', label: 'プレミアム', description: '高品質・高価格路線' },
];

export default function PricingAiPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<PricingStrategy>('PROFIT_MAXIMIZE');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const { data: statsData, isLoading: statsLoading } = usePricingStats();
  const { data: recsData, isLoading: recsLoading, mutate: mutateRecs } = usePriceRecommendations({
    strategy: selectedStrategy,
    marketplace: selectedMarketplace || undefined,
    limit: 50,
  });

  const stats = statsData?.data;
  const recommendations = recsData?.data || [];
  const summary = recsData?.summary;

  const handleApplyPrice = async (rec: PriceRecommendation) => {
    if (applyingIds.has(rec.listingId)) return;

    setApplyingIds((prev) => new Set(prev).add(rec.listingId));

    try {
      await postApi(`/api/pricing-ai/apply/${rec.listingId}`, {
        newPrice: rec.recommendedPrice,
        reason: `AI推奨価格適用 (${selectedStrategy})`,
      });
      setAppliedIds((prev) => new Set(prev).add(rec.listingId));
      mutateRecs();
    } catch (error) {
      console.error('Price apply failed:', error);
      alert('価格適用に失敗しました');
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(rec.listingId);
        return next;
      });
    }
  };

  const handleBulkApply = async () => {
    const toApply = recommendations.filter(
      (r) =>
        !appliedIds.has(r.listingId) &&
        Math.abs(r.currentPrice - r.recommendedPrice) / r.currentPrice > 0.05
    );

    if (toApply.length === 0) {
      alert('適用対象がありません');
      return;
    }

    if (!confirm(`${toApply.length}件の価格を一括適用しますか？`)) return;

    try {
      const result = await postApi<{ success: boolean; data: { success: number; failed: number } }>(
        '/api/pricing-ai/bulk-apply',
        {
          adjustments: toApply.map((r) => ({
            listingId: r.listingId,
            newPrice: r.recommendedPrice,
          })),
        }
      );

      alert(`成功: ${result.data.success}件, 失敗: ${result.data.failed}件`);
      mutateRecs();
    } catch (error) {
      console.error('Bulk apply failed:', error);
      alert('一括適用に失敗しました');
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriceDiffColor = (current: number, recommended: number) => {
    const diff = ((recommended - current) / current) * 100;
    if (diff > 5) return 'text-green-600';
    if (diff < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">価格最適化AI</h1>
          <p className="text-gray-600 mt-1">AIによる価格推奨と自動調整</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">総リスティング</div>
          <div className="text-2xl font-bold text-gray-900">
            {statsLoading ? '-' : stats?.totalListings?.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">調整必要</div>
          <div className="text-2xl font-bold text-orange-600">
            {statsLoading ? '-' : stats?.adjustmentNeeded?.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">平均マージン</div>
          <div className="text-2xl font-bold text-blue-600">
            {statsLoading ? '-' : `${stats?.avgMargin?.toFixed(1) || 0}%`}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">低マージン警告</div>
          <div className="text-2xl font-bold text-red-600">
            {statsLoading ? '-' : stats?.lowMarginCount?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">価格戦略</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STRATEGIES.map((strategy) => (
            <button
              key={strategy.value}
              onClick={() => setSelectedStrategy(strategy.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedStrategy === strategy.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{strategy.label}</div>
              <div className="text-xs text-gray-500 mt-1">{strategy.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select
          value={selectedMarketplace}
          onChange={(e) => setSelectedMarketplace(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">全マーケット</option>
          <option value="JOOM">Joom</option>
          <option value="EBAY">eBay</option>
        </select>

        <button
          onClick={handleBulkApply}
          disabled={recsLoading || recommendations.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          推奨価格を一括適用
        </button>

        {summary && (
          <div className="flex items-center gap-4 text-sm text-gray-600 ml-auto">
            <span>調整必要: <strong className="text-orange-600">{summary.needsAdjustment}件</strong></span>
            <span>現在平均マージン: <strong>{summary.avgCurrentMargin}%</strong></span>
            <span>推奨後マージン: <strong className="text-green-600">{summary.avgRecommendedMargin}%</strong></span>
          </div>
        )}
      </div>

      {/* Recommendations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">現在価格</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">推奨価格</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">価格差</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">現在マージン</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">推奨マージン</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">信頼度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">理由</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">アクション</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recsLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : recommendations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    推奨データがありません
                  </td>
                </tr>
              ) : (
                recommendations.map((rec) => {
                  const priceDiff = rec.recommendedPrice - rec.currentPrice;
                  const priceDiffPercent = (priceDiff / rec.currentPrice) * 100;
                  const isApplied = appliedIds.has(rec.listingId);
                  const isApplying = applyingIds.has(rec.listingId);

                  return (
                    <tr key={rec.listingId} className={isApplied ? 'bg-green-50' : ''}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {rec.listingId.slice(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-500">{rec.productId.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium">${rec.currentPrice.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-blue-600">
                          ${rec.recommendedPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right ${getPriceDiffColor(rec.currentPrice, rec.recommendedPrice)}`}>
                        <span className="text-sm font-medium">
                          {priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)}
                        </span>
                        <div className="text-xs">
                          ({priceDiffPercent >= 0 ? '+' : ''}{priceDiffPercent.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm ${rec.currentMargin < 15 ? 'text-red-600' : 'text-gray-900'}`}>
                          {rec.currentMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-green-600">
                          {rec.recommendedMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(rec.confidence)}`}>
                          {rec.confidence}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600 max-w-xs truncate" title={rec.reason}>
                          {rec.reason}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isApplied ? (
                          <span className="text-green-600 text-sm">適用済</span>
                        ) : (
                          <button
                            onClick={() => handleApplyPrice(rec)}
                            disabled={isApplying || Math.abs(priceDiffPercent) < 1}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {isApplying ? '...' : '適用'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy by Listing Distribution */}
      {stats?.byStrategy && Object.keys(stats.byStrategy).length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">戦略別分布</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.byStrategy).map(([strategy, count]) => (
              <div key={strategy} className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{strategy}:</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
