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
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  Camera,
  Clock,
  BarChart3,
  Download
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function QualityControlManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/quality-control-manager/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/quality-control-manager/dashboard/recent`, fetcher);
  const { data: defectsSummary } = useSWR(`${API_BASE}/ebay/quality-control-manager/dashboard/defects`, fetcher);
  const { data: inspections } = useSWR(`${API_BASE}/ebay/quality-control-manager/inspections`, fetcher);
  const { data: checklists } = useSWR(`${API_BASE}/ebay/quality-control-manager/checklists`, fetcher);
  const { data: defects } = useSWR(`${API_BASE}/ebay/quality-control-manager/defects`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/quality-control-manager/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sky-600">Quality Control Manager</h1>
          <p className="text-gray-500">品質管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-sky-600 hover:bg-sky-700">
            <ClipboardCheck className="w-4 h-4 mr-2" />
            検査開始
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="inspections">検査</TabsTrigger>
          <TabsTrigger value="checklists">チェックリスト</TabsTrigger>
          <TabsTrigger value="defects">欠陥</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総検査数</CardTitle>
                <ClipboardCheck className="w-4 h-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalInspections?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">保留: {overview?.pendingInspections}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">合格率</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.passRate}%</div>
                <Progress value={overview?.passRate || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">欠陥発見</CardTitle>
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.defectsFound}</div>
                <p className="text-xs text-muted-foreground">解決済み: {overview?.issuesResolved}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均検査時間</CardTitle>
                <Clock className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgInspectionTime}</div>
                <p className="text-xs text-muted-foreground">1商品あたり</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Inspections */}
          <Card>
            <CardHeader>
              <CardTitle>最近の検査</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>結果</TableHead>
                    <TableHead>検査者</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>備考</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent?.inspections?.map((insp: any) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-medium">{insp.product}</TableCell>
                      <TableCell>
                        {insp.result === 'pass' ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />合格
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />不合格
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{insp.inspector}</TableCell>
                      <TableCell>{insp.date}</TableCell>
                      <TableCell>
                        {insp.defects && insp.defects.length > 0 && (
                          <span className="text-red-600 text-sm">{insp.defects[0]}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Defects Summary */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>欠陥タイプ別</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {defectsSummary?.defects?.byType?.map((type: any) => (
                    <div key={type.type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{type.type}</span>
                        <span>{type.count} ({type.percentage}%)</span>
                      </div>
                      <Progress value={type.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>サプライヤー別欠陥率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {defectsSummary?.defects?.bySupplier?.map((sup: any) => (
                    <div key={sup.supplier} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{sup.supplier}</span>
                      <div className="text-right">
                        <span className="font-mono">{sup.count}件</span>
                        <Badge variant={sup.rate < 2 ? 'default' : sup.rate < 4 ? 'secondary' : 'destructive'} className="ml-2">
                          {sup.rate}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>検査一覧</CardTitle>
                  <CardDescription>品質検査の記録</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="結果" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pass">合格</SelectItem>
                      <SelectItem value="fail">不合格</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-sky-600 hover:bg-sky-700">
                    <Plus className="w-4 h-4 mr-2" />
                    検査開始
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>チェックリスト</TableHead>
                    <TableHead>結果</TableHead>
                    <TableHead>検査者</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections?.inspections?.map((insp: any) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-medium">{insp.product}</TableCell>
                      <TableCell className="font-mono text-sm">{insp.sku}</TableCell>
                      <TableCell>{insp.checklist}</TableCell>
                      <TableCell>
                        {insp.result === 'pass' ? (
                          <Badge variant="default" className="bg-green-600">合格</Badge>
                        ) : (
                          <Badge variant="destructive">不合格</Badge>
                        )}
                      </TableCell>
                      <TableCell>{insp.inspector}</TableCell>
                      <TableCell>{insp.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>チェックリスト</CardTitle>
                  <CardDescription>検査チェックリストの管理</CardDescription>
                </div>
                <Button className="bg-sky-600 hover:bg-sky-700">
                  <Plus className="w-4 h-4 mr-2" />
                  チェックリスト作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checklists?.checklists?.map((checklist: any) => (
                  <div key={checklist.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="w-6 h-6 text-sky-600" />
                        <div>
                          <h3 className="font-medium">{checklist.name}</h3>
                          <p className="text-sm text-gray-500">{checklist.items}項目 | {checklist.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch checked={checklist.active} />
                        <Button variant="outline" size="sm">編集</Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defects" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>欠陥一覧</CardTitle>
                  <CardDescription>発見された欠陥の管理</CardDescription>
                </div>
                <Select>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="open">未解決</SelectItem>
                    <SelectItem value="resolved">解決済み</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>重大度</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defects?.defects?.map((defect: any) => (
                    <TableRow key={defect.id}>
                      <TableCell className="font-medium">{defect.product}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{defect.type}</Badge>
                      </TableCell>
                      <TableCell>{defect.description}</TableCell>
                      <TableCell>
                        <Badge variant={defect.severity === 'high' ? 'destructive' : defect.severity === 'medium' ? 'secondary' : 'outline'}>
                          {defect.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={defect.status === 'resolved' ? 'default' : 'outline'}>
                          {defect.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{defect.date}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {defect.status === 'open' && (
                            <Button variant="outline" size="sm">解決</Button>
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

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>品質レポート</CardTitle>
              <CardDescription>品質管理のサマリー</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-64">
              <BarChart3 className="w-12 h-12 text-gray-400" />
              <span className="ml-2 text-gray-500">レポート表示エリア</span>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>品質管理の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルトチェックリスト</p>
                  <p className="text-sm text-gray-500">検査時のデフォルト</p>
                </div>
                <Select defaultValue={settings?.settings?.defaultChecklist}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checklist_001">Watch Standard</SelectItem>
                    <SelectItem value="checklist_002">Electronics Basic</SelectItem>
                    <SelectItem value="checklist_003">Accessories Quick</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">写真必須</p>
                  <p className="text-sm text-gray-500">検査時に写真を必須にする</p>
                </div>
                <Switch checked={settings?.settings?.requirePhotos} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動不合格</p>
                  <p className="text-sm text-gray-500">欠陥が閾値を超えたら自動不合格</p>
                </div>
                <Switch checked={settings?.settings?.autoReject} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">不合格閾値</p>
                  <p className="text-sm text-gray-500">自動不合格の欠陥数</p>
                </div>
                <Input type="number" defaultValue={settings?.settings?.rejectThreshold} className="w-24" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">不合格時通知</p>
                  <p className="text-sm text-gray-500">不合格時に通知を送信</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnFail} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">欠陥追跡</p>
                  <p className="text-sm text-gray-500">欠陥を詳細に追跡</p>
                </div>
                <Switch checked={settings?.settings?.trackDefects} />
              </div>

              <Button className="bg-sky-600 hover:bg-sky-700">
                <Settings className="w-4 h-4 mr-2" />
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
