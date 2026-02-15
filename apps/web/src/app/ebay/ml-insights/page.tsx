'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, putApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Package,
  Users,
  Sparkles,
  Play,
  Target,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  Eye,
} from 'lucide-react';

type Tab = 'predictions' | 'segments' | 'anomalies' | 'trends' | 'models';

export default function MlInsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('predictions');
  const [predictionPeriod, setPredictionPeriod] = useState('30');

  // データ取得
  const { data: salesPredictions } = useSWR(`/api/ebay-ml-insights/predictions/sales?period=${predictionPeriod}`, fetcher);
  const { data: demandPredictions } = useSWR('/api/ebay-ml-insights/predictions/demand', fetcher);
  const { data: pricingData } = useSWR('/api/ebay-ml-insights/predictions/pricing', fetcher);
  const { data: segmentsData } = useSWR('/api/ebay-ml-insights/segments/customers', fetcher);
  const { data: anomaliesData, mutate: mutateAnomalies } = useSWR('/api/ebay-ml-insights/anomalies', fetcher);
  const { data: trendsData } = useSWR('/api/ebay-ml-insights/trends', fetcher);
  const { data: modelsData, mutate: mutateModels } = useSWR('/api/ebay-ml-insights/models', fetcher);
  const { data: summaryData } = useSWR('/api/ebay-ml-insights/summary', fetcher);

  const predictions = salesPredictions?.predictions ?? [];
  const demandList = demandPredictions?.predictions ?? [];
  const pricingRecs = pricingData?.recommendations ?? [];
  const segments = segmentsData?.segments ?? [];
  const anomalies = anomaliesData?.anomalies ?? [];
  const trends = trendsData?.trends ?? [];
  const models = modelsData?.models ?? [];
  const summary = summaryData ?? { kpis: {}, topInsights: [], modelHealth: {} };

  const handleUpdateAnomalyStatus = async (anomalyId: string, status: string) => {
    try {
      await putApi(`/api/ebay-ml-insights/anomalies/${anomalyId}/status`, { status });
      addToast({ type: 'success', message: 'ステータスを更新しました' });
      mutateAnomalies();
    } catch {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  };

  const handleRetrainModel = async (modelId: string) => {
    try {
      await postApi(`/api/ebay-ml-insights/models/${modelId}/retrain`, {});
      addToast({ type: 'success', message: 'モデルの再トレーニングをキューに追加しました' });
      mutateModels();
    } catch {
      addToast({ type: 'error', message: '再トレーニングの開始に失敗しました' });
    }
  };

  const handleOptimizePricing = async () => {
    try {
      await postApi('/api/ebay-ml-insights/predictions/pricing/optimize', {
        productIds: pricingRecs.map((r: any) => r.productId),
        strategy: 'MAXIMIZE_REVENUE',
      });
      addToast({ type: 'success', message: '価格最適化ジョブを開始しました' });
    } catch {
      addToast({ type: 'error', message: '価格最適化に失敗しました' });
    }
  };

  const tabs = [
    { id: 'predictions', label: '予測', icon: TrendingUp },
    { id: 'segments', label: '顧客セグメント', icon: Users },
    { id: 'anomalies', label: '異常検知', icon: AlertTriangle },
    { id: 'trends', label: 'トレンド', icon: Sparkles },
    { id: 'models', label: 'モデル管理', icon: Brain },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">機械学習インサイト</h1>
            <p className="text-sm text-zinc-500">モデル精度: {(summary.modelHealth.avgAccuracy * 100).toFixed(0) ?? 0}%</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => mutateModels()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">30日予測売上</p>
              <p className="text-2xl font-bold text-pink-600">${(summary.kpis.predictedRevenue30d ?? 0).toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-pink-500" />
          </div>
          {summary.kpis.revenueGrowth > 0 && (
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              +{summary.kpis.revenueGrowth}% 前月比
            </p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">需要予測精度</p>
              <p className="text-2xl font-bold text-blue-600">{summary.kpis.demandAccuracy ?? 0}%</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">検出された異常</p>
              <p className="text-2xl font-bold text-amber-600">{summary.kpis.anomaliesDetected ?? 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">アクティブモデル</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.modelHealth.active ?? 0}/{summary.modelHealth.total ?? 0}</p>
            </div>
            <Brain className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
      </div>

      {/* トップインサイト */}
      {summary.topInsights?.length > 0 && (
        <Card className="mb-4 p-3">
          <div className="flex items-center gap-3 overflow-x-auto">
            <Zap className="h-5 w-5 text-amber-500 flex-shrink-0" />
            {summary.topInsights.map((insight: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  insight.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                  insight.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}
              >
                {insight.type === 'OPPORTUNITY' && <Sparkles className="h-4 w-4" />}
                {insight.type === 'WARNING' && <AlertTriangle className="h-4 w-4" />}
                {insight.message}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* タブ */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            {/* 売上予測 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-zinc-900 dark:text-white">売上予測</h3>
                <select
                  value={predictionPeriod}
                  onChange={(e) => setPredictionPeriod(e.target.value)}
                  className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                >
                  <option value="7">7日間</option>
                  <option value="14">14日間</option>
                  <option value="30">30日間</option>
                  <option value="90">90日間</option>
                </select>
              </div>
              <Card className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {predictions.slice(0, 7).map((pred: any) => (
                    <div key={pred.date} className="text-center">
                      <p className="text-xs text-zinc-400">{new Date(pred.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-white">${pred.predicted.toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">${pred.lowerBound.toLocaleString()} - ${pred.upperBound.toLocaleString()}</p>
                      <div className="mt-1 h-1 w-full bg-zinc-100 rounded">
                        <div
                          className="h-1 bg-pink-500 rounded"
                          style={{ width: `${pred.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {salesPredictions?.accuracy && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">MAPE:</span>
                      <span className="ml-2 font-medium">{salesPredictions.accuracy.mape}%</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">R²:</span>
                      <span className="ml-2 font-medium">{salesPredictions.accuracy.r2}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">モデル:</span>
                      <span className="ml-2 font-medium">{salesPredictions.model}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* 需要予測 */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">在庫需要予測</h3>
              <div className="space-y-2">
                {demandList.map((item: any) => (
                  <Card key={item.productId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          item.daysUntilStockout <= 7 ? 'bg-red-100' :
                          item.daysUntilStockout <= 14 ? 'bg-amber-100' : 'bg-emerald-100'
                        }`}>
                          <Package className={`h-5 w-5 ${
                            item.daysUntilStockout <= 7 ? 'text-red-600' :
                            item.daysUntilStockout <= 14 ? 'text-amber-600' : 'text-emerald-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-zinc-900 dark:text-white">{item.productName}</h4>
                          <p className="text-xs text-zinc-500">
                            現在庫: {item.currentStock} • 予測需要: {item.predictedDemand} • 在庫切れまで: {item.daysUntilStockout}日
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">推奨発注: {item.recommendedReorder}</p>
                        <p className="text-xs text-zinc-400">信頼度: {(item.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 価格最適化 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-zinc-900 dark:text-white">価格最適化提案</h3>
                <Button variant="primary" size="sm" onClick={handleOptimizePricing}>
                  <DollarSign className="h-4 w-4 mr-1" />
                  一括最適化
                </Button>
              </div>
              <div className="space-y-2">
                {pricingRecs.map((rec: any) => (
                  <Card key={rec.productId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">{rec.productName}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="text-zinc-500">現在: ${rec.currentPrice}</span>
                          <span className="text-emerald-600 font-medium">推奨: ${rec.optimalPrice}</span>
                          <span className={`${rec.expectedRevenue.increase > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {rec.expectedRevenue.increase > 0 ? '+' : ''}{rec.expectedRevenue.increase}% 収益増
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        適用
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="grid grid-cols-2 gap-4">
            {segments.map((segment: any) => (
              <Card key={segment.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-white">{segment.name}</h3>
                      <p className="text-xs text-zinc-500">{segment.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{segment.size.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">{segment.percentage}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div className="p-2 bg-zinc-50 rounded">
                    <span className="text-zinc-500">平均注文額</span>
                    <p className="font-medium">${segment.characteristics.avgOrderValue}</p>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded">
                    <span className="text-zinc-500">購入頻度</span>
                    <p className="font-medium">{segment.characteristics.orderFrequency}回/月</p>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded">
                    <span className="text-zinc-500">LTV</span>
                    <p className="font-medium">${segment.characteristics.ltv}</p>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded">
                    <span className="text-zinc-500">好みカテゴリ</span>
                    <p className="font-medium text-xs">{segment.characteristics.preferredCategories.join(', ')}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100">
                  <p className="text-xs text-zinc-500 mb-2">推奨アクション:</p>
                  <div className="flex flex-wrap gap-1">
                    {segment.recommendations.map((rec: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="space-y-2">
            {anomalies.map((anomaly: any) => (
              <Card key={anomaly.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      anomaly.severity === 'HIGH' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        anomaly.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{anomaly.description}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          anomaly.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {anomaly.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          anomaly.status === 'OPEN' ? 'bg-zinc-100 text-zinc-700' :
                          anomaly.status === 'INVESTIGATING' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {anomaly.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        期待値: {anomaly.expected} → 実績: {anomaly.actual} ({anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%)
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        検出: {new Date(anomaly.detectedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={anomaly.status}
                      onChange={(e) => handleUpdateAnomalyStatus(anomaly.id, e.target.value)}
                      className="h-8 rounded border border-zinc-200 bg-white px-2 text-xs"
                    >
                      <option value="OPEN">未対応</option>
                      <option value="INVESTIGATING">調査中</option>
                      <option value="RESOLVED">解決済</option>
                      <option value="FALSE_POSITIVE">誤検知</option>
                    </select>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {anomaly.possibleCauses && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <p className="text-xs text-zinc-500 mb-1">考えられる原因:</p>
                    <div className="flex gap-1">
                      {anomaly.possibleCauses.map((cause: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">
                          {cause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-4">
            {trends.map((trend: any) => (
              <Card key={trend.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    trend.direction === 'UP' ? 'bg-emerald-100' :
                    trend.direction === 'DOWN' ? 'bg-red-100' : 'bg-zinc-100'
                  }`}>
                    {trend.direction === 'UP' ? (
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    ) : trend.direction === 'DOWN' ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <BarChart3 className="h-5 w-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-zinc-900 dark:text-white">{trend.name}</h3>
                      <span className="px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600">{trend.category}</span>
                    </div>
                    <p className="text-sm text-zinc-500">{trend.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{(trend.strength * 100).toFixed(0)}%</p>
                    <p className="text-xs text-zinc-400">強度</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {trend.keywords.map((keyword: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      {keyword}
                    </span>
                  ))}
                </div>

                <div className="pt-3 border-t border-zinc-100">
                  <p className="text-xs text-zinc-500 mb-2">推奨アクション:</p>
                  <div className="flex flex-wrap gap-1">
                    {trend.actionItems.map((action: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'models' && (
          <div className="space-y-2">
            {models.map((model: any) => (
              <Card key={model.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-pink-100 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{model.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          model.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {model.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        アルゴリズム: {model.algorithm} v{model.version} • タイプ: {model.type}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        最終トレーニング: {new Date(model.trainedAt).toLocaleString('ja-JP')}
                        {model.nextTraining && ` • 次回: ${new Date(model.nextTraining).toLocaleDateString('ja-JP')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {model.accuracy.mape ? `MAPE: ${model.accuracy.mape}%` :
                         model.accuracy.r2 ? `R²: ${model.accuracy.r2}` :
                         model.accuracy.silhouette ? `Silhouette: ${model.accuracy.silhouette}` :
                         model.accuracy.precision ? `F1: ${((2 * model.accuracy.precision * model.accuracy.recall) / (model.accuracy.precision + model.accuracy.recall)).toFixed(2)}` : '-'}
                      </p>
                      <p className="text-xs text-zinc-400">精度</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRetrainModel(model.id)}>
                      <Play className="h-4 w-4 mr-1" />
                      再トレーニング
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
