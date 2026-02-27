// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Coins,
  LayoutDashboard,
  RefreshCw,
  Settings2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Bell,
  Percent,
  FileText,
  Globe,
  DollarSign,
  Euro,
  PoundSterling,
  CircleDollarSign,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MultiCurrencyPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Coins className="h-8 w-8 text-sky-600" />
            Multi-Currency Manager
          </h1>
          <p className="text-muted-foreground mt-1">多通貨管理・為替レート</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700">
          <RefreshCw className="mr-2 h-4 w-4" />
          レート更新
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="currencies" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            通貨管理
          </TabsTrigger>
          <TabsTrigger value="convert" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            変換
          </TabsTrigger>
          <TabsTrigger value="margins" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            マージン
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            レポート
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="currencies">
          <CurrenciesTab />
        </TabsContent>
        <TabsContent value="convert">
          <ConvertTab />
        </TabsContent>
        <TabsContent value="margins">
          <MarginsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/multi-currency/dashboard/overview`, fetcher);
  const { data: rates } = useSWR(`${API_BASE}/ebay/multi-currency/dashboard/rates`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/multi-currency/dashboard/stats`, fetcher);

  const getCurrencyIcon = (code: string) => {
    switch (code) {
      case 'USD': return <DollarSign className="h-4 w-4" />;
      case 'EUR': return <Euro className="h-4 w-4" />;
      case 'GBP': return <PoundSterling className="h-4 w-4" />;
      default: return <CircleDollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">基準通貨</CardTitle>
            <Coins className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.baseCurrency}</div>
            <p className="text-xs text-muted-foreground">有効通貨: {overview?.activeCurrencies}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総変換数</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalConversions?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">今日: {overview?.todayConversions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均マージン</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.avgMarginApplied}%</div>
            <p className="text-xs text-muted-foreground">適用マージン率</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">最終更新</CardTitle>
            <RefreshCw className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{overview?.lastRateUpdate?.split(' ')[1]}</div>
            <p className="text-xs text-muted-foreground">{overview?.rateSource}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>現在の為替レート</CardTitle>
            <CardDescription>基準: {rates?.baseCurrency}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>通貨</TableHead>
                  <TableHead className="text-right">レート</TableHead>
                  <TableHead className="text-right">24h変動</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates?.rates?.map((rate: any) => (
                  <TableRow key={rate.currency}>
                    <TableCell className="flex items-center gap-2">
                      {getCurrencyIcon(rate.currency)}
                      <span className="font-medium">{rate.currency}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{rate.rate}</TableCell>
                    <TableCell className="text-right">
                      {rate.change24h > 0 ? (
                        <span className="text-green-600 flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3" />
                          +{rate.change24h}%
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {rate.change24h}%
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>通貨別変換数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.conversionsByCurrency && Object.entries(stats.conversionsByCurrency).map(([currency, count]: [string, any]) => (
                <div key={currency} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCurrencyIcon(currency)}
                    <span className="font-medium">{currency}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-600 rounded-full"
                        style={{ width: `${(count / 5200) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-16 text-right">{count?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CurrenciesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/multi-currency/currencies`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>通貨管理</CardTitle>
            <Button className="bg-sky-600 hover:bg-sky-700">
              通貨を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>通貨</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>シンボル</TableHead>
                <TableHead className="text-right">レート</TableHead>
                <TableHead className="text-right">マージン</TableHead>
                <TableHead>有効</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.currencies?.map((currency: any) => (
                <TableRow key={currency.code}>
                  <TableCell className="font-medium">{currency.code}</TableCell>
                  <TableCell>{currency.name}</TableCell>
                  <TableCell>{currency.symbol}</TableCell>
                  <TableCell className="text-right font-mono">{currency.rate}</TableCell>
                  <TableCell className="text-right">{currency.margin}%</TableCell>
                  <TableCell>
                    <Switch checked={currency.active} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      編集
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>レートアラート</CardTitle>
          <CardDescription>為替レートが閾値を超えたら通知</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select defaultValue="USD">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="above">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">以上</SelectItem>
                <SelectItem value="below">以下</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="閾値" className="w-32" />
            <Button className="bg-sky-600 hover:bg-sky-700">
              <Bell className="mr-2 h-4 w-4" />
              アラート追加
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConvertTab() {
  const [amount, setAmount] = useState('15000');
  const { data: preview } = useSWR(
    `${API_BASE}/ebay/multi-currency/convert/preview?amount=${amount}`,
    fetcher
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>通貨変換</CardTitle>
            <CardDescription>リアルタイム為替計算</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">金額（JPY）</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="金額を入力"
              />
            </div>
            <div className="space-y-3">
              {preview?.rates?.map((rate: any) => (
                <div key={rate.currency} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{rate.currency}</span>
                  <div className="text-right">
                    <p className="text-xl font-bold">{rate.amount?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">マージン: {rate.margin}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>一括変換</CardTitle>
            <CardDescription>複数商品の価格を一括変換</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">変換元通貨</label>
              <Select defaultValue="JPY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JPY">JPY - 日本円</SelectItem>
                  <SelectItem value="USD">USD - 米ドル</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">変換先通貨</label>
              <Select defaultValue="USD">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - 米ドル</SelectItem>
                  <SelectItem value="EUR">EUR - ユーロ</SelectItem>
                  <SelectItem value="GBP">GBP - 英ポンド</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">対象商品</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべての商品</SelectItem>
                  <SelectItem value="selected">選択した商品</SelectItem>
                  <SelectItem value="category">カテゴリ指定</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-sky-600 hover:bg-sky-700">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              一括変換を実行
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MarginsTab() {
  const { data: margins } = useSWR(`${API_BASE}/ebay/multi-currency/margins`, fetcher);
  const { data: rules } = useSWR(`${API_BASE}/ebay/multi-currency/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>通貨別マージン</CardTitle>
            <CardDescription>デフォルト: {margins?.globalDefault}%</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>通貨</TableHead>
                  <TableHead className="text-right">マージン</TableHead>
                  <TableHead className="text-right">最小</TableHead>
                  <TableHead className="text-right">最大</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {margins?.margins?.map((margin: any) => (
                  <TableRow key={margin.currency}>
                    <TableCell className="font-medium">{margin.currency}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        defaultValue={margin.margin}
                        className="w-20 text-right ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{margin.minMargin}%</TableCell>
                    <TableCell className="text-right text-muted-foreground">{margin.maxMargin}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button className="mt-4 bg-sky-600 hover:bg-sky-700">
              マージンを保存
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>マージンルール</CardTitle>
              <Button size="sm" className="bg-sky-600 hover:bg-sky-700">
                ルール追加
              </Button>
            </div>
            <CardDescription>条件に応じたマージン設定</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rules?.rules?.map((rule: any) => (
                <div key={rule.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.condition}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{rule.margin}%</Badge>
                      <Switch checked={rule.active} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/multi-currency/reports/summary`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>サマリーレポート</CardTitle>
              <CardDescription>期間: {data?.report?.period}</CardDescription>
            </div>
            <Button variant="outline">
              レポートをエクスポート
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">総変換数</p>
              <p className="text-2xl font-bold">{data?.report?.totalConversions?.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">マージン収益（JPY）</p>
              <p className="text-2xl font-bold">¥{data?.report?.totalMarginEarned?.JPY?.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">マージン収益（USD）</p>
              <p className="text-2xl font-bold">${data?.report?.totalMarginEarned?.USD?.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">通貨別内訳</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>通貨</TableHead>
                  <TableHead className="text-right">変換数</TableHead>
                  <TableHead className="text-right">マージン収益</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.report?.byCurrency?.map((item: any) => (
                  <TableRow key={item.currency}>
                    <TableCell className="font-medium">{item.currency}</TableCell>
                    <TableCell className="text-right">{item.conversions?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${item.marginEarned?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="font-semibold mb-4">レート変動</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {data?.report?.rateFluctuations && Object.entries(data.report.rateFluctuations).map(([currency, fluctuation]: [string, any]) => (
                <div key={currency} className="p-4 border rounded-lg">
                  <p className="font-medium mb-2">{currency}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">最小</p>
                      <p className="font-mono">{fluctuation.min}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">平均</p>
                      <p className="font-mono">{fluctuation.avg}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">最大</p>
                      <p className="font-mono">{fluctuation.max}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/multi-currency/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">基準通貨</label>
            <Select defaultValue={data?.settings?.baseCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JPY">JPY - 日本円</SelectItem>
                <SelectItem value="USD">USD - 米ドル</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動更新</p>
              <p className="text-sm text-muted-foreground">為替レートを自動的に更新</p>
            </div>
            <Switch checked={data?.settings?.autoUpdate} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">更新間隔（分）</label>
            <Input type="number" defaultValue={data?.settings?.updateInterval} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">レートソース</label>
            <Select defaultValue={data?.settings?.rateSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ecb">European Central Bank</SelectItem>
                <SelectItem value="openexchangerates">Open Exchange Rates</SelectItem>
                <SelectItem value="fixer">Fixer.io</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルトマージン（%）</label>
            <Input type="number" defaultValue={data?.settings?.defaultMargin} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">端数処理</label>
            <Select defaultValue={data?.settings?.roundingMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">四捨五入</SelectItem>
                <SelectItem value="up">切り上げ</SelectItem>
                <SelectItem value="down">切り捨て</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-sky-600 hover:bg-sky-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
