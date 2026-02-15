'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  Target,
  TrendingUp,
  Wrench,
  Settings,
  RefreshCw,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Zap,
  FileText,
  Award,
  Eye,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type TabType = 'dashboard' | 'scores' | 'issues' | 'benchmarks' | 'checks' | 'trends';

export default function ListingQualityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

  const { data: stats } = useSWR(`${API_BASE}/ebay-listing-quality/stats`, fetcher);
  const { data: scoresData } = useSWR(`${API_BASE}/ebay-listing-quality/scores?limit=20`, fetcher);
  const { data: issuesData } = useSWR(`${API_BASE}/ebay-listing-quality/issues?limit=30`, fetcher);
  const { data: benchmarksData } = useSWR(`${API_BASE}/ebay-listing-quality/benchmarks`, fetcher);
  const { data: checksData } = useSWR(`${API_BASE}/ebay-listing-quality/checks`, fetcher);
  const { data: trendsData } = useSWR(`${API_BASE}/ebay-listing-quality/trends?days=7`, fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'scores' as TabType, label: '品質スコア', icon: Target },
    { id: 'issues' as TabType, label: '問題一覧', icon: AlertTriangle },
    { id: 'benchmarks' as TabType, label: 'ベンチマーク', icon: Award },
    { id: 'checks' as TabType, label: 'チェック設定', icon: Settings },
    { id: 'trends' as TabType, label: 'トレンド', icon: TrendingUp },
  ];

  const getQualityColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDimensionLabel = (dimension: string) => {
    const labels: Record<string, string> = {
      completeness: '完全性',
      accuracy: '正確性',
      presentation: '表示品質',
      pricing: '価格設定',
      shipping: '配送',
      trust: '信頼性',
      compliance: 'コンプライアンス'
    };
    return labels[dimension] || dimension;
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">評価済み出品</p>
              <p className="text-2xl font-bold">{stats?.evaluatedListings?.toLocaleString() || '-'}</p>
            </div>
            <Eye className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">全{stats?.totalListings?.toLocaleString()}件中</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均品質スコア</p>
              <p className="text-2xl font-bold">{stats?.averageScore || '-'}</p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">100点満点</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">自動修正可能</p>
              <p className="text-2xl font-bold">{stats?.autoFixableIssues || '-'}</p>
            </div>
            <Wrench className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">ワンクリックで修正</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Good以上</p>
              <p className="text-2xl font-bold">
                {stats?.scoreDistribution
                  ? stats.scoreDistribution.excellent.count + stats.scoreDistribution.good.count
                  : '-'}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats?.scoreDistribution
              ? `${stats.scoreDistribution.excellent.percentage + stats.scoreDistribution.good.percentage}%`
              : '-'}
          </p>
        </div>
      </div>

      {/* スコア分布 & ディメンション平均 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* スコア分布 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">品質スコア分布</h3>
          <div className="space-y-3">
            {stats?.scoreDistribution && Object.entries(stats.scoreDistribution).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-24 text-sm capitalize">{key}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      key === 'excellent' ? 'bg-green-500' :
                      key === 'good' ? 'bg-blue-500' :
                      key === 'fair' ? 'bg-yellow-500' :
                      key === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${value.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm">{value.count}</div>
                <div className="w-12 text-right text-sm text-gray-500">{value.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* ディメンション平均 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">ディメンション別平均スコア</h3>
          <div className="space-y-3">
            {stats?.dimensionAverages?.map((dim: any) => (
              <div key={dim.dimension} className="flex items-center gap-3">
                <div className="w-32 text-sm">{getDimensionLabel(dim.dimension)}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      dim.avg >= 80 ? 'bg-green-500' :
                      dim.avg >= 60 ? 'bg-blue-500' :
                      dim.avg >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${dim.avg}%` }}
                  />
                </div>
                <div className={`w-12 text-right text-sm font-medium ${getScoreColor(dim.avg)}`}>
                  {dim.avg.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* よくある問題 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">よくある問題 Top 5</h3>
        <div className="space-y-3">
          {stats?.topIssues?.map((issue: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                <div>
                  <p className="font-medium">{issue.issue}</p>
                  <p className="text-sm text-gray-500">
                    {getDimensionLabel(issue.dimension)} | {issue.count}件
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(issue.severity)}`}>
                {issue.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderScores = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">品質スコア一覧</h3>
        <div className="flex gap-2">
          <select className="border rounded px-3 py-2 text-sm">
            <option value="">すべてのレベル</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="critical">Critical</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            全件再評価
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">出品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スコア</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ディメンション</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">問題数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">改善効果</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scoresData?.scores?.map((score: any) => (
              <tr key={score.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{score.listingTitle}</div>
                  <div className="text-xs text-gray-500">{score.listingId}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(score.overallScore)}`}>
                      {score.overallScore}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getQualityColor(score.qualityLevel)}`}>
                      {score.qualityLevel}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {score.dimensionScores?.slice(0, 4).map((dim: any) => (
                      <span
                        key={dim.dimension}
                        className={`px-2 py-0.5 rounded text-xs ${
                          dim.score >= 80 ? 'bg-green-100 text-green-700' :
                          dim.score >= 60 ? 'bg-blue-100 text-blue-700' :
                          dim.score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}
                        title={getDimensionLabel(dim.dimension)}
                      >
                        {getDimensionLabel(dim.dimension).substring(0, 2)} {dim.score}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm">{score.issues?.length || 0}件</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col text-xs">
                    <span className="text-green-600">視認性 +{score.estimatedImpact?.visibility}%</span>
                    <span className="text-blue-600">CVR +{score.estimatedImpact?.conversion}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedListing(score.listingId)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    詳細 <ChevronRight className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderIssues = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">問題一覧</h3>
        <div className="flex gap-2">
          <select className="border rounded px-3 py-2 text-sm">
            <option value="">すべての重要度</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="border rounded px-3 py-2 text-sm">
            <option value="">すべてのディメンション</option>
            <option value="completeness">完全性</option>
            <option value="accuracy">正確性</option>
            <option value="presentation">表示品質</option>
            <option value="pricing">価格設定</option>
            <option value="shipping">配送</option>
            <option value="trust">信頼性</option>
            <option value="compliance">コンプライアンス</option>
          </select>
          <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            一括自動修正
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {issuesData?.issues?.map((issue: any) => (
          <div key={issue.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3">
                {issue.severity === 'critical' ? (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                ) : issue.severity === 'high' ? (
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                )}
                <div>
                  <h4 className="font-medium">{issue.title}</h4>
                  <p className="text-sm text-gray-500">{issue.listingTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(issue.severity)}`}>
                  {issue.severity}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {getDimensionLabel(issue.dimension)}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{issue.description}</p>

            {(issue.currentValue || issue.expectedValue) && (
              <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                {issue.currentValue && (
                  <div>
                    <span className="text-gray-500">現在の値: </span>
                    <span className="text-red-600">{issue.currentValue}</span>
                  </div>
                )}
                {issue.expectedValue && (
                  <div>
                    <span className="text-gray-500">期待値: </span>
                    <span className="text-green-600">{issue.expectedValue}</span>
                  </div>
                )}
              </div>
            )}

            {issue.fixAction && (
              <div className="flex items-center justify-between pt-3 border-t">
                <p className="text-sm text-gray-500">修正方法: {issue.fixAction}</p>
                {issue.autoFixable ? (
                  <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    自動修正
                  </button>
                ) : (
                  <button className="px-3 py-1 border text-gray-600 rounded hover:bg-gray-50 text-sm">
                    手動で修正
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderBenchmarks = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">ベンチマーク比較</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {benchmarksData?.benchmarks?.map((benchmark: any) => (
          <div key={benchmark.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-medium">{benchmark.name}</h4>
                <span className="text-xs text-gray-500 capitalize">{benchmark.type}</span>
              </div>
              <Award className="h-6 w-6 text-yellow-500" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-blue-600">{benchmark.metrics.avgScore}</p>
                <p className="text-xs text-gray-500">平均スコア</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-2xl font-bold text-green-600">{benchmark.metrics.topQuartile}</p>
                <p className="text-xs text-gray-500">上位25%</p>
              </div>
            </div>

            <div className="space-y-2">
              {benchmark.dimensionBenchmarks?.slice(0, 5).map((dim: any) => (
                <div key={dim.dimension} className="flex items-center gap-2 text-sm">
                  <span className="w-24 text-gray-600">{getDimensionLabel(dim.dimension)}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${dim.avg}%` }}
                    />
                  </div>
                  <span className="w-8 text-right">{dim.avg}</span>
                  <span className="w-12 text-right text-green-600 text-xs">Top {dim.top10}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-4">
              サンプルサイズ: {benchmark.metrics.sampleSize.toLocaleString()}件
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderChecks = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">品質チェック設定</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + 新規チェック
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">有効</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">チェック名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ディメンション</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">条件</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">重み</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">自動修正</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {checksData?.checks?.map((check: any) => (
              <tr key={check.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={check.enabled}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{check.name}</div>
                  <div className="text-xs text-gray-500">{check.description}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {getDimensionLabel(check.dimension)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{check.condition}</code>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${check.weight}%` }}
                      />
                    </div>
                    <span className="text-sm">{check.weight}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {check.autoFix?.available ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-300" />
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
                    <button className="text-red-600 hover:text-red-800 text-sm">削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">品質トレンド</h3>
        <select className="border rounded px-3 py-2 text-sm">
          <option value="7">過去7日間</option>
          <option value="14">過去14日間</option>
          <option value="30">過去30日間</option>
        </select>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">スコア変動</p>
          <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
            <ArrowUp className="h-5 w-5" />
            +{trendsData?.summary?.scoreChange}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">改善した出品</p>
          <p className="text-2xl font-bold text-blue-600">{trendsData?.summary?.totalImproved}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">悪化した出品</p>
          <p className="text-2xl font-bold text-red-600">{trendsData?.summary?.totalDeclined}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">日平均改善</p>
          <p className="text-2xl font-bold">{trendsData?.summary?.avgDailyImprovement}</p>
        </div>
      </div>

      {/* トレンドテーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日付</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">平均スコア</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">改善</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">悪化</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">主な問題</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trendsData?.trends?.map((trend: any) => (
              <tr key={trend.date} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{trend.date}</td>
                <td className="px-6 py-4">
                  <span className={`text-lg font-bold ${getScoreColor(trend.avgScore)}`}>
                    {trend.avgScore}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-green-600 flex items-center gap-1">
                    <ArrowUp className="h-4 w-4" />
                    {trend.listingsImproved}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-red-600 flex items-center gap-1">
                    <ArrowDown className="h-4 w-4" />
                    {trend.listingsDeclined}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {trend.topIssues?.map((issue: any, i: number) => (
                    <span key={i} className="text-sm text-gray-600">
                      {issue.issue} ({issue.count})
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'scores': return renderScores();
      case 'issues': return renderIssues();
      case 'benchmarks': return renderBenchmarks();
      case 'checks': return renderChecks();
      case 'trends': return renderTrends();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Listing Quality</h1>
              <p className="text-sm text-gray-500">出品品質スコア・ベンチマーク分析</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                レポート
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                一括自動修正
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
