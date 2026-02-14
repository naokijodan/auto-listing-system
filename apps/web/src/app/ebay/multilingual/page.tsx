'use client';

/**
 * eBay多言語対応ページ
 * Phase 120: タイトル・説明文の多言語化
 */

import { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Languages,
  Globe,
  Sparkles,
  Check,
  Edit,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function EbayMultilingualPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState<any>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(
    `${API_BASE}/ebay-multilingual/dashboard`,
    fetcher
  );

  const { data: languages } = useSWR(
    `${API_BASE}/ebay-multilingual/languages`,
    fetcher
  );

  const { data: stats } = useSWR(
    `${API_BASE}/ebay-multilingual/stats`,
    fetcher
  );

  const handleTranslate = async (listingId: string) => {
    if (selectedLanguages.length === 0) return;

    setIsTranslating(true);
    try {
      await fetch(`${API_BASE}/ebay-multilingual/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          targetLanguages: selectedLanguages,
          fields: ['title', 'description'],
        }),
      });
      mutateDashboard();
      setTranslateDialogOpen(false);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleBulkTranslate = async () => {
    if (selectedListings.length === 0 || selectedLanguages.length === 0) return;

    setIsTranslating(true);
    try {
      await fetch(`${API_BASE}/ebay-multilingual/translate/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingIds: selectedListings,
          targetLanguages: selectedLanguages,
          fields: ['title'],
        }),
      });
      mutateDashboard();
      setSelectedListings([]);
    } catch (error) {
      console.error('Bulk translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePreview = async (listingId: string) => {
    try {
      const res = await fetch(`${API_BASE}/ebay-multilingual/translations/${listingId}`);
      const data = await res.json();
      setSelectedTranslation(data);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const handleEdit = (listingId: string, language: string, translation: any) => {
    setSelectedTranslation({ listingId, language, ...translation });
    setEditForm({
      title: translation.title || '',
      description: translation.description || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTranslation) return;

    try {
      await fetch(`${API_BASE}/ebay-multilingual/translations/${selectedTranslation.listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedTranslation.language,
          title: editForm.title,
          description: editForm.description,
        }),
      });
      mutateDashboard();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleDeleteTranslation = async (listingId: string, language: string) => {
    try {
      await fetch(`${API_BASE}/ebay-multilingual/translations/${listingId}/${language}`, {
        method: 'DELETE',
      });
      mutateDashboard();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Languages className="h-8 w-8" />
            多言語対応
          </h1>
          <p className="text-muted-foreground">
            タイトル・説明文を複数言語に翻訳
          </p>
        </div>
        <Button onClick={() => setTranslateDialogOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          一括翻訳
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="translations">翻訳一覧</TabsTrigger>
          <TabsTrigger value="languages">言語設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総リスティング</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.totalListings || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">翻訳済み</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.translatedListings || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.stats?.translationRate || 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">対応言語数</CardTitle>
                <Languages className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(dashboard?.stats?.languageStats || {}).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均言語数/商品</CardTitle>
                <Globe className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.overview?.avgLanguagesPerListing || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 言語別統計 */}
          <Card>
            <CardHeader>
              <CardTitle>言語別翻訳数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dashboard?.stats?.languageStats || {}).map(([code, count]) => {
                  const lang = dashboard?.supportedLanguages?.find((l: any) => l.code === code);
                  return (
                    <Badge key={code} variant="secondary" className="text-sm">
                      {lang?.nativeName || code}: {count as number}件
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 最近の翻訳 */}
          <Card>
            <CardHeader>
              <CardTitle>最近の翻訳</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>翻訳言語</TableHead>
                    <TableHead>更新日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.recentTranslations?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[200px] truncate">{item.title}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {item.languages.map((lang: string) => (
                            <Badge key={lang} variant="outline" className="text-xs">
                              {lang.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(item.updatedAt).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(item.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 翻訳一覧 */}
        <TabsContent value="translations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>翻訳済みリスティング</CardTitle>
              <CardDescription>
                翻訳の表示・編集・削除ができます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>翻訳言語</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.recentTranslations?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[250px] truncate">{item.title}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {item.languages.map((lang: string) => (
                            <div key={lang} className="flex items-center gap-1">
                              <Badge variant="outline">{lang.toUpperCase()}</Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => handleDeleteTranslation(item.id, lang)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(item.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          詳細
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 言語設定 */}
        <TabsContent value="languages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>サポート言語</CardTitle>
              <CardDescription>
                翻訳可能な言語一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {languages?.languages?.map((lang: any) => (
                  <div
                    key={lang.code}
                    className="p-4 border rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{lang.nativeName}</div>
                      <div className="text-sm text-muted-foreground">{lang.name}</div>
                    </div>
                    <Badge variant="outline">{lang.code.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>eBayマーケット</CardTitle>
              <CardDescription>
                各マーケットの対応言語
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>マーケット</TableHead>
                    <TableHead>国</TableHead>
                    <TableHead>言語</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {languages?.ebayMarkets?.map((market: any) => (
                    <TableRow key={market.code}>
                      <TableCell className="font-medium">{market.code}</TableCell>
                      <TableCell>{market.country}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{market.language.toUpperCase()}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 翻訳ダイアログ */}
      <Dialog open={translateDialogOpen} onOpenChange={setTranslateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>翻訳言語を選択</DialogTitle>
            <DialogDescription>
              翻訳先の言語を選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 py-4">
            {languages?.languages?.map((lang: any) => (
              <Button
                key={lang.code}
                variant={selectedLanguages.includes(lang.code) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleLanguage(lang.code)}
              >
                {lang.nativeName}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTranslateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleBulkTranslate} disabled={isTranslating}>
              {isTranslating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              翻訳開始
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* プレビューダイアログ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>翻訳プレビュー</DialogTitle>
          </DialogHeader>
          {selectedTranslation && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">元のタイトル</div>
                <div>{selectedTranslation.source?.title}</div>
              </div>
              {Object.entries(selectedTranslation.translations || {}).map(([lang, trans]: [string, any]) => (
                <div key={lang} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge>{lang.toUpperCase()}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(selectedTranslation.listingId, lang, trans)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{trans.title}</div>
                    {trans.description && (
                      <div className="text-muted-foreground mt-2 line-clamp-3">
                        {trans.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>翻訳を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Textarea
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>説明文</Label>
              <Textarea
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
