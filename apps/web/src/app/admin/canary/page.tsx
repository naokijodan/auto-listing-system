'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Rocket,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Package,
  DollarSign,
  RotateCcw,
} from 'lucide-react';

interface CanaryStatus {
  summary: {
    totalListings: number;
    activeListings: number;
    errorListings: number;
    successRate: number;
    totalRevenue: number;
  };
  statusBreakdown: Record<string, number>;
  phaseBreakdown: Record<number, number>;
  recommendations: string[];
  recentListings: Array<{
    id: string;
    productId: string;
    title: string;
    status: string;
    price: number;
    phase: number;
    createdAt: string;
  }>;
  timestamp: string;
}

const PHASE_LIMITS: Record<number, number> = {
  1: 3,
  2: 10,
  3: 25,
  4: 50,
  5: 100,
};

export default function CanaryReleasePage() {
  const [status, setStatus] = useState<CanaryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(1);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/canary/status');
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        // 現在のフェーズを自動選択
        const phases = Object.keys(data.data.phaseBreakdown || {}).map(Number);
        if (phases.length > 0) {
          setSelectedPhase(Math.max(...phases));
        }
      } else {
        setError(data.message || 'Failed to fetch status');
      }
    } catch (err) {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const triggerRelease = async () => {
    if (!confirm(`Phase ${selectedPhase}のカナリアリリースを開始しますか？`)) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/canary/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: selectedPhase }),
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchStatus();
      } else {
        alert(`エラー: ${data.message}`);
      }
    } catch (err) {
      alert('リリースに失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const triggerRollback = async () => {
    if (!confirm('全てのカナリア出品をロールバックしますか？')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/canary/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchStatus();
      } else {
        alert(`エラー: ${data.message}`);
      }
    } catch (err) {
      alert('ロールバックに失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'SOLD':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING_PUBLISH':
      case 'PUBLISHING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'PAUSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthStatus = () => {
    if (!status) return { status: 'unknown', color: 'gray' };
    const { successRate, errorListings } = status.summary;

    if (errorListings > 0 || successRate < 80) {
      return { status: 'critical', color: 'red', icon: XCircle };
    }
    if (successRate < 95) {
      return { status: 'warning', color: 'yellow', icon: AlertTriangle };
    }
    return { status: 'healthy', color: 'green', icon: CheckCircle };
  };

  const health = getHealthStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-200 rounded w-1/4" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-zinc-200 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
              <Rocket className="w-6 h-6 text-orange-500" />
              Canary Release Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Phase 43: 段階的なJoom出品リリース管理
            </p>
          </div>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">総出品数</span>
              <Package className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 mt-2">
              {status?.summary.totalListings || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">アクティブ</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {status?.summary.activeListings || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">成功率</span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {status?.summary.successRate || 100}%
            </p>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">売上</span>
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              ${(status?.summary.totalRevenue || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Health Status */}
        <div className={`bg-${health.color}-50 border border-${health.color}-200 rounded-lg p-4`}>
          <div className="flex items-center gap-2">
            {health.icon && <health.icon className={`w-5 h-5 text-${health.color}-600`} />}
            <span className={`font-medium text-${health.color}-700`}>
              システムステータス: {health.status === 'healthy' ? '正常' : health.status === 'warning' ? '警告' : '異常'}
            </span>
          </div>
          {status?.recommendations && status.recommendations.length > 0 && (
            <ul className="mt-2 text-sm text-zinc-600 list-disc list-inside">
              {status.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">リリースアクション</h2>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600">フェーズ:</label>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(Number(e.target.value))}
                className="border border-zinc-300 rounded-lg px-3 py-2"
              >
                {[1, 2, 3, 4, 5].map((phase) => (
                  <option key={phase} value={phase}>
                    Phase {phase} (最大 {PHASE_LIMITS[phase]}件)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={triggerRelease}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <Rocket className="w-4 h-4" />
              リリース開始
            </button>

            <button
              onClick={triggerRollback}
              disabled={actionLoading || !status?.summary.totalListings}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              ロールバック
            </button>
          </div>

          <div className="mt-4 text-sm text-zinc-500">
            <p>現在のフェーズ別出品数:</p>
            <div className="flex gap-4 mt-2">
              {Object.entries(status?.phaseBreakdown || {}).map(([phase, count]) => (
                <span key={phase} className="bg-zinc-100 px-3 py-1 rounded-full">
                  Phase {phase}: {count}件
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">ステータス別</h2>
            <div className="space-y-2">
              {Object.entries(status?.statusBreakdown || {}).map(([statusValue, count]) => (
                <div key={statusValue} className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(statusValue)}`}>
                    {statusValue}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-zinc-200 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">フェーズ進捗</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((phase) => {
                const count = status?.phaseBreakdown?.[phase] || 0;
                const limit = PHASE_LIMITS[phase];
                const progress = (count / limit) * 100;

                return (
                  <div key={phase}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Phase {phase}</span>
                      <span>
                        {count} / {limit}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          progress >= 100 ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">最近のカナリア出品</h2>
          {status?.recentListings && status.recentListings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-sm text-zinc-500">
                    <th className="pb-2">商品名</th>
                    <th className="pb-2">Phase</th>
                    <th className="pb-2">ステータス</th>
                    <th className="pb-2">価格</th>
                    <th className="pb-2">日時</th>
                  </tr>
                </thead>
                <tbody>
                  {status.recentListings.map((listing) => (
                    <tr key={listing.id} className="border-b border-zinc-100">
                      <td className="py-3 text-sm">
                        {listing.title?.slice(0, 40) || 'Unknown'}...
                      </td>
                      <td className="py-3">
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm">
                          Phase {listing.phase}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(listing.status)}`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm">${listing.price?.toFixed(2) || '0.00'}</td>
                      <td className="py-3 text-sm text-zinc-500">
                        {new Date(listing.createdAt).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-4">
              カナリア出品はまだありません。「リリース開始」でPhase 1を開始してください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
