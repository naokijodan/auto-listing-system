'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Calculator,
  Globe,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Package,
  Shield,
  Clock,
  RefreshCw,
  Plus,
  ChevronRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type TabType = 'dashboard' | 'tax-rates' | 'duty-rates' | 'calculator' | 'hs-codes' | 'compliance' | 'exemptions';

export default function TaxDutyPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [calcForm, setCalcForm] = useState({
    orderValue: '',
    currency: 'USD',
    originCountry: 'JP',
    destinationCountry: 'US'
  });
  const [calcResult, setCalcResult] = useState<any>(null);

  const { data: stats } = useSWR(`${API_BASE}/ebay-tax-duty/stats`, fetcher);
  const { data: taxRatesData } = useSWR(`${API_BASE}/ebay-tax-duty/tax-rates`, fetcher);
  const { data: dutyRatesData } = useSWR(`${API_BASE}/ebay-tax-duty/duty-rates`, fetcher);
  const { data: hsCodesData } = useSWR(`${API_BASE}/ebay-tax-duty/hs-codes`, fetcher);
  const { data: exemptionsData } = useSWR(`${API_BASE}/ebay-tax-duty/exemptions`, fetcher);
  const { data: complianceData } = useSWR(`${API_BASE}/ebay-tax-duty/compliance`, fetcher);
  const { data: complianceSummary } = useSWR(`${API_BASE}/ebay-tax-duty/compliance/summary`, fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: TrendingUp },
    { id: 'tax-rates' as TabType, label: '税率', icon: DollarSign },
    { id: 'duty-rates' as TabType, label: '関税率', icon: Globe },
    { id: 'calculator' as TabType, label: '計算機', icon: Calculator },
    { id: 'hs-codes' as TabType, label: 'HSコード', icon: Package },
    { id: 'compliance' as TabType, label: 'コンプライアンス', icon: Shield },
    { id: 'exemptions' as TabType, label: '免税ルール', icon: FileText },
  ];

  const handleCalculate = async () => {
    const response = await fetch(`${API_BASE}/ebay-tax-duty/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderValue: Number(calcForm.orderValue),
        currency: calcForm.currency,
        originCountry: calcForm.originCountry,
        destinationCountry: calcForm.destinationCountry
      })
    });
    const result = await response.json();
    setCalcResult(result);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'pending':
      case 'pending_review': return 'text-yellow-600 bg-yellow-100';
      case 'action_required':
      case 'non_compliant': return 'text-red-600 bg-red-100';
      case 'exempt':
      case 'not_applicable': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総税金徴収額</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalTaxCollected || 0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総関税支払額</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalDutyPaid || 0)}</p>
            </div>
            <Globe className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">対応国数</p>
              <p className="text-2xl font-bold">{stats?.countriesWithTax || '-'}</p>
            </div>
            <Globe className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">コンプライアンス率</p>
              <p className="text-2xl font-bold">{stats?.complianceRate || '-'}%</p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* 国別内訳 & 期限 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">国別税金・関税</h3>
          <div className="space-y-3">
            {stats?.byCountry?.map((country: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{country.country}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">税金: {formatCurrency(country.taxCollected)}</span>
                  <span className="text-blue-600">関税: {formatCurrency(country.dutyPaid)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            申告期限
          </h3>
          <div className="space-y-3">
            {stats?.upcomingDeadlines?.map((deadline: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded">
                <div>
                  <p className="font-medium">{deadline.country}</p>
                  <p className="text-sm text-gray-500">{deadline.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{deadline.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* コンプライアンスサマリー */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">コンプライアンス状況</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{complianceSummary?.countriesCompliant || 0}</p>
            <p className="text-sm text-gray-500">準拠</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded">
            <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{complianceSummary?.countriesPending || 0}</p>
            <p className="text-sm text-gray-500">保留中</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{complianceSummary?.countriesActionRequired || 0}</p>
            <p className="text-sm text-gray-500">要対応</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded">
            <DollarSign className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(complianceSummary?.totalLiability || 0)}</p>
            <p className="text-sm text-gray-500">総負債額</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTaxRates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">税率一覧</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規税率
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">国/地域</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">税種</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">税率</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">閾値</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {taxRatesData?.taxRates?.map((rate: any) => (
              <tr key={rate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{rate.country}</div>
                  {rate.region && <div className="text-xs text-gray-500">{rate.region}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs uppercase">
                    {rate.taxType}
                  </span>
                </td>
                <td className="px-6 py-4 text-lg font-bold">{rate.rate}%</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {rate.minThreshold ? `${formatCurrency(rate.minThreshold)} 以上` : '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(rate.status)}`}>
                    {rate.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    編集 <ChevronRight className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDutyRates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">関税率一覧</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規関税率
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ルート</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSコード</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">カテゴリ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">関税率</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">追加料金</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dutyRatesData?.dutyRates?.map((rate: any) => (
              <tr key={rate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rate.originCountry}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{rate.destinationCountry}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm">{rate.hsCode}</code>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    {rate.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-lg font-bold">{rate.dutyRate}%</td>
                <td className="px-6 py-4 text-sm">
                  {rate.additionalFees?.length > 0 ? (
                    rate.additionalFees.map((fee: any, i: number) => (
                      <div key={i} className="text-gray-500">
                        {fee.name}: {fee.rate}%
                      </div>
                    ))
                  ) : '-'}
                </td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    編集 <ChevronRight className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCalculator = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">税金・関税計算機</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 入力フォーム */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-4">注文情報</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">注文金額</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={calcForm.orderValue}
                  onChange={(e) => setCalcForm({ ...calcForm, orderValue: e.target.value })}
                  placeholder="250.00"
                  className="flex-1 border rounded px-3 py-2"
                />
                <select
                  value={calcForm.currency}
                  onChange={(e) => setCalcForm({ ...calcForm, currency: e.target.value })}
                  className="border rounded px-3 py-2"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発送元国</label>
              <select
                value={calcForm.originCountry}
                onChange={(e) => setCalcForm({ ...calcForm, originCountry: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="JP">日本 (JP)</option>
                <option value="US">アメリカ (US)</option>
                <option value="CN">中国 (CN)</option>
                <option value="DE">ドイツ (DE)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発送先国</label>
              <select
                value={calcForm.destinationCountry}
                onChange={(e) => setCalcForm({ ...calcForm, destinationCountry: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="US">アメリカ (US)</option>
                <option value="GB">イギリス (GB)</option>
                <option value="DE">ドイツ (DE)</option>
                <option value="AU">オーストラリア (AU)</option>
                <option value="CA">カナダ (CA)</option>
              </select>
            </div>

            <button
              onClick={handleCalculate}
              disabled={!calcForm.orderValue}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              計算する
            </button>
          </div>
        </div>

        {/* 計算結果 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-4">計算結果</h4>
          {calcResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <div className="flex justify-between mb-2">
                  <span>商品価格</span>
                  <span className="font-medium">{formatCurrency(calcResult.orderValue, calcResult.currency)}</span>
                </div>

                {calcResult.taxes?.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-sm text-gray-500 mb-1">税金:</p>
                    {calcResult.taxes.map((tax: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{tax.name} ({tax.rate}%)</span>
                        <span>{formatCurrency(tax.amount, calcResult.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {calcResult.duties?.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-sm text-gray-500 mb-1">関税:</p>
                    {calcResult.duties.map((duty: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{duty.description} ({duty.rate}%)</span>
                        <span>{formatCurrency(duty.amount, calcResult.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-2 mt-2 font-bold">
                  <div className="flex justify-between">
                    <span>税金合計</span>
                    <span className="text-green-600">{formatCurrency(calcResult.totalTax, calcResult.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>関税合計</span>
                    <span className="text-blue-600">{formatCurrency(calcResult.totalDuty, calcResult.currency)}</span>
                  </div>
                  <div className="flex justify-between text-lg mt-2 pt-2 border-t">
                    <span>総合計</span>
                    <span>{formatCurrency(calcResult.grandTotal, calcResult.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>注文情報を入力して計算してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHSCodes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">HSコードマッピング</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規マッピング
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hsCodesData?.hsCodes?.map((hs: any) => (
          <div key={hs.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{hs.productCategory}</h4>
                <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">{hs.hsCode}</code>
              </div>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                {hs.dutyCategory}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{hs.description}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {hs.keywords?.map((kw: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {kw}
                </span>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-sm text-gray-500">平均関税率: {hs.avgDutyRate}%</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">コンプライアンスレポート</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          更新
        </button>
      </div>

      <div className="space-y-4">
        {complianceData?.reports?.map((report: any) => (
          <div key={report.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{report.country}</h4>
                <span className="text-sm text-gray-500">{report.period}</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${getStatusColor(report.status)}`}>
                {report.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
              <div>
                <p className="text-gray-500">総売上</p>
                <p className="font-medium">{formatCurrency(report.totalSales)}</p>
              </div>
              <div>
                <p className="text-gray-500">徴収税額</p>
                <p className="font-medium text-green-600">{formatCurrency(report.totalTaxCollected)}</p>
              </div>
              <div>
                <p className="text-gray-500">納付税額</p>
                <p className="font-medium text-blue-600">{formatCurrency(report.totalTaxRemitted)}</p>
              </div>
            </div>

            {report.issues?.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-500 mb-2">問題点:</p>
                {report.issues.map((issue: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className={`h-4 w-4 ${
                      issue.severity === 'high' ? 'text-red-500' :
                      issue.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <span>{issue.description}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <span className="text-sm text-gray-500">申告期限: {report.filingDeadline}</span>
              {report.filedDate ? (
                <span className="text-sm text-green-600">申告済み: {report.filedDate}</span>
              ) : (
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  申告する
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExemptions = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">免税ルール</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規ルール
        </button>
      </div>

      <div className="space-y-4">
        {exemptionsData?.exemptions?.map((exemption: any) => (
          <div key={exemption.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{exemption.name}</h4>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {exemption.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {exemption.enabled ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    有効
                  </span>
                ) : (
                  <span className="text-gray-400">無効</span>
                )}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">条件:</p>
              {exemption.conditions?.map((cond: any, i: number) => (
                <code key={i} className="block text-xs bg-gray-100 px-2 py-1 rounded mb-1">
                  {cond.field} {cond.operator} {cond.value}
                </code>
              ))}
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-sm text-gray-500 mr-2">免除対象:</span>
              {exemption.exemptTaxTypes?.map((type: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs uppercase">
                  {type}
                </span>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-sm text-gray-500">
                有効期間: {exemption.validFrom} 〜 {exemption.validTo || '無期限'}
              </span>
              <div className="flex gap-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
                <button className="text-red-600 hover:text-red-800 text-sm">削除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'tax-rates': return renderTaxRates();
      case 'duty-rates': return renderDutyRates();
      case 'calculator': return renderCalculator();
      case 'hs-codes': return renderHSCodes();
      case 'compliance': return renderCompliance();
      case 'exemptions': return renderExemptions();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tax & Duty Manager</h1>
              <p className="text-sm text-gray-500">税金・関税管理・コンプライアンス</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                レポート
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                税率更新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
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
