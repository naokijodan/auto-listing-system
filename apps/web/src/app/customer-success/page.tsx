'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Crown,
  RefreshCw,
  Search,
  BarChart3,
  Target,
  Heart,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Customer {
  id: string;
  email: string;
  name?: string;
  segment: string;
  tier: string;
  churnRisk: string;
  churnScore: number;
  totalOrders: number;
  totalSpent: number;
  lifetimeValue: number;
  lastOrderAt?: string;
  daysSinceLastOrder?: number;
  analytics?: {
    rfmScore: number;
    recencyScore: number;
    frequencyScore: number;
    monetaryScore: number;
  };
}

interface Stats {
  total: number;
  bySegment: Record<string, number>;
  byTier: Record<string, number>;
  byChurnRisk: Record<string, number>;
  averageLTV: number;
  atRiskCount: number;
}

interface SegmentInfo {
  value: string;
  label: string;
  description: string;
  color: string;
}

export default function CustomerSuccessPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [atRiskCustomers, setAtRiskCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [segments, setSegments] = useState<SegmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState({ segment: '', tier: '', churnRisk: '', search: '' });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.segment) params.append('segment', filter.segment);
      if (filter.tier) params.append('tier', filter.tier);
      if (filter.churnRisk) params.append('churnRisk', filter.churnRisk);
      if (filter.search) params.append('search', filter.search);

      const [customersRes, statsRes, segmentsRes, atRiskRes] = await Promise.all([
        fetch(`${API_URL}/api/customer-success/customers?${params}`),
        fetch(`${API_URL}/api/customer-success/stats`),
        fetch(`${API_URL}/api/customer-success/segments`),
        fetch(`${API_URL}/api/customer-success/at-risk`),
      ]);

      const customersData = await customersRes.json();
      const statsData = await statsRes.json();
      const segmentsData = await segmentsRes.json();
      const atRiskData = await atRiskRes.json();

      setCustomers(customersData.data || []);
      setStats(statsData);
      setSegments(segmentsData.segments || []);
      setAtRiskCustomers(atRiskData || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      await fetch(`${API_URL}/api/customer-success/analyze-all`, {
        method: 'POST',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to analyze:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSegmentBadge = (segment: string) => {
    const segmentInfo = segments.find((s) => s.value === segment);
    const color = segmentInfo?.color || '#6b7280';
    return (
      <Badge style={{ backgroundColor: `${color}20`, color, borderColor: color }}>
        {segmentInfo?.label || segment}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      STANDARD: '#6b7280',
      SILVER: '#9ca3af',
      GOLD: '#f59e0b',
      PLATINUM: '#8b5cf6',
      DIAMOND: '#3b82f6',
    };
    const color = colors[tier] || '#6b7280';
    return (
      <Badge style={{ backgroundColor: `${color}20`, color, borderColor: color }}>
        {tier}
      </Badge>
    );
  };

  const getChurnRiskBadge = (risk: string, score: number) => {
    const colors: Record<string, string> = {
      LOW: '#22c55e',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      CRITICAL: '#991b1b',
    };
    const color = colors[risk] || '#6b7280';
    return (
      <Badge style={{ backgroundColor: `${color}20`, color, borderColor: color }}>
        {risk} ({score}%)
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">カスタマーサクセス</h1>
          <p className="text-gray-500">顧客分析とチャーン予測</p>
        </div>
        <Button onClick={handleAnalyzeAll} disabled={analyzing}>
          {analyzing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BarChart3 className="h-4 w-4 mr-2" />
          )}
          全顧客を分析
        </Button>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">総顧客数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">平均LTV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">¥{stats.averageLTV.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">VIP顧客</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">{stats.bySegment.VIP || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">ロイヤル顧客</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                <span className="text-2xl font-bold">{stats.bySegment.LOYAL || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">リスク顧客</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{stats.atRiskCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">顧客一覧</TabsTrigger>
          <TabsTrigger value="at-risk">リスク顧客</TabsTrigger>
          <TabsTrigger value="segments">セグメント分析</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          {/* フィルター */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="検索..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="pl-10 w-64"
              />
            </div>
            <Select
              value={filter.segment}
              onValueChange={(value) => setFilter({ ...filter, segment: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="セグメント" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                {segments.map((seg) => (
                  <SelectItem key={seg.value} value={seg.value}>
                    {seg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filter.churnRisk}
              onValueChange={(value) => setFilter({ ...filter, churnRisk: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="チャーンリスク" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
                <SelectItem value="CRITICAL">危機的</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>顧客</TableHead>
                    <TableHead>セグメント</TableHead>
                    <TableHead>ティア</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>LTV</TableHead>
                    <TableHead>チャーンリスク</TableHead>
                    <TableHead>最終購入</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name || '名前なし'}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getSegmentBadge(customer.segment)}</TableCell>
                      <TableCell>{getTierBadge(customer.tier)}</TableCell>
                      <TableCell>{customer.totalOrders}</TableCell>
                      <TableCell>¥{customer.lifetimeValue.toLocaleString()}</TableCell>
                      <TableCell>
                        {getChurnRiskBadge(customer.churnRisk, customer.churnScore)}
                      </TableCell>
                      <TableCell>
                        {customer.lastOrderAt
                          ? `${customer.daysSinceLastOrder}日前`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {customers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  顧客データがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                チャーンリスクの高い顧客
              </CardTitle>
              <CardDescription>
                即座にアクションが必要な顧客リスト
              </CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskCustomers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>顧客</TableHead>
                      <TableHead>リスクスコア</TableHead>
                      <TableHead>最終購入</TableHead>
                      <TableHead>LTV</TableHead>
                      <TableHead>RFMスコア</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {atRiskCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name || '名前なし'}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${customer.churnScore}%`,
                                backgroundColor:
                                  customer.churnScore >= 75
                                    ? '#991b1b'
                                    : customer.churnScore >= 50
                                    ? '#ef4444'
                                    : '#f59e0b',
                              }}
                            />
                            <span className="text-sm font-medium">{customer.churnScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.daysSinceLastOrder
                            ? `${customer.daysSinceLastOrder}日前`
                            : '-'}
                        </TableCell>
                        <TableCell>¥{customer.lifetimeValue.toLocaleString()}</TableCell>
                        <TableCell>{customer.analytics?.rfmScore || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  リスクの高い顧客はいません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {segments.map((segment) => (
              <Card key={segment.value}>
                <CardHeader>
                  <CardTitle
                    className="text-lg"
                    style={{ color: segment.color }}
                  >
                    {segment.label}
                  </CardTitle>
                  <CardDescription>{segment.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats?.bySegment[segment.value] || 0}
                  </div>
                  <div className="text-sm text-gray-500">
                    {stats?.total
                      ? Math.round(
                          ((stats.bySegment[segment.value] || 0) / stats.total) * 100
                        )
                      : 0}
                    %
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>ティア別分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'STANDARD'].map((tier) => {
                    const count = stats.byTier[tier] || 0;
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={tier} className="flex items-center gap-4">
                        <div className="w-24">{getTierBadge(tier)}</div>
                        <div className="flex-1">
                          <div
                            className="h-4 rounded-full bg-gray-200"
                            style={{ width: '100%' }}
                          >
                            <div
                              className="h-4 rounded-full bg-blue-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right text-sm">
                          {count} ({Math.round(percentage)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
