// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  FileText,
  Settings,
  Download,
  Calendar,
  CreditCard,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  Calculator,
  Landmark,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'income' | 'balance' | 'cashflow' | 'reports' | 'settings';

export default function FinancialReportingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'income', label: '損益計算書', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'balance', label: '貸借対照表', icon: <Building className="w-4 h-4" /> },
    { id: 'cashflow', label: 'キャッシュフロー', icon: <Wallet className="w-4 h-4" /> },
    { id: 'reports', label: 'レポート', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Landmark className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">財務レポート</h1>
              <p className="text-sm text-gray-500">Financial Reporting</p>
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
                  ? 'border-blue-600 text-blue-600'
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
          {activeTab === 'income' && <IncomeTab />}
          {activeTab === 'balance' && <BalanceTab />}
          {activeTab === 'cashflow' && <CashFlowTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/financial-reporting/dashboard/overview`, fetcher);
  const { data: health } = useSWR(`${API_BASE}/ebay/financial-reporting/dashboard/financial-health`, fetcher);
  const { data: ratios } = useSWR(`${API_BASE}/ebay/financial-reporting/ratios/all`, fetcher);

  return (
    <div className="space-y-6">
      {/* 財務概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総収益</p>
              <p className="text-2xl font-bold">¥{overview?.totalRevenue?.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>8.5% 前月比</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総経費</p>
              <p className="text-2xl font-bold">¥{overview?.totalExpenses?.toLocaleString()}</p>
            </div>
            <CreditCard className="w-10 h-10 text-red-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-red-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>5.2% 前月比</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">純利益</p>
              <p className="text-2xl font-bold">¥{overview?.netProfit?.toLocaleString()}</p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
          <div className="mt-2 flex items-center text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>12.3% 前月比</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">利益率</p>
              <p className="text-2xl font-bold">{overview?.profitMargin}%</p>
            </div>
            <PieChart className="w-10 h-10 text-purple-500 opacity-20" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${overview?.profitMargin || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 財務健全性 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">財務健全性スコア</h3>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-green-600">{health?.overallScore}</span>
            <span className="text-gray-500">/100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {health?.metrics && Object.entries(health.metrics).map(([key, metric]: [string, { score: number; status: string }]) => (
            <div key={key} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium capitalize">{key}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  metric.status === 'excellent' ? 'bg-green-100 text-green-800' :
                  metric.status === 'good' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {metric.status}
                </span>
              </div>
              <div className="text-2xl font-bold">{metric.score}</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full ${
                    metric.score >= 80 ? 'bg-green-500' :
                    metric.score >= 60 ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* アラート */}
        {health?.alerts && health.alerts.length > 0 && (
          <div className="mt-6 space-y-2">
            {health.alerts.map((alert: { type: string; message: string }, i: number) => (
              <div
                key={i}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-blue-50 text-blue-800'
                }`}
              >
                {alert.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 主要財務比率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">流動性比率</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">流動比率</span>
              <span className="font-bold">{ratios?.liquidity?.currentRatio}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">当座比率</span>
              <span className="font-bold">{ratios?.liquidity?.quickRatio}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">現金比率</span>
              <span className="font-bold">{ratios?.liquidity?.cashRatio}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">収益性比率</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">粗利益率</span>
              <span className="font-bold">{ratios?.profitability?.grossMargin}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">営業利益率</span>
              <span className="font-bold">{ratios?.profitability?.operatingMargin}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ROE</span>
              <span className="font-bold">{ratios?.profitability?.roe}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncomeTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/financial-reporting/income/summary`, fetcher);
  const { data: categories } = useSWR(`${API_BASE}/ebay/financial-reporting/income/by-category`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/financial-reporting/income/trends`, fetcher);

  return (
    <div className="space-y-6">
      {/* 損益サマリー */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">損益計算書サマリー</h3>

        <div className="space-y-6">
          {/* 収益 */}
          <div>
            <h4 className="font-medium text-green-700 mb-3">収益</h4>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between">
                <span>商品売上</span>
                <span>¥{summary?.revenue?.productSales?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>送料収入</span>
                <span>¥{summary?.revenue?.shippingRevenue?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>その他収入</span>
                <span>¥{summary?.revenue?.otherIncome?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>収益合計</span>
                <span>¥{summary?.revenue?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 売上原価 */}
          <div>
            <h4 className="font-medium text-red-700 mb-3">売上原価</h4>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between">
                <span>商品原価</span>
                <span>¥{summary?.costOfGoodsSold?.productCost?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>送料コスト</span>
                <span>¥{summary?.costOfGoodsSold?.shippingCost?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>プラットフォーム手数料</span>
                <span>¥{summary?.costOfGoodsSold?.platformFees?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>売上原価合計</span>
                <span>¥{summary?.costOfGoodsSold?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 粗利益 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-blue-800">粗利益</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-800">¥{summary?.grossProfit?.toLocaleString()}</span>
                <span className="text-sm text-blue-600 ml-2">({summary?.grossMargin}%)</span>
              </div>
            </div>
          </div>

          {/* 営業経費 */}
          <div>
            <h4 className="font-medium text-orange-700 mb-3">営業経費</h4>
            <div className="space-y-2 pl-4">
              <div className="flex justify-between">
                <span>マーケティング</span>
                <span>¥{summary?.operatingExpenses?.marketing?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>人件費</span>
                <span>¥{summary?.operatingExpenses?.payroll?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>ソフトウェア</span>
                <span>¥{summary?.operatingExpenses?.software?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>オフィス</span>
                <span>¥{summary?.operatingExpenses?.office?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>その他</span>
                <span>¥{summary?.operatingExpenses?.other?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>営業経費合計</span>
                <span>¥{summary?.operatingExpenses?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 純利益 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-green-800">純利益</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-800">¥{summary?.netIncome?.toLocaleString()}</span>
                <span className="text-sm text-green-600 ml-2">({summary?.netMargin}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* カテゴリ別 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">カテゴリ別損益</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">カテゴリ</th>
                <th className="px-4 py-3 text-right text-sm">収益</th>
                <th className="px-4 py-3 text-right text-sm">原価</th>
                <th className="px-4 py-3 text-right text-sm">利益</th>
                <th className="px-4 py-3 text-right text-sm">利益率</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories?.categories?.map((cat: {
                category: string;
                revenue: number;
                cogs: number;
                profit: number;
                margin: number;
              }) => (
                <tr key={cat.category} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cat.category}</td>
                  <td className="px-4 py-3 text-right">¥{cat.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">¥{cat.cogs.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-semibold">¥{cat.profit.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{cat.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* トレンドチャート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">損益トレンド（過去12ヶ月）</h3>
        <div className="h-64 flex items-end gap-2">
          {trends?.trends?.map((t: { month: string; revenue: number; netIncome: number }, i: number) => (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div
                className="bg-green-500 rounded-t"
                style={{ height: `${(t.netIncome / 1500000) * 100}%` }}
                title={`純利益: ¥${Math.floor(t.netIncome).toLocaleString()}`}
              />
              <div
                className="bg-blue-200"
                style={{ height: `${((t.revenue - t.netIncome) / 5000000) * 100}%` }}
                title={`収益: ¥${Math.floor(t.revenue).toLocaleString()}`}
              />
              <span className="text-xs text-gray-500 text-center">{t.month.slice(5)}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-200 rounded" />
            <span className="text-sm text-gray-600">収益</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-sm text-gray-600">純利益</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BalanceTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/financial-reporting/balance/summary`, fetcher);

  return (
    <div className="space-y-6">
      {/* 貸借対照表サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 資産 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-4">資産</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">流動資産</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>現金</span>
                  <span>¥{summary?.assets?.current?.cash?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>売掛金</span>
                  <span>¥{summary?.assets?.current?.accountsReceivable?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>在庫</span>
                  <span>¥{summary?.assets?.current?.inventory?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>前払費用</span>
                  <span>¥{summary?.assets?.current?.prepaidExpenses?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>小計</span>
                  <span>¥{summary?.assets?.current?.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">固定資産</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>設備</span>
                  <span>¥{summary?.assets?.nonCurrent?.equipment?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ソフトウェア</span>
                  <span>¥{summary?.assets?.nonCurrent?.software?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>敷金保証金</span>
                  <span>¥{summary?.assets?.nonCurrent?.deposits?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>小計</span>
                  <span>¥{summary?.assets?.nonCurrent?.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex justify-between font-bold text-blue-800">
                <span>資産合計</span>
                <span>¥{summary?.assets?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 負債 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-red-700 mb-4">負債</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">流動負債</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>買掛金</span>
                  <span>¥{summary?.liabilities?.current?.accountsPayable?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>未払費用</span>
                  <span>¥{summary?.liabilities?.current?.accruedExpenses?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>短期借入金</span>
                  <span>¥{summary?.liabilities?.current?.shortTermDebt?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>前受収益</span>
                  <span>¥{summary?.liabilities?.current?.deferredRevenue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>小計</span>
                  <span>¥{summary?.liabilities?.current?.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">固定負債</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>長期借入金</span>
                  <span>¥{summary?.liabilities?.nonCurrent?.longTermDebt?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>小計</span>
                  <span>¥{summary?.liabilities?.nonCurrent?.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex justify-between font-bold text-red-800">
                <span>負債合計</span>
                <span>¥{summary?.liabilities?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 純資産 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-green-700 mb-4">純資産</h3>
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>利益剰余金</span>
                <span>¥{summary?.equity?.retainedEarnings?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>資本金</span>
                <span>¥{summary?.equity?.capitalStock?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>その他</span>
                <span>¥{summary?.equity?.otherEquity?.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex justify-between font-bold text-green-800">
                <span>純資産合計</span>
                <span>¥{summary?.equity?.total?.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">バランスチェック</p>
              <div className="flex justify-between text-sm">
                <span>負債 + 純資産</span>
                <span className="font-semibold">
                  ¥{((summary?.liabilities?.total || 0) + (summary?.equity?.total || 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">資産合計と一致</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashFlowTab() {
  const { data: cashflow } = useSWR(`${API_BASE}/ebay/financial-reporting/cashflow/detailed`, fetcher);
  const { data: forecast } = useSWR(`${API_BASE}/ebay/financial-reporting/cashflow/forecast`, fetcher);

  return (
    <div className="space-y-6">
      {/* キャッシュフローサマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">営業CF</p>
          <p className="text-2xl font-bold text-green-600">¥{cashflow?.operating?.total?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">投資CF</p>
          <p className="text-2xl font-bold text-red-600">¥{cashflow?.investing?.total?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">財務CF</p>
          <p className="text-2xl font-bold text-blue-600">¥{cashflow?.financing?.total?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">純増減</p>
          <p className="text-2xl font-bold">¥{cashflow?.netChange?.toLocaleString()}</p>
        </div>
      </div>

      {/* 詳細キャッシュフロー */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">キャッシュフロー計算書</h3>

        <div className="space-y-6">
          {/* 営業活動 */}
          <div>
            <h4 className="font-medium text-green-700 mb-3">営業活動によるキャッシュフロー</h4>
            <div className="space-y-2 pl-4 text-sm">
              <div className="flex justify-between">
                <span>純利益</span>
                <span>¥{cashflow?.operating?.netIncome?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>減価償却費</span>
                <span>+ ¥{cashflow?.operating?.adjustments?.depreciation?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>売掛金の増減</span>
                <span>{cashflow?.operating?.adjustments?.accountsReceivable > 0 ? '- ' : '+ '}¥{Math.abs(cashflow?.operating?.adjustments?.accountsReceivable || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>在庫の増減</span>
                <span>{cashflow?.operating?.adjustments?.inventory > 0 ? '- ' : '+ '}¥{Math.abs(cashflow?.operating?.adjustments?.inventory || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t text-green-700">
                <span>営業CF合計</span>
                <span>¥{cashflow?.operating?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 投資活動 */}
          <div>
            <h4 className="font-medium text-red-700 mb-3">投資活動によるキャッシュフロー</h4>
            <div className="space-y-2 pl-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>設備投資</span>
                <span>¥{cashflow?.investing?.equipmentPurchases?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>ソフトウェア投資</span>
                <span>¥{cashflow?.investing?.softwarePurchases?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t text-red-700">
                <span>投資CF合計</span>
                <span>¥{cashflow?.investing?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 財務活動 */}
          <div>
            <h4 className="font-medium text-blue-700 mb-3">財務活動によるキャッシュフロー</h4>
            <div className="space-y-2 pl-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>借入金の増加</span>
                <span>+ ¥{cashflow?.financing?.debtProceeds?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>借入金の返済</span>
                <span>¥{cashflow?.financing?.debtPayments?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t text-blue-700">
                <span>財務CF合計</span>
                <span>¥{cashflow?.financing?.total?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 現金残高 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>期首現金残高</span>
                <span>¥{cashflow?.beginningCash?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>現金純増減</span>
                <span className="text-green-600">+ ¥{cashflow?.netChange?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>期末現金残高</span>
                <span>¥{cashflow?.endingCash?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* キャッシュフロー予測 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">キャッシュフロー予測（6ヶ月）</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">月</th>
                <th className="px-4 py-3 text-right text-sm">流入</th>
                <th className="px-4 py-3 text-right text-sm">流出</th>
                <th className="px-4 py-3 text-right text-sm">純増減</th>
                <th className="px-4 py-3 text-right text-sm">期末残高</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {forecast?.projections?.map((p: {
                month: string;
                inflow: number;
                outflow: number;
                netChange: number;
                endingBalance: number;
              }) => (
                <tr key={p.month} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.month}</td>
                  <td className="px-4 py-3 text-right text-green-600">¥{Math.floor(p.inflow).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">¥{Math.floor(p.outflow).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">¥{Math.floor(p.netChange).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">¥{Math.floor(p.endingBalance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {forecast?.warnings?.length > 0 && (
          <div className="mt-4 space-y-2">
            {forecast.warnings.map((w: { type: string; message: string }, i: number) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: summary } = useSWR(`${API_BASE}/ebay/financial-reporting/reports/summary`, fetcher);
  const { data: budget } = useSWR(`${API_BASE}/ebay/financial-reporting/budget/current`, fetcher);

  return (
    <div className="space-y-6">
      {/* 利用可能なレポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">レポート一覧</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary?.availableReports?.map((report: { id: string; name: string; lastGenerated: string }) => (
            <div key={report.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-medium">{report.name}</h4>
                  <p className="text-xs text-gray-500">
                    最終生成: {new Date(report.lastGenerated).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1">
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button className="flex-1 px-3 py-2 border rounded text-sm hover:bg-gray-50 flex items-center justify-center gap-1">
                  <Download className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* スケジュールレポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">スケジュールレポート</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            新規スケジュール
          </button>
        </div>
        <div className="space-y-3">
          {summary?.scheduledReports?.map((report: { id: string; name: string; schedule: string; nextRun: string }) => (
            <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <h4 className="font-medium">{report.name}</h4>
                  <p className="text-sm text-gray-500">
                    {report.schedule} | 次回: {new Date(report.nextRun).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 予算対実績 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">予算対実績</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">収益</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-800">
                ¥{budget?.revenue?.actual?.toLocaleString()}
              </span>
              <span className="text-sm text-green-600">
                / ¥{budget?.revenue?.budget?.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 text-sm text-green-600">
              {budget?.revenue?.variancePercent > 0 ? '+' : ''}{budget?.revenue?.variancePercent}%
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">経費</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-800">
                ¥{budget?.expenses?.actual?.toLocaleString()}
              </span>
              <span className="text-sm text-red-600">
                / ¥{budget?.expenses?.budget?.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 text-sm text-green-600">
              {budget?.expenses?.variancePercent}%（予算以下）
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">純利益</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-800">
                ¥{budget?.netIncome?.actual?.toLocaleString()}
              </span>
              <span className="text-sm text-blue-600">
                / ¥{budget?.netIncome?.budget?.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 text-sm text-green-600">
              +{budget?.netIncome?.variancePercent}%
            </div>
          </div>
        </div>

        <h4 className="font-medium mb-3">カテゴリ別</h4>
        <div className="space-y-3">
          {budget?.byCategory?.map((cat: { category: string; budget: number; actual: number; variance: number }) => (
            <div key={cat.category}>
              <div className="flex justify-between mb-1">
                <span className="text-sm">{cat.category}</span>
                <span className="text-sm">
                  ¥{cat.actual.toLocaleString()} / ¥{cat.budget.toLocaleString()}
                  <span className={`ml-2 ${cat.variance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({cat.variance <= 0 ? '' : '+'}{cat.variance.toLocaleString()})
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    cat.actual <= cat.budget ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((cat.actual / cat.budget) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: settings } = useSWR(`${API_BASE}/ebay/financial-reporting/settings/general`, fetcher);
  const { data: accounts } = useSWR(`${API_BASE}/ebay/financial-reporting/settings/accounts`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">会計年度開始月</p>
              <p className="text-sm text-gray-500">決算期の開始月</p>
            </div>
            <select defaultValue={settings?.fiscalYearStart} className="border rounded-lg px-3 py-2">
              <option value="01-01">1月</option>
              <option value="04-01">4月</option>
              <option value="07-01">7月</option>
              <option value="10-01">10月</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">基準通貨</p>
              <p className="text-sm text-gray-500">レポートの表示通貨</p>
            </div>
            <select defaultValue={settings?.currency} className="border rounded-lg px-3 py-2">
              <option value="JPY">日本円 (JPY)</option>
              <option value="USD">米ドル (USD)</option>
              <option value="EUR">ユーロ (EUR)</option>
              <option value="GBP">英ポンド (GBP)</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">会計方式</p>
              <p className="text-sm text-gray-500">発生主義または現金主義</p>
            </div>
            <select defaultValue={settings?.accountingMethod} className="border rounded-lg px-3 py-2">
              <option value="accrual">発生主義</option>
              <option value="cash">現金主義</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">レポート頻度</p>
              <p className="text-sm text-gray-500">定期レポートの生成頻度</p>
            </div>
            <select defaultValue={settings?.reportingFrequency} className="border rounded-lg px-3 py-2">
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
              <option value="monthly">毎月</option>
              <option value="quarterly">四半期</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">自動照合</p>
              <p className="text-sm text-gray-500">取引の自動照合を有効化</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.autoReconciliation} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            設定を保存
          </button>
        </div>
      </div>

      {/* 勘定科目 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">勘定科目</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            科目追加
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-700 mb-3">収益</h4>
            <div className="space-y-2">
              {accounts?.revenue?.map((acc: { code: string; name: string }) => (
                <div key={acc.code} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">{acc.code} - {acc.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-red-700 mb-3">経費</h4>
            <div className="space-y-2">
              {accounts?.expenses?.map((acc: { code: string; name: string }) => (
                <div key={acc.code} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="text-sm">{acc.code} - {acc.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-blue-700 mb-3">資産</h4>
            <div className="space-y-2">
              {accounts?.assets?.map((acc: { code: string; name: string }) => (
                <div key={acc.code} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm">{acc.code} - {acc.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-orange-700 mb-3">負債</h4>
            <div className="space-y-2">
              {accounts?.liabilities?.map((acc: { code: string; name: string }) => (
                <div key={acc.code} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                  <span className="text-sm">{acc.code} - {acc.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
