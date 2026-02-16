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
  MessageSquare,
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  User,
  BarChart3,
  Download,
  Bot,
  Zap,
  ThumbsUp,
  ArrowUpRight
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function CustomerCommunicationHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/customer-communication-hub/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/customer-communication-hub/dashboard/recent`, fetcher);
  const { data: metrics } = useSWR(`${API_BASE}/ebay/customer-communication-hub/dashboard/metrics`, fetcher);
  const { data: conversations } = useSWR(`${API_BASE}/ebay/customer-communication-hub/conversations`, fetcher);
  const { data: templates } = useSWR(`${API_BASE}/ebay/customer-communication-hub/templates`, fetcher);
  const { data: autoResponses } = useSWR(`${API_BASE}/ebay/customer-communication-hub/auto-responses`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/customer-communication-hub/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><Clock className="w-3 h-3 mr-1" />未返信</Badge>;
      case 'replied':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />返信済み</Badge>;
      case 'escalated':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />エスカレ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">高</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">中</Badge>;
      case 'low':
        return <Badge variant="secondary">低</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-lime-600">Customer Communication Hub</h1>
          <p className="text-gray-500">顧客コミュニケーションハブ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-lime-600 hover:bg-lime-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            新規メッセージ
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="conversations">会話</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="auto-response">自動応答</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総会話数</CardTitle>
                <MessageSquare className="w-4 h-4 text-lime-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalConversations?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">アクティブ: {overview?.activeConversations}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">未返信</CardTitle>
                <Clock className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{overview?.unreplied}</div>
                <p className="text-xs text-muted-foreground">エスカレ: {overview?.escalations}件</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均応答時間</CardTitle>
                <Zap className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgResponseTime}</div>
                <p className="text-xs text-muted-foreground">目標: 4時間以内</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">顧客満足度</CardTitle>
                <ThumbsUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.satisfaction}%</div>
                <Progress value={overview?.satisfaction || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-lime-600" />
                最近のメッセージ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>購入者</TableHead>
                    <TableHead>件名</TableHead>
                    <TableHead>チャネル</TableHead>
                    <TableHead>優先度</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>受信日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent?.messages?.map((msg: any) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-medium">{msg.buyer}</TableCell>
                      <TableCell>{msg.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{msg.channel}</Badge>
                      </TableCell>
                      <TableCell>{getPriorityBadge(msg.priority)}</TableCell>
                      <TableCell>{getStatusBadge(msg.status)}</TableCell>
                      <TableCell>{msg.receivedAt}</TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-lime-600 hover:bg-lime-700">
                          <Send className="w-3 h-3 mr-1" />
                          返信
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Metrics by Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>チャネル別メトリクス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.metrics?.byChannel?.map((channel: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-lime-600" />
                        <span className="font-medium">{channel.channel}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{channel.conversations}</div>
                        <div className="text-xs text-gray-500">応答: {channel.responseTime}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別内訳</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.metrics?.byCategory?.map((cat: any, idx: number) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span>{cat.category}</span>
                        <span>{cat.percentage}%</span>
                      </div>
                      <Progress value={cat.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>会話一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="購入者/件名で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">未返信</SelectItem>
                      <SelectItem value="replied">返信済み</SelectItem>
                      <SelectItem value="escalated">エスカレ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>購入者</TableHead>
                    <TableHead>件名</TableHead>
                    <TableHead>チャネル</TableHead>
                    <TableHead>メッセージ数</TableHead>
                    <TableHead>優先度</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>最終更新</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations?.conversations?.map((conv: any) => (
                    <TableRow key={conv.id}>
                      <TableCell className="font-medium">{conv.buyer}</TableCell>
                      <TableCell>{conv.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{conv.channel}</Badge>
                      </TableCell>
                      <TableCell>{conv.messages}</TableCell>
                      <TableCell>{getPriorityBadge(conv.priority)}</TableCell>
                      <TableCell>{getStatusBadge(conv.status)}</TableCell>
                      <TableCell>{conv.lastMessageAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Send className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><ArrowUpRight className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>返信テンプレート</CardTitle>
                <Button className="bg-lime-600 hover:bg-lime-700">
                  <Plus className="w-4 h-4 mr-2" />
                  新規テンプレート
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>テンプレート名</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>言語</TableHead>
                    <TableHead>使用回数</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates?.templates?.map((tpl: any) => (
                    <TableRow key={tpl.id}>
                      <TableCell className="font-medium">{tpl.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tpl.category}</Badge>
                      </TableCell>
                      <TableCell>{tpl.language}</TableCell>
                      <TableCell>{tpl.usageCount}</TableCell>
                      <TableCell>
                        {tpl.active ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><FileText className="w-4 h-4" /></Button>
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

        <TabsContent value="auto-response" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-lime-600" />
                  自動応答ルール
                </CardTitle>
                <Button className="bg-lime-600 hover:bg-lime-700">
                  <Plus className="w-4 h-4 mr-2" />
                  新規ルール
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ルール名</TableHead>
                    <TableHead>トリガー</TableHead>
                    <TableHead>キーワード</TableHead>
                    <TableHead>テンプレート</TableHead>
                    <TableHead>マッチ数</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {autoResponses?.rules?.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.trigger}</Badge>
                      </TableCell>
                      <TableCell>
                        {rule.keywords?.slice(0, 2).join(', ')}
                        {rule.keywords?.length > 2 && '...'}
                      </TableCell>
                      <TableCell>{rule.template}</TableCell>
                      <TableCell>{rule.matches}</TableCell>
                      <TableCell>
                        {rule.active ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Settings className="w-4 h-4" /></Button>
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
                  <Clock className="w-5 h-5 text-lime-600" />
                  応答時間分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>平均応答時間</span>
                    <span className="text-2xl font-bold">2.5h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>中央値応答時間</span>
                    <span className="text-2xl font-bold">1.8h</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>1時間以内</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                    <div className="flex justify-between">
                      <span>4時間以内</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                    <div className="flex justify-between">
                      <span>24時間以内</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-lime-600" />
                  顧客満足度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-lime-600">94.5%</div>
                    <div className="text-sm text-gray-500">総合スコア</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">803</div>
                      <div className="text-xs text-green-700">満足</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-600">34</div>
                      <div className="text-xs text-gray-700">普通</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">13</div>
                      <div className="text-xs text-red-700">不満</div>
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
                応答時間・満足度トレンドチャート
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
                  <p className="font-medium">自動応答</p>
                  <p className="text-sm text-gray-500">条件に一致するメッセージに自動返信</p>
                </div>
                <Switch checked={settings?.settings?.autoResponseEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">新着メッセージ通知</p>
                  <p className="text-sm text-gray-500">新しいメッセージ受信時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnNewMessage} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">エスカレーション通知</p>
                  <p className="text-sm text-gray-500">エスカレーション発生時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnEscalation} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">目標応答時間（時間）</label>
                  <Input type="number" defaultValue={settings?.settings?.defaultResponseTime || 4} />
                </div>
                <div>
                  <label className="text-sm font-medium">エスカレーション閾値（時間）</label>
                  <Input type="number" defaultValue={settings?.settings?.escalationThreshold || 24} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">署名</label>
                <Textarea
                  defaultValue={settings?.settings?.signature || 'Best regards,\nRAKUDA Support Team'}
                  rows={3}
                />
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
