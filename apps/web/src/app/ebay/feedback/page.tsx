// @ts-nocheck
'use client';

/**
 * Phase 111: eBayフィードバック管理UI
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star, ThumbsUp, ThumbsDown, Minus, MessageSquare, ChevronLeft, Eye, RefreshCw,
  AlertTriangle, Send,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' } });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function getRatingBadge(rating: string) {
  if (rating === 'POSITIVE') return <Badge className="bg-green-500"><ThumbsUp className="h-3 w-3 mr-1" />Positive</Badge>;
  if (rating === 'NEUTRAL') return <Badge variant="secondary"><Minus className="h-3 w-3 mr-1" />Neutral</Badge>;
  if (rating === 'NEGATIVE') return <Badge variant="destructive"><ThumbsDown className="h-3 w-3 mr-1" />Negative</Badge>;
  return <Badge variant="outline">{rating}</Badge>;
}

function getDirectionBadge(direction: string) {
  return <Badge variant="outline">{direction === 'RECEIVED' ? '受信' : '送信'}</Badge>;
}

export default function EbayFeedbackPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRespondOpen, setIsRespondOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [respondData, setRespondData] = useState({ response: '', syncToEbay: true });
  const [leaveData, setLeaveData] = useState({ orderId: '', rating: 'POSITIVE', comment: '', syncToEbay: true });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(`${API_BASE}/ebay-feedback/dashboard`, fetcher);
  const { data: feedbackData, mutate: mutateFeedback } = useSWR(
    `${API_BASE}/ebay-feedback?rating=${ratingFilter === 'all' ? '' : ratingFilter}&direction=${directionFilter === 'all' ? '' : directionFilter}`,
    fetcher
  );
  const { data: unresponded } = useSWR(
    activeTab === 'unresponded' ? `${API_BASE}/ebay-feedback/negative/unresponded` : null,
    fetcher
  );

  const handleViewFeedback = async (id: string) => {
    const res = await fetch(`${API_BASE}/ebay-feedback/${id}`, {
      headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
    });
    if (res.ok) {
      setSelectedFeedback(await res.json());
      setIsDetailOpen(true);
    }
  };

  const handleRespond = async () => {
    if (!selectedFeedback) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-feedback/${selectedFeedback.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify(respondData),
      });
      if (res.ok) {
        setIsRespondOpen(false);
        setIsDetailOpen(false);
        setRespondData({ response: '', syncToEbay: true });
        mutateDashboard();
        mutateFeedback();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeave = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-feedback/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify(leaveData),
      });
      if (res.ok) {
        setIsLeaveOpen(false);
        setLeaveData({ orderId: '', rating: 'POSITIVE', comment: '', syncToEbay: true });
        mutateDashboard();
        mutateFeedback();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/ebay-feedback/sync`, {
        method: 'POST',
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
      });
      mutateDashboard();
      mutateFeedback();
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
            <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6" />フィードバック管理</h1>
            <p className="text-muted-foreground">eBayフィードバックの確認・返信</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={isProcessing}><RefreshCw className={`h-4 w-4 mr-1 ${isProcessing ? 'animate-spin' : ''}`} />同期</Button>
          <Button onClick={() => setIsLeaveOpen(true)}><Send className="h-4 w-4 mr-1" />フィードバック送信</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="unresponded" className="flex items-center gap-1">
            要返信
            {unresponded?.count > 0 && <Badge variant="destructive" className="ml-1">{unresponded.count}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="list">一覧</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">総件数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboard?.summary.total || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><ThumbsUp className="h-4 w-4 text-green-500" />Positive</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboard?.summary.positive || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><ThumbsDown className="h-4 w-4 text-red-500" />Negative</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{dashboard?.summary.negative || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">好評価率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{dashboard?.summary.positiveRate || '0%'}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{dashboard?.summary.received || 0}</div>
              <div className="text-muted-foreground">受信フィードバック</div>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{dashboard?.summary.given || 0}</div>
              <div className="text-muted-foreground">送信フィードバック</div>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>最近のフィードバック</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentFeedback?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">フィードバックがありません</p>
                ) : (
                  dashboard?.recentFeedback?.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => handleViewFeedback(f.id)}>
                      <div className="flex items-center gap-3">
                        <Star className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{f.marketplaceOrderId}</div>
                          <div className="text-sm text-muted-foreground">{f.comment?.substring(0, 50)}...</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getDirectionBadge(f.direction)}
                        {getRatingBadge(f.rating)}
                        {f.response && <Badge variant="outline"><MessageSquare className="h-3 w-3 mr-1" />返信済</Badge>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unresponded" className="space-y-4">
          {unresponded?.count === 0 ? (
            <Card className="p-8 text-center">
              <ThumbsUp className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium">すべて返信済み</h3>
              <p className="text-muted-foreground">未返信のネガティブフィードバックはありません</p>
            </Card>
          ) : (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" />要返信フィードバック</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unresponded?.feedback?.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer" onClick={() => handleViewFeedback(f.id)}>
                      <div>
                        <div className="font-medium">{f.order?.marketplaceOrderId}</div>
                        <div className="text-sm">{f.comment}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRatingBadge(f.rating)}
                        <Button size="sm">返信</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-4">
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="評価" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="POSITIVE">Positive</SelectItem>
                <SelectItem value="NEUTRAL">Neutral</SelectItem>
                <SelectItem value="NEGATIVE">Negative</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="方向" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="RECEIVED">受信</SelectItem>
                <SelectItem value="GIVEN">送信</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => mutateFeedback()}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {feedbackData?.feedback?.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                    <div>
                      <div className="font-medium">{f.order?.marketplaceOrderId}</div>
                      <div className="text-sm text-muted-foreground">{f.order?.buyerUsername} • {f.comment?.substring(0, 60)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getDirectionBadge(f.direction)}
                      {getRatingBadge(f.rating)}
                      {f.response && <Badge variant="outline"><MessageSquare className="h-3 w-3" /></Badge>}
                      <Button variant="ghost" size="sm" onClick={() => handleViewFeedback(f.id)}><Eye className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>フィードバック詳細</DialogTitle></DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">{getDirectionBadge(selectedFeedback.direction)}{getRatingBadge(selectedFeedback.rating)}</div>
                {selectedFeedback.direction === 'RECEIVED' && !selectedFeedback.response && (
                  <Button onClick={() => setIsRespondOpen(true)}>返信する</Button>
                )}
              </div>
              <Card><CardContent className="pt-4 space-y-2">
                <div><span className="text-muted-foreground">注文ID:</span> {selectedFeedback.order?.marketplaceOrderId}</div>
                <div><span className="text-muted-foreground">購入者:</span> {selectedFeedback.order?.buyerUsername}</div>
                <div><span className="text-muted-foreground">コメント:</span></div>
                <p className="p-3 bg-muted rounded">{selectedFeedback.comment}</p>
                {selectedFeedback.response && (
                  <>
                    <div><span className="text-muted-foreground">返信:</span></div>
                    <p className="p-3 bg-blue-50 rounded">{selectedFeedback.response}</p>
                  </>
                )}
              </CardContent></Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={isRespondOpen} onOpenChange={setIsRespondOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>フィードバックに返信</DialogTitle></DialogHeader>
          <Textarea placeholder="返信内容（500文字以内）" value={respondData.response} onChange={(e) => setRespondData({ ...respondData, response: e.target.value })} rows={4} maxLength={500} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRespondOpen(false)}>キャンセル</Button>
            <Button onClick={handleRespond} disabled={!respondData.response || isProcessing}>返信</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Feedback Dialog */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>フィードバック送信</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="注文ID" value={leaveData.orderId} onChange={(e) => setLeaveData({ ...leaveData, orderId: e.target.value })} />
            <Select value={leaveData.rating} onValueChange={(v) => setLeaveData({ ...leaveData, rating: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="POSITIVE">Positive</SelectItem>
                <SelectItem value="NEUTRAL">Neutral</SelectItem>
                <SelectItem value="NEGATIVE">Negative</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="コメント（80文字以内）" value={leaveData.comment} onChange={(e) => setLeaveData({ ...leaveData, comment: e.target.value })} maxLength={80} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveOpen(false)}>キャンセル</Button>
            <Button onClick={handleLeave} disabled={!leaveData.orderId || !leaveData.comment || isProcessing}>送信</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
