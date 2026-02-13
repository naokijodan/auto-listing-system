'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  RefreshCw,
  Plus,
  Target,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ProfitStats {
  totalCalculations: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgProfitMargin: number;
  profitableCount: number;
  lossCount: number;
  byStatus: { status: string; count: number }[];
}

interface ProfitCalculation {
  id: string;
  listingId: string;
  salePrice: number;
  saleCurrency: string;
  totalCost: number;
  totalFees: number;
  totalCostUsd: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  profitStatus: string;
  createdAt: string;
  cost?: { purchasePrice: number; supplierName?: string };
}

interface FeeStructure {
  id: string;
  name: string;
  platform: string;
  finalValueFeePercent: number;
  fixedFeeAmount: number;
  paymentFeePercent: number;
  paymentFixedFee: number;
  isDefault: boolean;
}

interface ProfitTarget {
  id: string;
  name: string;
  targetType: string;
  minProfitMargin: number;
  targetProfitMargin: number;
  isDefault: boolean;
}

interface SimulationResult {
  result: {
    totalCostJpy: number;
    totalCostUsd: number;
    ebayFinalValueFee: number;
    paypalFee: number;
    totalFees: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  breakEvenPrice: number;
  suggestedPrices: { targetMargin: number; suggestedPrice: number }[];
}

export default function ProfitCalculationPage() {
  const [stats, setStats] = useState<ProfitStats | null>(null);
  const [calculations, setCalculations] = useState<ProfitCalculation[]>([]);
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [targets, setTargets] = useState<ProfitTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalculateDialogOpen, setIsCalculateDialogOpen] = useState(false);
  const [isSimulateDialogOpen, setIsSimulateDialogOpen] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const [calculateForm, setCalculateForm] = useState({
    listingId: '',
    salePrice: 100,
    purchasePrice: 5000,
    domesticShipping: 500,
    internationalShipping: 2000,
    exchangeRate: 150,
  });

