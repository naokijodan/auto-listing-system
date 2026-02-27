// @ts-nocheck
'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  Settings,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  BarChart3,
  Download,
  Upload,
  CreditCard,
  Calendar,
  Building,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SupplierInvoiceManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/supplier-invoice-manager/dashboard/overview`, fetcher);
  const { data: upcoming } = useSWR(`${API_BASE}/ebay/supplier-invoice-manager/dashboard/upcoming`, fetcher);
  const { data: overdue } = useSWR(`${API_BASE}/ebay/supplier-invoice-manager/dashboard/overdue`, fetcher);
  const { data: invoices } = useSWR(`${API_BASE}/ebay/supplier-invoice-manager/invoices`, fetcher);
  const { data: payments } = useSWR(`${API_BASE}/ebay/supplier-invoice-manager/payments`, fetcher);
  const { data: suppliers } = useSWR(`${API_BASE}/ebay/supplier-invoice-manager/suppliers`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/supplier-invoice-manager/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />未払い</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />支払済</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />延滞</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><CheckCircle className="w-3 h-3 mr-1" />承認済</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-teal-600">Supplier Invoice Manager</h1>
          <p className="text-gray-500">仕入れ請求書管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            OCR取込
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            請求書追加
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="invoices">請求書</TabsTrigger>
          <TabsTrigger value="payments">支払い</TabsTrigger>
          <TabsTrigger value="suppliers">サプライヤー別</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総請求書数</CardTitle>
                <FileText className="w-4 h-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">未払い: {overview?.pendingPayment}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">延滞</CardTitle>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overview?.overdueInvoices}</div>
                <p className="text-xs text-muted-foreground">要対応</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">未払い残高</CardTitle>
                <DollarSign className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{overview?.outstandingBalance?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">今月支払済: ¥{overview?.paidThisMonth?.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均支払日数</CardTitle>
                <Clock className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgPaymentTime}</div>
                <p className="text-xs text-muted-foreground">支払いサイクル</p>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Invoices */}
          {overdue?.invoices?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  延滞請求書
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>請求書番号</TableHead>
                      <TableHead>サプライヤー</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>期限</TableHead>
                      <TableHead>延滞日数</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdue?.invoices?.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.id}</TableCell>
                        <TableCell className="font-medium">{inv.supplier}</TableCell>
                        <TableCell>¥{inv.amount?.toLocaleString()}</TableCell>
                        <TableCell>{inv.dueDate}</TableCell>
                        <TableCell className="text-red-600 font-bold">{inv.daysOverdue}日</TableCell>
                        <TableCell>
                          <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                            <CreditCard className="w-3 h-3 mr-1" />
                            支払う
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                支払い予定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>請求書番号</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>支払期限</TableHead>
                    <TableHead>残り日数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcoming?.payments?.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">{payment.id}</TableCell>
                      <TableCell className="font-medium">{payment.supplier}</TableCell>
                      <TableCell>¥{payment.amount?.toLocaleString()}</TableCell>
                      <TableCell>{payment.dueDate}</TableCell>
                      <TableCell>
                        <Badge variant={payment.daysUntil <= 3 ? 'destructive' : 'outline'}>
                          {payment.daysUntil}日後
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                            <CreditCard className="w-3 h-3 mr-1" />
                            支払う
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>請求書一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="請求書番号/サプライヤーで検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">未払い</SelectItem>
                      <SelectItem value="paid">支払済</SelectItem>
                      <SelectItem value="overdue">延滞</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>請求書番号</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>発行日</TableHead>
                    <TableHead>支払期限</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.invoices?.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono">{inv.number}</TableCell>
                      <TableCell className="font-medium">{inv.supplier}</TableCell>
                      <TableCell>¥{inv.amount?.toLocaleString()}</TableCell>
                      <TableCell>{inv.issued}</TableCell>
                      <TableCell>{inv.due}</TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          {inv.status === 'pending' && (
                            <Button variant="ghost" size="sm" className="text-teal-600">
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>支払い履歴</CardTitle>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <CreditCard className="w-4 h-4 mr-2" />
                  一括支払い
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>支払ID</TableHead>
                    <TableHead>請求書番号</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>支払方法</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>支払日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.payments?.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">{payment.id}</TableCell>
                      <TableCell className="font-mono">{payment.invoice}</TableCell>
                      <TableCell className="font-medium">{payment.supplier}</TableCell>
                      <TableCell>¥{payment.amount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.method === 'bank_transfer' ? '銀行振込' : 'クレカ'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />完了
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.paidAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>サプライヤー別サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>総請求書数</TableHead>
                    <TableHead>未払い残高</TableHead>
                    <TableHead>支払済み</TableHead>
                    <TableHead>平均支払日数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers?.suppliers?.map((supplier: any) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.totalInvoices}</TableCell>
                      <TableCell className="text-orange-600">¥{supplier.outstanding?.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">¥{supplier.paid?.toLocaleString()}</TableCell>
                      <TableCell>{supplier.avgPaymentDays}日</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-teal-600" />
                  キャッシュフロー予測
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>現在残高</span>
                    <span className="text-xl font-bold">¥3,500,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>未払い総額</span>
                    <span className="text-xl font-bold text-orange-600">¥1,250,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>週平均支払</span>
                    <span className="text-xl font-bold">¥850,000</span>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      W11に¥100,000の不足が予測されます
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-teal-600" />
                  サプライヤー別支出
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Tokyo Watches</span>
                      <span>42.5%</span>
                    </div>
                    <Progress value={42.5} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Casio Direct</span>
                      <span>31.3%</span>
                    </div>
                    <Progress value={31.3} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Orient Store</span>
                      <span>21.6%</span>
                    </div>
                    <Progress value={21.6} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>その他</span>
                      <span>4.5%</span>
                    </div>
                    <Progress value={4.5} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                支払期限分析（Aging）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">¥650,000</div>
                  <div className="text-sm text-green-700">期限内</div>
                  <div className="text-xs text-gray-500">15件</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">¥420,000</div>
                  <div className="text-sm text-yellow-700">1-30日</div>
                  <div className="text-xs text-gray-500">8件</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">¥150,000</div>
                  <div className="text-sm text-orange-700">31-60日</div>
                  <div className="text-xs text-gray-500">3件</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">¥50,000</div>
                  <div className="text-sm text-red-700">61-90日</div>
                  <div className="text-xs text-gray-500">1件</div>
                </div>
                <div className="p-4 bg-red-100 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-700">¥30,000</div>
                  <div className="text-sm text-red-800">90日超</div>
                  <div className="text-xs text-gray-500">1件</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">OCR取込</p>
                  <p className="text-sm text-gray-500">請求書の自動解析を有効化</p>
                </div>
                <Switch checked={settings?.settings?.ocrEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">新規請求書通知</p>
                  <p className="text-sm text-gray-500">請求書登録時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnNewInvoice} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">支払期限通知</p>
                  <p className="text-sm text-gray-500">期限前に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnDue} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">延滞通知</p>
                  <p className="text-sm text-gray-500">延滞発生時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnOverdue} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">デフォルト支払サイクル（日）</label>
                  <Input type="number" defaultValue={settings?.settings?.defaultPaymentTerms || 30} />
                </div>
                <div>
                  <label className="text-sm font-medium">自動承認閾値（円）</label>
                  <Input type="number" defaultValue={settings?.settings?.autoApproveThreshold || 100000} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">通知タイミング（日前）</label>
                <Input type="number" defaultValue={settings?.settings?.notifyDaysBefore || 3} />
              </div>

              <Button className="bg-teal-600 hover:bg-teal-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
