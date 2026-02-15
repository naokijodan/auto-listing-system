'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Wallet,
  Building,
  RefreshCw,
  BarChart,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Eye,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function PaymentGatewayPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: CreditCard },
    { id: 'transactions', name: '取引', icon: DollarSign },
    { id: 'methods', name: '支払い方法', icon: Wallet },
    { id: 'payouts', name: '出金', icon: ArrowUpRight },
    { id: 'reports', name: 'レポート', icon: BarChart },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">Payment Gateway</h1>
            </div>
          </div>
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'methods' && <MethodsTab />}
        {activeTab === 'payouts' && <PayoutsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/payment-gateway/dashboard/overview`, fetcher);
  const { data: transactions } = useSWR(`${API_BASE}/ebay/payment-gateway/dashboard/transactions`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/payment-gateway/dashboard/stats`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">今日の売上</p>
              <p className="text-2xl font-bold">¥{(overview?.todayRevenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">総売上</p>
              <p className="text-2xl font-bold">¥{(overview?.totalRevenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">保留中</p>
              <p className="text-2xl font-bold">¥{(overview?.pendingPayments || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-500">出金可能残高</p>
              <p className="text-2xl font-bold">¥{(overview?.payoutBalance || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">最近の取引</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {transactions?.transactions?.map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    {txn.type === 'payment' ? (
                      <ArrowDownRight className="h-6 w-6 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-6 w-6 text-red-600" />
                    )}
                    <div className="ml-3">
                      <p className="font-medium">{txn.customer}</p>
                      <p className="text-sm text-gray-500">{txn.method}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.amount > 0 ? '+' : ''}¥{txn.amount.toLocaleString()}
                    </p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      txn.status === 'completed' ? 'bg-green-100 text-green-800' :
                      txn.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {txn.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">支払い方法別</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.byMethod?.map((method: any) => (
                <div key={method.method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{method.method}</span>
                    <span>¥{method.amount.toLocaleString()} ({method.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${method.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/payment-gateway/transactions`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="取引を検索..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払い方法</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.transactions?.map((txn: any) => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{txn.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{txn.type}</td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{txn.customer.name}</p>
                    <p className="text-sm text-gray-500">{txn.customer.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{txn.method}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">¥{txn.amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    txn.status === 'completed' ? 'bg-green-100 text-green-800' :
                    txn.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>{txn.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="p-1 text-purple-600 hover:bg-purple-50 rounded">
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MethodsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/payment-gateway/methods`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.methods?.map((method: any) => (
          <div key={method.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <h3 className="font-semibold">{method.name}</h3>
                  <p className="text-sm text-gray-500">手数料: {method.feeRate}% + ¥{method.fixedFee}</p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                method.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>{method.status === 'active' ? '有効' : '無効'}</span>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              対応通貨: {method.currencies.join(', ')}
            </div>
            <button className="w-full py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50">
              設定
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayoutsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/payment-gateway/payouts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">出金可能残高</p>
          <p className="text-3xl font-bold">¥{(data?.balance || 0).toLocaleString()}</p>
        </div>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          出金リクエスト
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">口座</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.payouts?.map((payout: any) => (
              <tr key={payout.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{payout.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">¥{payout.amount.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{payout.bankAccount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    payout.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>{payout.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payout.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data: revenue } = useSWR(`${API_BASE}/ebay/payment-gateway/reports/revenue`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総売上</p>
          <p className="text-2xl font-bold">¥{(revenue?.summary?.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">総手数料</p>
          <p className="text-2xl font-bold">¥{(revenue?.summary?.totalFees || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">純売上</p>
          <p className="text-2xl font-bold">¥{(revenue?.summary?.netRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500">平均取引額</p>
          <p className="text-2xl font-bold">¥{(revenue?.summary?.avgTransactionValue || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">日別売上</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {revenue?.daily?.map((day: any) => (
              <div key={day.date} className="flex items-center justify-between">
                <span className="text-sm">{day.date}</span>
                <div className="flex items-center space-x-8 text-sm">
                  <span>売上: ¥{day.revenue.toLocaleString()}</span>
                  <span className="text-gray-500">手数料: ¥{day.fees.toLocaleString()}</span>
                  <span className="font-medium">純額: ¥{day.net.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/payment-gateway/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/payment-gateway/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">一般設定</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">デフォルト通貨</label>
              <select defaultValue={general?.settings?.defaultCurrency} className="mt-1 block w-full border rounded-lg px-3 py-2">
                <option value="JPY">JPY</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">出金スケジュール</label>
              <select defaultValue={general?.settings?.payoutSchedule} className="mt-1 block w-full border rounded-lg px-3 py-2">
                <option value="daily">毎日</option>
                <option value="weekly">毎週</option>
                <option value="monthly">毎月</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">最低出金額</label>
              <input type="number" defaultValue={general?.settings?.minimumPayout} className="mt-1 block w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">通知設定</h3>
        </div>
        <div className="p-6 space-y-4">
          {[
            { key: 'onPaymentReceived', label: '支払い受領時に通知' },
            { key: 'onPaymentFailed', label: '支払い失敗時に通知' },
            { key: 'onRefundProcessed', label: '払い戻し処理時に通知' },
            { key: 'onPayoutCompleted', label: '出金完了時に通知' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={notifications?.settings?.[item.key]} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">設定を保存</button>
      </div>
    </div>
  );
}
