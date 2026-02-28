
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
  AlertTriangle,
  Eye,
  Trash2,
  Settings,
  Plus,
  Download,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Flag,
  Ban,
  FileWarning,
  Radar,
  Building
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function BrandProtectionPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/brand-protection/dashboard/overview`, fetcher);
  const { data: violations } = useSWR(`${API_BASE}/ebay/brand-protection/dashboard/violations`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/brand-protection/dashboard/alerts`, fetcher);
  const { data: brands } = useSWR(`${API_BASE}/ebay/brand-protection/brands`, fetcher);
  const { data: allViolations } = useSWR(`${API_BASE}/ebay/brand-protection/violations`, fetcher);
  const { data: monitoring } = useSWR(`${API_BASE}/ebay/brand-protection/monitoring`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/brand-protection/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />解決済み</Badge>;
      case 'reported':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Flag className="w-3 h-3 mr-1" />報告済み</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />保留中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getViolationTypeBadge = (type: string) => {
    switch (type) {
      case 'counterfeit':
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />偽造品</Badge>;
      case 'trademark_infringement':
        return <Badge variant="outline" className="border-red-500 text-red-600"><FileWarning className="w-3 h-3 mr-1" />商標侵害</Badge>;
      case 'unauthorized_seller':
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><AlertTriangle className="w-3 h-3 mr-1" />無許可販売</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-lime-600">Brand Protection</h1>
          <p className="text-gray-500">ブランド保護</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-lime-600 hover:bg-lime-700">
            <Plus className="w-4 h-4 mr-2" />
            ブランド登録
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="brands">ブランド管理</TabsTrigger>
          <TabsTrigger value="violations">違反管理</TabsTrigger>
          <TabsTrigger value="monitoring">監視設定</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">登録ブランド</CardTitle>
                <Shield className="w-4 h-4 text-lime-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.registeredBrands}</div>
                <p className="text-xs text-muted-foreground">保護出品: {overview?.protectedListings}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">検出違反</CardTitle>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overview?.violationsDetected}</div>
                <p className="text-xs text-muted-foreground">保留: {overview?.pendingReview}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">解決済み</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overview?.violationsResolved}</div>
                <p className="text-xs text-muted-foreground">平均: {overview?.avgResolutionTime}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">テイクダウン成功率</CardTitle>
                <Ban className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.takedownSuccess}%</div>
                <Progress value={overview?.takedownSuccess} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {alerts?.alerts?.length > 0 && (
            <Card className="border-lime-200 bg-lime-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lime-700">
                  <AlertTriangle className="w-5 h-5" />
                  アラート
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className={`p-3 rounded-lg ${alert.priority === 'high' ? 'bg-red-100' : alert.priority === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant={alert.priority === 'high' ? 'destructive' : 'outline'} className="mb-1">
                            {alert.type}
                          </Badge>
                          <p className="text-sm">{alert.message}</p>
                        </div>
                        <Button size="sm" variant="outline">確認</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Violations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-lime-600" />
                最近の違反
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ブランド</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>プラットフォーム</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>検出日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations?.violations?.map((vio: any) => (
                    <TableRow key={vio.id}>
                      <TableCell className="font-medium">{vio.brand}</TableCell>
                      <TableCell>{getViolationTypeBadge(vio.type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vio.platform}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(vio.status)}</TableCell>
                      <TableCell>{vio.detectedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          {vio.status === 'pending' && (
                            <Button size="sm" className="bg-lime-600 hover:bg-lime-700">
                              <Flag className="w-3 h-3 mr-1" />
                              報告
                            </Button>
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

        <TabsContent value="brands" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>登録ブランド</CardTitle>
                <Button className="bg-lime-600 hover:bg-lime-700">
                  <Plus className="w-4 h-4 mr-2" />
                  ブランド登録
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ブランド名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>商標番号</TableHead>
                    <TableHead>保護出品</TableHead>
                    <TableHead>違反件数</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands?.brands?.map((brand: any) => (
                    <TableRow key={brand.id}>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell>
                        <Badge variant={brand.type === 'owned' ? 'default' : 'outline'}>
                          {brand.type === 'owned' ? '自社' : '認可'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{brand.trademarkNumber}</TableCell>
                      <TableCell>{brand.protectedListings}</TableCell>
                      <TableCell className="text-red-600">{brand.violations}</TableCell>
                      <TableCell>
                        {brand.status === 'active' ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>違反一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="ブランド/販売者で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">保留中</SelectItem>
                      <SelectItem value="resolved">解決済み</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ブランド</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>プラットフォーム</TableHead>
                    <TableHead>販売者</TableHead>
                    <TableHead>出品ID</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allViolations?.violations?.map((vio: any) => (
                    <TableRow key={vio.id}>
                      <TableCell className="font-medium">{vio.brand}</TableCell>
                      <TableCell>{getViolationTypeBadge(vio.type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{vio.platform}</Badge>
                      </TableCell>
                      <TableCell>{vio.seller}</TableCell>
                      <TableCell className="font-mono">{vio.listing}</TableCell>
                      <TableCell>{getStatusBadge(vio.status)}</TableCell>
                      <TableCell>{vio.detectedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-600"><Ban className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Radar className="w-5 h-5 text-lime-600" />
                  監視設定
                </CardTitle>
                <Button className="bg-lime-600 hover:bg-lime-700">
                  <Plus className="w-4 h-4 mr-2" />
                  監視追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ブランド</TableHead>
                    <TableHead>プラットフォーム</TableHead>
                    <TableHead>キーワード</TableHead>
                    <TableHead>頻度</TableHead>
                    <TableHead>最終実行</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoring?.monitors?.map((mon: any) => (
                    <TableRow key={mon.id}>
                      <TableCell className="font-medium">{mon.brand}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{mon.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {mon.keywords?.slice(0, 2).map((kw: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{kw}</Badge>
                          ))}
                          {mon.keywords?.length > 2 && <Badge variant="secondary">+{mon.keywords.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{mon.frequency}</TableCell>
                      <TableCell>{mon.lastRun}</TableCell>
                      <TableCell>
                        {mon.active ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
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

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5 text-lime-600" />
                  違反分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>総違反件数</span>
                    <span className="text-xl font-bold">125</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>解決済み</span>
                    <span className="text-xl font-bold text-green-600">112</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>解決率</span>
                    <span className="text-xl font-bold">89.6%</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>偽造品</span>
                      <span>52%</span>
                    </div>
                    <Progress value={52} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>商標侵害</span>
                      <span>28%</span>
                    </div>
                    <Progress value={28} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>無許可販売</span>
                      <span>20%</span>
                    </div>
                    <Progress value={20} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-lime-600" />
                  テイクダウン分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-lime-600">92.5%</div>
                    <div className="text-sm text-gray-500">成功率</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">104</div>
                      <div className="text-xs text-green-700">成功</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">5</div>
                      <div className="text-xs text-yellow-700">保留中</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">3</div>
                      <div className="text-xs text-red-700">却下</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-lime-600" />
                トレンド
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                違反検出トレンドチャート
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-lime-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動検出</p>
                  <p className="text-sm text-gray-500">違反を自動で検出</p>
                </div>
                <Switch checked={settings?.settings?.autoDetect} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動報告</p>
                  <p className="text-sm text-gray-500">検出時に自動で報告</p>
                </div>
                <Switch checked={settings?.settings?.autoReport} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">違反通知</p>
                  <p className="text-sm text-gray-500">新規違反検出時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnViolation} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI検出</p>
                  <p className="text-sm text-gray-500">AIによる画像/テキスト分析</p>
                </div>
                <Switch checked={settings?.settings?.enableAiDetection} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">スキャン頻度</label>
                  <Select defaultValue={settings?.settings?.scanFrequency || 'hourly'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">毎時</SelectItem>
                      <SelectItem value="daily">毎日</SelectItem>
                      <SelectItem value="weekly">毎週</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">最低信頼度（%）</label>
                  <Input type="number" defaultValue={settings?.settings?.minConfidence || 80} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">価格閾値（%）</label>
                <Input type="number" defaultValue={settings?.settings?.priceThreshold || 50} />
                <p className="text-xs text-gray-500 mt-1">MSRPの何%以下で偽造品疑い</p>
              </div>

              <Button className="bg-lime-600 hover:bg-lime-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
