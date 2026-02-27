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
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Languages,
  Globe,
  Clock,
  CheckCircle,
  Settings,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  BarChart3,
  BookOpen,
  FileText,
  Upload,
  Sparkles,
  DollarSign
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function TranslationHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/translation-hub/dashboard/overview`, fetcher);
  const { data: queue } = useSWR(`${API_BASE}/ebay/translation-hub/dashboard/queue`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/translation-hub/dashboard/stats`, fetcher);
  const { data: translations } = useSWR(`${API_BASE}/ebay/translation-hub/translations`, fetcher);
  const { data: glossary } = useSWR(`${API_BASE}/ebay/translation-hub/glossary`, fetcher);
  const { data: languages } = useSWR(`${API_BASE}/ebay/translation-hub/languages`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/translation-hub/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><RefreshCw className="w-3 h-3 mr-1" />処理中</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />待機中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sky-600">Translation Hub</h1>
          <p className="text-gray-500">翻訳ハブ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-sky-600 hover:bg-sky-700">
            <Languages className="w-4 h-4 mr-2" />
            翻訳開始
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="translations">翻訳管理</TabsTrigger>
          <TabsTrigger value="glossary">用語集</TabsTrigger>
          <TabsTrigger value="languages">言語設定</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総翻訳数</CardTitle>
                <FileText className="w-4 h-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalTranslations?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">待機中: {overview?.pendingTranslations}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">対応言語</CardTitle>
                <Globe className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.languages}</div>
                <p className="text-xs text-muted-foreground">今日完了: {overview?.completedToday}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">品質スコア</CardTitle>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgQuality}%</div>
                <Progress value={overview?.avgQuality} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">今月のコスト</CardTitle>
                <DollarSign className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{overview?.costThisMonth?.toLocaleString()}</div>
                <p className="text-xs text-green-600">削減: ¥{overview?.savings?.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Language Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-600" />
                言語別統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.byLanguage?.map((lang: any) => (
                  <div key={lang.code}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{lang.name}</span>
                      <span>{lang.percentage}%</span>
                    </div>
                    <Progress value={lang.percentage} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">{lang.count?.toLocaleString()}件</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Translation Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-600" />
                翻訳キュー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>対象言語</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>優先度</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue?.queue?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.targetLang.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'outline' : 'secondary'}>
                          {item.priority}
                        </Badge>
                      </TableCell>
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

        <TabsContent value="translations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>翻訳一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="商品名で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">待機中</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-sky-600 hover:bg-sky-700">
                    <Plus className="w-4 h-4 mr-2" />
                    一括翻訳
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>元言語</TableHead>
                    <TableHead>対象言語</TableHead>
                    <TableHead>品質</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {translations?.translations?.map((trans: any) => (
                    <TableRow key={trans.id}>
                      <TableCell className="font-medium">{trans.product}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{trans.sourceLang.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trans.targetLang.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        {trans.quality ? (
                          <span className={trans.quality >= 95 ? 'text-green-600' : trans.quality >= 85 ? 'text-yellow-600' : 'text-red-600'}>
                            {trans.quality}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(trans.status)}</TableCell>
                      <TableCell>{trans.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><RefreshCw className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glossary" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-600" />
                  用語集
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    インポート
                  </Button>
                  <Button className="bg-sky-600 hover:bg-sky-700">
                    <Plus className="w-4 h-4 mr-2" />
                    用語追加
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>元の用語</TableHead>
                    <TableHead>英語</TableHead>
                    <TableHead>ドイツ語</TableHead>
                    <TableHead>フランス語</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glossary?.terms?.map((term: any) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.source}</TableCell>
                      <TableCell>{term.translations?.en}</TableCell>
                      <TableCell>{term.translations?.de}</TableCell>
                      <TableCell>{term.translations?.fr}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{term.category}</Badge>
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

        <TabsContent value="languages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-600" />
                対応言語
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>言語コード</TableHead>
                    <TableHead>言語名</TableHead>
                    <TableHead>ネイティブ名</TableHead>
                    <TableHead>デフォルト</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {languages?.languages?.map((lang: any) => (
                    <TableRow key={lang.code}>
                      <TableCell className="font-mono">{lang.code.toUpperCase()}</TableCell>
                      <TableCell className="font-medium">{lang.name}</TableCell>
                      <TableCell>{lang.native}</TableCell>
                      <TableCell>
                        {lang.default && <Badge variant="default" className="bg-sky-600">デフォルト</Badge>}
                      </TableCell>
                      <TableCell>
                        {lang.enabled ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={lang.enabled} />
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
                  <Sparkles className="w-5 h-5 text-sky-600" />
                  品質分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>平均スコア</span>
                    <span className="text-xl font-bold">96.5%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">6,500</div>
                      <div className="text-xs text-green-700">優秀</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">1,500</div>
                      <div className="text-xs text-yellow-700">良好</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">500</div>
                      <div className="text-xs text-red-700">要レビュー</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-sky-600" />
                  コスト分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>AI翻訳コスト</span>
                    <span className="text-xl font-bold">¥25,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>人間レビュー</span>
                    <span className="text-xl font-bold">¥20,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>合計</span>
                    <span className="text-xl font-bold">¥45,000</span>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      ¥125,000 のコスト削減
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-600" />
                トレンド
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                翻訳トレンドチャート
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動翻訳</p>
                  <p className="text-sm text-gray-500">新規商品を自動で翻訳</p>
                </div>
                <Switch checked={settings?.settings?.autoTranslate} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">用語集を使用</p>
                  <p className="text-sm text-gray-500">翻訳時に用語集を参照</p>
                </div>
                <Switch checked={settings?.settings?.useGlossary} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">フォーマット維持</p>
                  <p className="text-sm text-gray-500">元のフォーマットを維持</p>
                </div>
                <Switch checked={settings?.settings?.preserveFormatting} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">AIプロバイダー</label>
                  <Select defaultValue={settings?.settings?.aiProvider || 'gpt-4'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="deepl">DeepL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">レビュー閾値（%）</label>
                  <Input type="number" defaultValue={settings?.settings?.humanReviewThreshold || 90} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">デフォルト対象言語</label>
                <div className="flex gap-2 mt-2">
                  {['en', 'de', 'fr', 'es', 'it'].map(lang => (
                    <Badge key={lang} variant="outline" className="cursor-pointer">
                      {lang.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button className="bg-sky-600 hover:bg-sky-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
