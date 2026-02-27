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
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Plus,
  Eye,
  Trash2,
  BarChart3,
  Download,
  Calendar,
  RefreshCw,
  FileText,
  Wrench,
  ArrowRightLeft
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function WarrantyTrackerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/warranty-tracker/dashboard/overview`, fetcher);
  const { data: expiring } = useSWR(`${API_BASE}/ebay/warranty-tracker/dashboard/expiring`, fetcher);
  const { data: recentClaims } = useSWR(`${API_BASE}/ebay/warranty-tracker/dashboard/claims`, fetcher);
  const { data: warranties } = useSWR(`${API_BASE}/ebay/warranty-tracker/warranties`, fetcher);
  const { data: claims } = useSWR(`${API_BASE}/ebay/warranty-tracker/claims`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/warranty-tracker/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />有効</Badge>;
      case 'expired':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />期限切れ</Badge>;
      case 'claimed':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><FileText className="w-3 h-3 mr-1" />請求中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getClaimStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><RefreshCw className="w-3 h-3 mr-1" />処理中</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />承認</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />却下</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-600">Warranty Tracker</h1>
          <p className="text-gray-500">保証追跡</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            保証登録
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="warranties">保証管理</TabsTrigger>
          <TabsTrigger value="claims">請求管理</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総保証数</CardTitle>
                <Shield className="w-4 h-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalWarranties?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">有効: {overview?.activeWarranties}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">期限切れ間近</CardTitle>
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{overview?.expiringSoon}</div>
                <p className="text-xs text-muted-foreground">今月期限切れ: {overview?.expiredThisMonth}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">今月の請求</CardTitle>
                <Wrench className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.claimsThisMonth}</div>
                <p className="text-xs text-muted-foreground">請求率: {overview?.claimRate}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均請求額</CardTitle>
                <FileText className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{overview?.avgClaimValue?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">修理・交換コスト</p>
              </CardContent>
            </Card>
          </div>

          {/* Expiring Soon */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="w-5 h-5" />
                期限切れ間近の保証
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>購入者</TableHead>
                    <TableHead>期限日</TableHead>
                    <TableHead>残り日数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiring?.warranties?.map((war: any) => (
                    <TableRow key={war.id}>
                      <TableCell className="font-medium">{war.product}</TableCell>
                      <TableCell>{war.buyer}</TableCell>
                      <TableCell>{war.expiresAt}</TableCell>
                      <TableCell>
                        <Badge variant={war.daysLeft <= 7 ? 'destructive' : 'outline'}>
                          {war.daysLeft}日
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            延長
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Claims */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                最近の請求
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>申請日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentClaims?.claims?.map((claim: any) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.product}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {claim.type === 'repair' ? '修理' : claim.type === 'replacement' ? '交換' : '返金'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getClaimStatusBadge(claim.status)}</TableCell>
                      <TableCell>{claim.submittedAt}</TableCell>
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

        <TabsContent value="warranties" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>保証一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="商品名/購入者で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="active">有効</SelectItem>
                      <SelectItem value="expiring">期限間近</SelectItem>
                      <SelectItem value="expired">期限切れ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    新規登録
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>購入者</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>期間</TableHead>
                    <TableHead>開始日</TableHead>
                    <TableHead>期限日</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warranties?.warranties?.map((war: any) => (
                    <TableRow key={war.id}>
                      <TableCell className="font-medium">{war.product}</TableCell>
                      <TableCell>{war.buyer}</TableCell>
                      <TableCell>
                        <Badge variant={war.type === 'extended' ? 'default' : 'outline'}>
                          {war.type === 'extended' ? '延長' : '標準'}
                        </Badge>
                      </TableCell>
                      <TableCell>{war.duration}ヶ月</TableCell>
                      <TableCell>{war.startDate}</TableCell>
                      <TableCell>{war.expiresAt}</TableCell>
                      <TableCell>{getStatusBadge(war.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><RefreshCw className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><ArrowRightLeft className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>請求一覧</CardTitle>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="processing">処理中</SelectItem>
                      <SelectItem value="approved">承認済</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    請求作成
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>請求ID</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>購入者</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>コスト</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>申請日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims?.claims?.map((claim: any) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-mono">{claim.id}</TableCell>
                      <TableCell className="font-medium">{claim.product}</TableCell>
                      <TableCell>{claim.buyer}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {claim.type === 'repair' ? '修理' : claim.type === 'replacement' ? '交換' : '返金'}
                        </Badge>
                      </TableCell>
                      <TableCell>¥{claim.cost?.toLocaleString()}</TableCell>
                      <TableCell>{getClaimStatusBadge(claim.status)}</TableCell>
                      <TableCell>{claim.submittedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          {claim.status === 'processing' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600"><CheckCircle className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-600"><XCircle className="w-4 h-4" /></Button>
                            </>
                          )}
                        </div>
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
                  <Wrench className="w-5 h-5 text-indigo-600" />
                  請求分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>総請求数</span>
                    <span className="text-xl font-bold">125</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>承認率</span>
                    <span className="text-xl font-bold">85.6%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均解決日数</span>
                    <span className="text-xl font-bold">8.5日</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>総コスト</span>
                    <span className="text-xl font-bold text-red-600">¥1,250,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  期限分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>7日以内</span>
                    <Badge variant="destructive">25件</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>30日以内</span>
                    <Badge variant="outline" className="border-orange-500 text-orange-600">85件</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>90日以内</span>
                    <Badge variant="outline">245件</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                請求カテゴリ別
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-indigo-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-indigo-600">36%</div>
                  <div className="text-sm text-indigo-700">ムーブメント</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">22.4%</div>
                  <div className="text-sm text-blue-700">水没</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">20%</div>
                  <div className="text-sm text-purple-700">ディスプレイ</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-600">21.6%</div>
                  <div className="text-sm text-gray-700">その他</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                レポート作成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20">
                  <div className="text-center">
                    <Shield className="w-6 h-6 mx-auto mb-1" />
                    <div>保証サマリー</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-20">
                  <div className="text-center">
                    <Wrench className="w-6 h-6 mx-auto mb-1" />
                    <div>請求レポート</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-20">
                  <div className="text-center">
                    <Calendar className="w-6 h-6 mx-auto mb-1" />
                    <div>期限レポート</div>
                  </div>
                </Button>
                <Button variant="outline" className="h-20">
                  <div className="text-center">
                    <BarChart3 className="w-6 h-6 mx-auto mb-1" />
                    <div>コスト分析</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動登録</p>
                  <p className="text-sm text-gray-500">注文完了時に自動で保証を登録</p>
                </div>
                <Switch checked={settings?.settings?.autoRegister} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">期限通知</p>
                  <p className="text-sm text-gray-500">期限切れ前に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyExpiringSoon} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">請求通知</p>
                  <p className="text-sm text-gray-500">新規請求時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnClaim} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">デフォルト保証期間（月）</label>
                  <Input type="number" defaultValue={settings?.settings?.defaultWarrantyDuration || 12} />
                </div>
                <div>
                  <label className="text-sm font-medium">延長保証期間（月）</label>
                  <Input type="number" defaultValue={settings?.settings?.extendedWarrantyDuration || 24} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">通知タイミング（日前）</label>
                  <Input type="number" defaultValue={settings?.settings?.notifyDaysBefore || 30} />
                </div>
                <div>
                  <label className="text-sm font-medium">最大請求回数</label>
                  <Input type="number" defaultValue={settings?.settings?.maxClaimsPerWarranty || 3} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">自動承認閾値（円）</label>
                <Input type="number" defaultValue={settings?.settings?.claimAutoApproveThreshold || 10000} />
              </div>

              <Button className="bg-indigo-600 hover:bg-indigo-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
