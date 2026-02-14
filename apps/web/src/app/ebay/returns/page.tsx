'use client';

/**
 * Phase 110: eBay返品・返金管理UI
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RotateCcw, DollarSign, Clock, CheckCircle, XCircle, ChevronLeft, Eye, RefreshCw,
  AlertTriangle, Package, Search,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' } });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function getStatusBadge(status: string) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING: { variant: 'secondary' },
    APPROVED: { variant: 'default' },
    REFUNDED: { variant: 'default' },
    REJECTED: { variant: 'destructive' },
    CLOSED: { variant: 'outline' },
  };
  return <Badge variant={config[status]?.variant || 'outline'}>{status}</Badge>;
}

function getTypeBadge(type: string) {
  const labels: Record<string, string> = {
    RETURN: '返品',
    REFUND_ONLY: '返金のみ',
    PARTIAL_REFUND: '一部返金',
  };
  return <Badge variant="outline">{labels[type] || type}</Badge>;
}

export default function EbayReturnsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [processData, setProcessData] = useState({ action: '', refundAmount: '', notes: '', syncToEbay: true });
  const [createData, setCreateData] = useState({ orderId: '', reason: '', type: 'RETURN', refundAmount: '' });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(`${API_BASE}/ebay-returns/dashboard`, fetcher);
  const { data: returnsData, mutate: mutateReturns } = useSWR(
    `${API_BASE}/ebay-returns?status=${statusFilter === 'all' ? '' : statusFilter}`,
    fetcher
  );

  const handleViewReturn = async (id: string) => {
    const res = await fetch(`${API_BASE}/ebay-returns/${id}`, {
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
    });
    if (res.ok) {
      setSelectedReturn(await res.json());
      setIsDetailOpen(true);
    }
  };

  const handleProcess = async () => {
    if (!selectedReturn) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-returns/${selectedReturn.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify({
          action: processData.action,
          refundAmount: processData.refundAmount ? parseFloat(processData.refundAmount) : undefined,
          notes: processData.notes || undefined,
          syncToEbay: processData.syncToEbay,
        }),
      });
      if (res.ok) {
        setIsProcessOpen(false);
        setIsDetailOpen(false);
        setProcessData({ action: '', refundAmount: '', notes: '', syncToEbay: true });
        mutateDashboard();
        mutateReturns();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreate = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify({
          orderId: createData.orderId,
          reason: createData.reason,
          type: createData.type,
          refundAmount: createData.refundAmount ? parseFloat(createData.refundAmount) : undefined,
        }),
      });
      if (res.ok) {
        setIsCreateOpen(false);
        setCreateData({ orderId: '', reason: '', type: 'RETURN', refundAmount: '' });
        mutateDashboard();
        mutateReturns();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />戻る</Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><RotateCcw className="h-6 w-6" />返品・返金管理</h1>
            <p className="text-muted-foreground">eBay返品リクエスト・返金処理</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>新規作成</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="list">一覧</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">総件数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboard?.summary.total || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" />保留中</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{dashboard?.summary.pending || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4" />承認済</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{dashboard?.summary.approved || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-4 w-4" />返金済</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboard?.summary.refunded || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><XCircle className="h-4 w-4" />却下</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{dashboard?.summary.rejected || 0}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>最近の返品リクエスト</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentReturns?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">返品リクエストがありません</p>
                ) : (
                  dashboard?.recentReturns?.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => handleViewReturn(r.id)}>
                      <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{r.marketplaceOrderId}</div>
                          <div className="text-sm text-muted-foreground">{r.buyerUsername} • {r.reason?.substring(0, 30)}...</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-medium">${r.refundAmount?.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('ja-JP')}</div>
                        </div>
                        {getTypeBadge(r.type)}
                        {getStatusBadge(r.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="ステータス" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="PENDING">保留中</SelectItem>
                <SelectItem value="APPROVED">承認済</SelectItem>
                <SelectItem value="REFUNDED">返金済</SelectItem>
                <SelectItem value="REJECTED">却下</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => mutateReturns()}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {returnsData?.returns?.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div>
                      <div className="font-medium">{r.order?.marketplaceOrderId}</div>
                      <div className="text-sm text-muted-foreground">{r.order?.buyerUsername} • {r.reason?.substring(0, 50)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">${r.refundAmount?.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('ja-JP')}</div>
                      </div>
                      {getTypeBadge(r.type)}
                      {getStatusBadge(r.status)}
                      <Button variant="ghost" size="sm" onClick={() => handleViewReturn(r.id)}><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>返品詳細</DialogTitle></DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">{getTypeBadge(selectedReturn.type)}{getStatusBadge(selectedReturn.status)}</div>
                {selectedReturn.status === 'PENDING' && (
                  <Button onClick={() => setIsProcessOpen(true)}>処理する</Button>
                )}
              </div>
              <Card><CardContent className="pt-4 space-y-2">
                <div><span className="text-muted-foreground">注文ID:</span> {selectedReturn.order?.marketplaceOrderId}</div>
                <div><span className="text-muted-foreground">購入者:</span> {selectedReturn.order?.buyerUsername}</div>
                <div><span className="text-muted-foreground">返金額:</span> ${selectedReturn.refundAmount?.toFixed(2)}</div>
                <div><span className="text-muted-foreground">理由:</span> {selectedReturn.reason}</div>
              </CardContent></Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={isProcessOpen} onOpenChange={setIsProcessOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>返品処理</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={processData.action} onValueChange={(v) => setProcessData({ ...processData, action: v })}>
              <SelectTrigger><SelectValue placeholder="アクションを選択" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE">承認</SelectItem>
                <SelectItem value="REFUND">返金実行</SelectItem>
                <SelectItem value="REJECT">却下</SelectItem>
                <SelectItem value="CLOSE">クローズ</SelectItem>
              </SelectContent>
            </Select>
            {processData.action === 'REFUND' && (
              <Input type="number" placeholder="返金額" value={processData.refundAmount} onChange={(e) => setProcessData({ ...processData, refundAmount: e.target.value })} />
            )}
            <Textarea placeholder="メモ（任意）" value={processData.notes} onChange={(e) => setProcessData({ ...processData, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProcessOpen(false)}>キャンセル</Button>
            <Button onClick={handleProcess} disabled={!processData.action || isProcessing}>実行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新規返品リクエスト</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="注文ID" value={createData.orderId} onChange={(e) => setCreateData({ ...createData, orderId: e.target.value })} />
            <Select value={createData.type} onValueChange={(v) => setCreateData({ ...createData, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RETURN">返品</SelectItem>
                <SelectItem value="REFUND_ONLY">返金のみ</SelectItem>
                <SelectItem value="PARTIAL_REFUND">一部返金</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="理由" value={createData.reason} onChange={(e) => setCreateData({ ...createData, reason: e.target.value })} />
            <Input type="number" placeholder="返金額（任意）" value={createData.refundAmount} onChange={(e) => setCreateData({ ...createData, refundAmount: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={!createData.orderId || !createData.reason || isProcessing}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