  const [simulateForm, setSimulateForm] = useState({
    salePrice: 100,
    purchasePrice: 5000,
    domesticShipping: 500,
    internationalShipping: 2000,
    exchangeRate: 150,
    ebayFeePercent: 12.9,
    paypalFeePercent: 2.9,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, calculationsRes, feesRes, targetsRes] = await Promise.all([
        fetch(`${API_BASE}/profit-calculation/stats`),
        fetch(`${API_BASE}/profit-calculation/listings?limit=20`),
        fetch(`${API_BASE}/profit-calculation/fees`),
        fetch(`${API_BASE}/profit-calculation/targets`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (calculationsRes.ok) {
        const data = await calculationsRes.json();
        setCalculations(data.calculations || []);
      }
      if (feesRes.ok) setFees(await feesRes.json());
      if (targetsRes.ok) setTargets(await targetsRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfit = async () => {
    try {
      const res = await fetch(`${API_BASE}/profit-calculation/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calculateForm),
      });

      if (res.ok) {
        setIsCalculateDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to calculate profit:', error);
    }
  };

  const simulateProfit = async () => {
    try {
      const res = await fetch(`${API_BASE}/profit-calculation/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulateForm),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data);
      }
    } catch (error) {
      console.error('Failed to simulate profit:', error);
    }
  };

  const getProfitStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; color: string }> = {
      HIGHLY_PROFITABLE: { variant: 'default', label: '高利益', color: 'text-green-600' },
      PROFITABLE: { variant: 'default', label: '利益あり', color: 'text-green-500' },
      MARGINAL: { variant: 'secondary', label: '微利益', color: 'text-yellow-600' },
      BREAK_EVEN: { variant: 'outline', label: '収支トントン', color: 'text-gray-600' },
      LOSS: { variant: 'destructive', label: '赤字', color: 'text-red-600' },
    };
    const { variant, label, color } = config[status] || { variant: 'outline', label: status, color: '' };
    return <Badge variant={variant} className={color}>{label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">利益計算・原価管理</h1>
          <p className="text-muted-foreground">出品の利益率を計算・管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Dialog open={isSimulateDialogOpen} onOpenChange={setIsSimulateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calculator className="h-4 w-4 mr-2" />
                シミュレーション
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>利益シミュレーション</DialogTitle>
                <DialogDescription>価格を変更した場合の利益を計算</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>販売価格（USD）</Label>
                  <Input
                    type="number"
                    value={simulateForm.salePrice}
                    onChange={(e) =>
                      setSimulateForm({ ...simulateForm, salePrice: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>仕入れ価格（JPY）</Label>
                  <Input
                    type="number"
                    value={simulateForm.purchasePrice}
                    onChange={(e) =>
                      setSimulateForm({ ...simulateForm, purchasePrice: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>国内送料（JPY）</Label>
                  <Input
                    type="number"
                    value={simulateForm.domesticShipping}
                    onChange={(e) =>
                      setSimulateForm({ ...simulateForm, domesticShipping: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>国際送料（JPY）</Label>
                  <Input
                    type="number"
                    value={simulateForm.internationalShipping}
                    onChange={(e) =>
                      setSimulateForm({ ...simulateForm, internationalShipping: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>為替レート（JPY/USD）</Label>
                  <Input
                    type="number"
                    value={simulateForm.exchangeRate}
                    onChange={(e) =>
                      setSimulateForm({ ...simulateForm, exchangeRate: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>eBay手数料（%）</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={simulateForm.ebayFeePercent}
                    onChange={(e) =>
                      setSimulateForm({ ...simulateForm, ebayFeePercent: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
              <Button onClick={simulateProfit} className="w-full">
                計算
              </Button>
              {simulationResult && (
                <div className="space-y-4 mt-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">計算結果</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>原価（USD）:</div>
                      <div className="text-right">${simulationResult.result.totalCostUsd.toFixed(2)}</div>
                      <div>手数料合計:</div>
                      <div className="text-right">${simulationResult.result.totalFees.toFixed(2)}</div>
                      <div>純利益:</div>
                      <div className={`text-right font-bold ${simulationResult.result.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${simulationResult.result.netProfit.toFixed(2)}
                      </div>
                      <div>利益率:</div>
                      <div className={`text-right font-bold ${simulationResult.result.profitMargin >= 15 ? 'text-green-600' : 'text-red-600'}`}>
                        {simulationResult.result.profitMargin.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">損益分岐点: ${simulationResult.breakEvenPrice.toFixed(2)}</h4>
                    <h4 className="font-medium mt-4 mb-2">目標利益率での推奨価格</h4>
                    <div className="space-y-1">
                      {simulationResult.suggestedPrices.map((sp) => (
                        <div key={sp.targetMargin} className="flex justify-between text-sm">
                          <span>利益率 {sp.targetMargin}%:</span>
                          <span className="font-medium">${sp.suggestedPrice}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSimulateDialogOpen(false)}>
                  閉じる
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isCalculateDialogOpen} onOpenChange={setIsCalculateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                利益計算
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>利益計算</DialogTitle>
                <DialogDescription>出品の利益を計算して保存</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>出品ID</Label>
                  <Input
                    value={calculateForm.listingId}
                    onChange={(e) =>
                      setCalculateForm({ ...calculateForm, listingId: e.target.value })
                    }
                    placeholder="listing-id"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>販売価格（USD）</Label>
                    <Input
                      type="number"
                      value={calculateForm.salePrice}
                      onChange={(e) =>
                        setCalculateForm({ ...calculateForm, salePrice: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>仕入れ価格（JPY）</Label>
                    <Input
                      type="number"
                      value={calculateForm.purchasePrice}
                      onChange={(e) =>
                        setCalculateForm({ ...calculateForm, purchasePrice: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>国内送料（JPY）</Label>
                    <Input
                      type="number"
                      value={calculateForm.domesticShipping}
                      onChange={(e) =>
                        setCalculateForm({ ...calculateForm, domesticShipping: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>国際送料（JPY）</Label>
                    <Input
                      type="number"
                      value={calculateForm.internationalShipping}
                      onChange={(e) =>
                        setCalculateForm({ ...calculateForm, internationalShipping: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCalculateDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={calculateProfit}>計算して保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenue.toFixed(2) || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.totalCalculations || 0}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総原価</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalCost.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総利益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats?.totalProfit.toFixed(2) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均利益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.avgProfitMargin || 0) >= 15 ? 'text-green-600' : 'text-yellow-600'}`}>
              {stats?.avgProfitMargin.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">赤字商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.lossCount || 0}</div>
            <p className="text-xs text-muted-foreground">黒字: {stats?.profitableCount || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calculations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculations">
            <DollarSign className="h-4 w-4 mr-2" />
            利益計算
          </TabsTrigger>
          <TabsTrigger value="fees">
            <Settings className="h-4 w-4 mr-2" />
            手数料設定
          </TabsTrigger>
          <TabsTrigger value="targets">
            <Target className="h-4 w-4 mr-2" />
            利益目標
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>利益計算一覧</CardTitle>
              <CardDescription>出品別の利益計算結果</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calculations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    利益計算がありません
                  </p>
                ) : (
                  calculations.map((calc) => (
                    <div
                      key={calc.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {calc.profitStatus === 'LOSS' ? (
                          <TrendingDown className="h-8 w-8 text-red-500" />
                        ) : (
                          <TrendingUp className="h-8 w-8 text-green-500" />
                        )}
                        <div>
                          <h4 className="font-medium">Listing: {calc.listingId.substring(0, 12)}...</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>売価: ${calc.salePrice.toFixed(2)}</span>
                            <span>原価: ${calc.totalCostUsd.toFixed(2)}</span>
                            <span>手数料: ${calc.totalFees.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${calc.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${calc.netProfit.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {calc.profitMargin.toFixed(1)}%
                          </div>
                        </div>
                        {getProfitStatusBadge(calc.profitStatus)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>手数料設定</CardTitle>
              <CardDescription>プラットフォーム別の手数料設定</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fees.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">手数料設定がありません</p>
                    <div className="p-4 bg-muted rounded-lg text-left">
                      <h4 className="font-medium mb-2">デフォルト手数料（eBay US）</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Final Value Fee:</div>
                        <div>12.9%</div>
                        <div>Fixed Fee:</div>
                        <div>$0.30</div>
                        <div>PayPal Fee:</div>
                        <div>2.9% + $0.30</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  fees.map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{fee.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{fee.platform}</Badge>
                          {fee.isDefault && <Badge>デフォルト</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div>FVF: {fee.finalValueFeePercent}%</div>
                        <div>Payment: {fee.paymentFeePercent}%</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>利益目標</CardTitle>
              <CardDescription>目標利益率の設定</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {targets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">利益目標が設定されていません</p>
                    <div className="p-4 bg-muted rounded-lg text-left">
                      <h4 className="font-medium mb-2">推奨設定</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>最低利益率:</div>
                        <div>15%</div>
                        <div>目標利益率:</div>
                        <div>25%</div>
                        <div>アラート閾値:</div>
                        <div>10%未満</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  targets.map((target) => (
                    <div
                      key={target.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{target.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{target.targetType}</Badge>
                          {target.isDefault && <Badge>デフォルト</Badge>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          最低: {target.minProfitMargin}%
                        </div>
                        <div className="font-bold text-green-600">
                          目標: {target.targetProfitMargin}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
