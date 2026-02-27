// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Receipt,
  MapPin,
  FileText,
  Calculator,
  RefreshCw,
  Settings,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Globe,
  Building2,
  FileCheck,
} from 'lucide-react';

type TabType = 'dashboard' | 'rates' | 'exemptions' | 'nexus' | 'remittances' | 'settings';

export default function TaxManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: Receipt },
    { id: 'rates' as const, label: '税率', icon: Calculator },
    { id: 'exemptions' as const, label: '免税', icon: FileCheck },
    { id: 'nexus' as const, label: 'ネクサス', icon: MapPin },
    { id: 'remittances' as const, label: '納税', icon: DollarSign },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-rose-500 to-pink-500">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">税金管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">税率・免税・ネクサス・納税管理</p>
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
                  ? 'border-rose-500 text-rose-600 dark:text-rose-400'
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
        {activeTab === 'rates' && <RatesTab />}
        {activeTab === 'exemptions' && <ExemptionsTab />}
        {activeTab === 'nexus' && <NexusTab />}
        {activeTab === 'remittances' && <RemittancesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data, isLoading } = useSWR('/api/ebay-tax-management/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-rose-500" /></div>;
  }

  const dashboard = data || {
    overview: { totalTaxCollected: 0, pendingRemittance: 0, jurisdictionsActive: 0, exemptionsActive: 0 },
    collectionSummary: { thisMonth: { collected: 0 }, lastMonth: { collected: 0 } },
    byJurisdiction: [],
    upcomingRemittances: [],
    alerts: [],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総徴収額</p>
              <p className="text-xl font-bold text-green-600">${dashboard.overview.totalTaxCollected.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">納付予定</p>
              <p className="text-xl font-bold text-amber-600">${dashboard.overview.pendingRemittance.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">管轄区域</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.jurisdictionsActive}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <FileCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">免税件数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.exemptionsActive}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">管轄区域別徴収額</h3>
          <div className="space-y-3">
            {dashboard.byJurisdiction.map((j: { name: string; code: string; rate: number; collected: number; orders: number }) => (
              <div key={j.code} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium">{j.code}</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{j.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-900 dark:text-white">${j.collected.toLocaleString()}</p>
                  <p className="text-xs text-zinc-500">{j.orders}件 ({j.rate}%)</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">納付予定</h3>
          <div className="space-y-3">
            {dashboard.upcomingRemittances.map((r: { jurisdiction: string; amount: number; dueDate: string; status: string }, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded text-xs font-medium">
                    {r.jurisdiction}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">${r.amount.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">期限: {r.dueDate}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {r.status === 'pending' ? '未払い' : 'スケジュール済み'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {dashboard.alerts.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">アラート</h3>
          <div className="space-y-2">
            {dashboard.alerts.map((alert: { type: string; message: string }, i: number) => (
              <div key={i} className={`flex items-center gap-2 p-3 rounded-lg ${
                alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                {alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-blue-500" />}
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{alert.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function RatesTab() {
  const { data, isLoading } = useSWR('/api/ebay-tax-management/rates', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-rose-500" /></div>;
  }

  const rates = data?.rates || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべての国</option>
            <option value="US">United States</option>
          </select>
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのタイプ</option>
            <option value="sales">Sales Tax</option>
            <option value="vat">VAT</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" />インポート</Button>
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" />同期</Button>
          <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />税率追加</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">地域</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">タイプ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">税率</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">自動徴収</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">有効</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rates.slice(0, 15).map((rate: {
                id: string;
                state: string;
                county: string | null;
                city: string | null;
                rate: number;
                type: string;
                autoCollect: boolean;
                enabled: boolean;
              }) => (
                <tr key={rate.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{rate.state}</p>
                      <p className="text-xs text-zinc-500">
                        {[rate.county, rate.city].filter(Boolean).join(', ') || '州全体'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
                      {rate.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">
                    {rate.rate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rate.autoCollect ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rate.enabled ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {rate.enabled ? '有効' : '無効'}
                    </span>
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

function ExemptionsTab() {
  const { data, isLoading } = useSWR('/api/ebay-tax-management/exemptions', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-rose-500" /></div>;
  }

  const exemptions = data?.exemptions || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのタイプ</option>
            <option value="resale">再販</option>
            <option value="nonprofit">非営利</option>
            <option value="government">政府</option>
          </select>
        </div>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />免税追加</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {exemptions.slice(0, 8).map((ex: {
          id: string;
          customerName: string;
          type: string;
          jurisdictions: string[];
          certificateNumber: string;
          expirationDate: string | null;
          status: string;
        }) => (
          <Card key={ex.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-white">{ex.customerName}</h4>
                <p className="text-xs text-zinc-500">{ex.certificateNumber}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                ex.status === 'active' ? 'bg-green-100 text-green-700' :
                ex.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {ex.status === 'active' ? '有効' : ex.status === 'pending' ? '審査中' : '期限切れ'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">タイプ</span>
                <span className="text-zinc-900 dark:text-white">
                  {ex.type === 'resale' ? '再販' : ex.type === 'nonprofit' ? '非営利' : ex.type === 'government' ? '政府' : ex.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">管轄区域</span>
                <span className="text-zinc-900 dark:text-white">{ex.jurisdictions.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">有効期限</span>
                <span className="text-zinc-900 dark:text-white">{ex.expirationDate || '無期限'}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
              <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NexusTab() {
  const { data, isLoading } = useSWR('/api/ebay-tax-management/nexus', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-rose-500" /></div>;
  }

  const nexus = data?.nexus || [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">ネクサス状況</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">州</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">物理的存在</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">経済的ネクサス</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">売上額</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">取引数</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {nexus.map((n: {
                state: string;
                stateName: string;
                hasPhysicalPresence: boolean;
                hasSalesNexus: boolean;
                salesAmount: number;
                transactionCount: number;
              }) => (
                <tr key={n.state} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium">{n.state}</span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{n.stateName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {n.hasPhysicalPresence ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {n.hasSalesNexus ? <CheckCircle className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-zinc-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">
                    ${n.salesAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {n.transactionCount}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm">詳細</Button>
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

function RemittancesTab() {
  const { data, isLoading } = useSWR('/api/ebay-tax-management/remittances', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-rose-500" /></div>;
  }

  const remittances = data?.remittances || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのステータス</option>
            <option value="pending">未払い</option>
            <option value="scheduled">スケジュール済み</option>
            <option value="paid">支払済み</option>
          </select>
        </div>
        <Button variant="primary" size="sm"><Download className="h-4 w-4 mr-1" />レポート</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">管轄区域</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">期間</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">徴収額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">期限</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">ステータス</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {remittances.slice(0, 15).map((r: {
                id: string;
                jurisdiction: string;
                period: string;
                taxCollected: number;
                dueDate: string;
                status: string;
              }) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded text-xs font-medium">
                      {r.jurisdiction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">{r.period}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">${r.taxCollected.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">{r.dueDate}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'paid' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {r.status === 'pending' ? '未払い' :
                       r.status === 'scheduled' ? 'スケジュール済み' :
                       r.status === 'paid' ? '支払済み' : '期限超過'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm">詳細</Button>
                      {r.status === 'pending' && <Button variant="outline" size="sm">支払う</Button>}
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

function SettingsTab() {
  const { data, isLoading } = useSWR('/api/ebay-tax-management/settings', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-rose-500" /></div>;
  }

  const settings = data || {
    general: { autoCollect: true, includeTaxInPrice: false },
    calculation: { shippingTaxable: true },
    remittance: { autoSchedule: true, reminderDays: 7 },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">自動徴収</p>
              <p className="text-sm text-zinc-500">該当する注文の税金を自動的に徴収</p>
            </div>
            <input type="checkbox" defaultChecked={settings.general.autoCollect} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">税込価格表示</p>
              <p className="text-sm text-zinc-500">価格に税金を含めて表示</p>
            </div>
            <input type="checkbox" defaultChecked={settings.general.includeTaxInPrice} className="toggle" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">計算設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">送料への課税</p>
              <p className="text-sm text-zinc-500">送料に税金を課税する</p>
            </div>
            <input type="checkbox" defaultChecked={settings.calculation.shippingTaxable} className="toggle" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">納税設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">自動スケジュール</p>
              <p className="text-sm text-zinc-500">納税スケジュールを自動設定</p>
            </div>
            <input type="checkbox" defaultChecked={settings.remittance.autoSchedule} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">リマインダー日数</p>
              <p className="text-sm text-zinc-500">期限前のリマインダー送信日数</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings.remittance.reminderDays}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">日前</span>
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
