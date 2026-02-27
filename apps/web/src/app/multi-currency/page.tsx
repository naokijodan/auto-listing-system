// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DollarSign,
  Euro,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Settings,
  History,
  Globe,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  validFrom: string;
  validTo: string | null;
}

interface Conversion {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  rateUsed: number;
  purpose: string;
  createdAt: string;
}

interface CurrencyStats {
  totalCurrencies: number;
  activeCurrencies: number;
  totalRates: number;
  totalConversions: number;
  recentConversions: number;
  defaultCurrency: string;
}

export default function MultiCurrencyPage() {
  const [stats, setStats] = useState<CurrencyStats | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);

  // 新規通貨フォーム
  const [newCurrency, setNewCurrency] = useState({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: 2,
  });

  // 換算フォーム
  const [convertForm, setConvertForm] = useState({
    fromCurrency: 'JPY',
    toCurrency: 'USD',
    amount: 10000,
    purpose: 'pricing',
  });

  // 為替レートフォーム
  const [rateForm, setRateForm] = useState({
    fromCurrency: 'JPY',
    toCurrency: 'USD',
    rate: 0.0067,
    source: 'manual',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, currenciesRes, ratesRes, conversionsRes] = await Promise.all([
        fetch(`${API_BASE}/multi-currency/stats`),
        fetch(`${API_BASE}/multi-currency/currencies`),
        fetch(`${API_BASE}/multi-currency/rates?limit=50`),
        fetch(`${API_BASE}/multi-currency/conversions?limit=20`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (currenciesRes.ok) {
        const data = await currenciesRes.json();
        setCurrencies(data.currencies || []);
      }
      if (ratesRes.ok) {
        const data = await ratesRes.json();
        setRates(data.rates || []);
      }
      if (conversionsRes.ok) {
        const data = await conversionsRes.json();
        setConversions(data.conversions || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetupDefaults = async () => {
    try {
      const res = await fetch(`${API_BASE}/multi-currency/setup-defaults`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('デフォルト通貨を設定しました');
        fetchData();
      }
    } catch (error) {
      toast.error('設定に失敗しました');
    }
  };

  const handleCreateCurrency = async () => {
    try {
      const res = await fetch(`${API_BASE}/multi-currency/currencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCurrency),
      });
      if (res.ok) {
        toast.success('通貨を追加しました');
        setIsCreateDialogOpen(false);
        setNewCurrency({ code: '', name: '', symbol: '', decimalPlaces: 2 });
        fetchData();
      }
    } catch (error) {
      toast.error('追加に失敗しました');
    }
  };

  const handleConvert = async () => {
    try {
      const res = await fetch(`${API_BASE}/multi-currency/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convertForm),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${convertForm.amount} ${convertForm.fromCurrency} = ${data.result.convertedAmount.toFixed(2)} ${convertForm.toCurrency}`);
        setIsConvertDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      toast.error('換算に失敗しました');
    }
  };

  const handleUpdateRate = async () => {
    try {
      const res = await fetch(`${API_BASE}/multi-currency/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateForm),
      });
      if (res.ok) {
        toast.success('為替レートを更新しました');
        setIsRateDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      toast.error('更新に失敗しました');
    }
  };

  const toggleCurrencyActive = async (currency: Currency) => {
    try {
      const res = await fetch(`${API_BASE}/multi-currency/currencies/${currency.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currency.isActive }),
      });
      if (res.ok) {
        toast.success(`${currency.code}を${!currency.isActive ? '有効' : '無効'}にしました`);
        fetchData();
      }
    } catch (error) {
      toast.error('更新に失敗しました');
    }
  };

  const getCurrencyIcon = (code: string) => {
    switch (code) {
      case 'USD':
        return <DollarSign className="h-4 w-4" />;
      case 'EUR':
        return <Euro className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">多通貨管理</h1>
          <p className="text-muted-foreground">為替レートと通貨換算の管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新
          </Button>
          {currencies.length === 0 && (
            <Button onClick={handleSetupDefaults}>
              <Settings className="mr-2 h-4 w-4" />
              デフォルト設定
            </Button>
          )}
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">登録通貨</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCurrencies || 0}</div>
            <p className="text-xs text-muted-foreground">
              有効: {stats?.activeCurrencies || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">為替レート</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRates || 0}</div>
            <p className="text-xs text-muted-foreground">
              登録済みレート数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">換算履歴</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConversions || 0}</div>
            <p className="text-xs text-muted-foreground">
              今日: {stats?.recentConversions || 0}件
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">基準通貨</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.defaultCurrency || 'JPY'}</div>
            <p className="text-xs text-muted-foreground">
              デフォルト通貨
            </p>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="currencies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="currencies">通貨一覧</TabsTrigger>
          <TabsTrigger value="rates">為替レート</TabsTrigger>
          <TabsTrigger value="conversions">換算履歴</TabsTrigger>
          <TabsTrigger value="calculator">換算ツール</TabsTrigger>
        </TabsList>

        {/* 通貨一覧 */}
        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>通貨一覧</CardTitle>
                  <CardDescription>登録されている通貨の管理</CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      通貨追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規通貨追加</DialogTitle>
                      <DialogDescription>新しい通貨を登録します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>通貨コード</Label>
                          <Input
                            value={newCurrency.code}
                            onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                            placeholder="USD"
                            maxLength={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>記号</Label>
                          <Input
                            value={newCurrency.symbol}
                            onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                            placeholder="$"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>通貨名</Label>
                        <Input
                          value={newCurrency.name}
                          onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                          placeholder="米ドル"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>小数点以下桁数</Label>
                        <Input
                          type="number"
                          value={newCurrency.decimalPlaces}
                          onChange={(e) => setNewCurrency({ ...newCurrency, decimalPlaces: parseInt(e.target.value) })}
                          min={0}
                          max={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateCurrency}>追加</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>通貨</TableHead>
                    <TableHead>コード</TableHead>
                    <TableHead>記号</TableHead>
                    <TableHead>小数桁数</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getCurrencyIcon(currency.code)}
                          {currency.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{currency.code}</Badge>
                      </TableCell>
                      <TableCell>{currency.symbol}</TableCell>
                      <TableCell>{currency.decimalPlaces}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {currency.isActive ? (
                            <Badge className="bg-green-100 text-green-800">有効</Badge>
                          ) : (
                            <Badge variant="secondary">無効</Badge>
                          )}
                          {currency.isDefault && (
                            <Badge className="bg-amber-100 text-amber-800">デフォルト</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={currency.isActive}
                          onCheckedChange={() => toggleCurrencyActive(currency)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {currencies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        通貨が登録されていません。「デフォルト設定」をクリックして開始してください。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 為替レート */}
        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>為替レート</CardTitle>
                  <CardDescription>最新の為替レート一覧</CardDescription>
                </div>
                <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      レート追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>為替レート更新</DialogTitle>
                      <DialogDescription>為替レートを手動で更新します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>変換元</Label>
                          <Select
                            value={rateForm.fromCurrency}
                            onValueChange={(value) => setRateForm({ ...rateForm, fromCurrency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {currencies.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code} - {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>変換先</Label>
                          <Select
                            value={rateForm.toCurrency}
                            onValueChange={(value) => setRateForm({ ...rateForm, toCurrency: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {currencies.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code} - {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>レート</Label>
                        <Input
                          type="number"
                          value={rateForm.rate}
                          onChange={(e) => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) })}
                          step="0.0001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ソース</Label>
                        <Select
                          value={rateForm.source}
                          onValueChange={(value) => setRateForm({ ...rateForm, source: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">手動入力</SelectItem>
                            <SelectItem value="api">API取得</SelectItem>
                            <SelectItem value="bank">銀行レート</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRateDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleUpdateRate}>更新</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>通貨ペア</TableHead>
                    <TableHead>レート</TableHead>
                    <TableHead>ソース</TableHead>
                    <TableHead>有効開始</TableHead>
                    <TableHead>変動</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {rate.fromCurrency}
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                          {rate.toCurrency}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{rate.rate.toFixed(6)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rate.source}</Badge>
                      </TableCell>
                      <TableCell>{new Date(rate.validFrom).toLocaleString('ja-JP')}</TableCell>
                      <TableCell>
                        {Math.random() > 0.5 ? (
                          <div className="flex items-center text-green-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            +0.5%
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            -0.3%
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        為替レートが登録されていません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 換算履歴 */}
        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>換算履歴</CardTitle>
              <CardDescription>過去の通貨換算記録</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>変換元</TableHead>
                    <TableHead>変換先</TableHead>
                    <TableHead>使用レート</TableHead>
                    <TableHead>目的</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((conversion) => (
                    <TableRow key={conversion.id}>
                      <TableCell>{new Date(conversion.createdAt).toLocaleString('ja-JP')}</TableCell>
                      <TableCell className="font-mono">
                        {conversion.originalAmount.toLocaleString()} {conversion.fromCurrency}
                      </TableCell>
                      <TableCell className="font-mono">
                        {conversion.convertedAmount.toLocaleString()} {conversion.toCurrency}
                      </TableCell>
                      <TableCell className="font-mono">{conversion.rateUsed.toFixed(6)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{conversion.purpose}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {conversions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        換算履歴がありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 換算ツール */}
        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通貨換算ツール</CardTitle>
              <CardDescription>リアルタイムで通貨を換算します</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>金額</Label>
                    <Input
                      type="number"
                      value={convertForm.amount}
                      onChange={(e) => setConvertForm({ ...convertForm, amount: parseFloat(e.target.value) })}
                      className="text-2xl font-bold h-14"
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="col-span-2">
                      <Label>変換元</Label>
                      <Select
                        value={convertForm.fromCurrency}
                        onValueChange={(value) => setConvertForm({ ...convertForm, fromCurrency: value })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-center pt-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConvertForm({
                          ...convertForm,
                          fromCurrency: convertForm.toCurrency,
                          toCurrency: convertForm.fromCurrency,
                        })}
                      >
                        <ArrowRightLeft className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="col-span-2">
                      <Label>変換先</Label>
                      <Select
                        value={convertForm.toCurrency}
                        onValueChange={(value) => setConvertForm({ ...convertForm, toCurrency: value })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>目的</Label>
                    <Select
                      value={convertForm.purpose}
                      onValueChange={(value) => setConvertForm({ ...convertForm, purpose: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pricing">価格設定</SelectItem>
                        <SelectItem value="accounting">会計処理</SelectItem>
                        <SelectItem value="reporting">レポート</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleConvert} className="w-full" size="lg">
                    <Calculator className="mr-2 h-5 w-5" />
                    換算する
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
