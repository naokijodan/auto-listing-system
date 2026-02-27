// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  RefreshCw,
  Plus,
  Save,
  History,
  Filter,
  Star,
  Trash2,
  Play,
  Clock,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface SavedSearch {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  filters: Record<string, any>;
  sortBy: string | null;
  sortOrder: string | null;
  columns: string[];
  isDefault: boolean;
  isShared: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface SearchHistory {
  id: string;
  entityType: string;
  query: string;
  filters: Record<string, any>;
  resultCount: number;
  executionTimeMs: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  [key: string]: any;
}

interface FieldDefinition {
  name: string;
  type: string;
  label: string;
  options?: string[];
}

const ENTITY_TYPES = [
  { value: 'PRODUCT', label: '商品' },
  { value: 'ORDER', label: '注文' },
  { value: 'LISTING', label: '出品' },
  { value: 'SHIPMENT', label: '発送' },
  { value: 'SUPPLIER', label: 'サプライヤー' },
  { value: 'CUSTOMER', label: '顧客' },
  { value: 'INVENTORY', label: '在庫' },
];

export default function AdvancedSearchPage() {
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState('PRODUCT');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [newSearchDesc, setNewSearchDesc] = useState('');

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/advanced-search/fields/${entityType}`);
      if (res.ok) {
        const data = await res.json();
        setFields(data.fields || []);
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    }
  }, [entityType]);

  const fetchSavedSearches = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/advanced-search/saved?includeShared=true`);
      if (res.ok) {
        const data = await res.json();
        setSavedSearches(data.searches || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved searches:', error);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/advanced-search/history?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  useEffect(() => {
    fetchFields();
    fetchSavedSearches();
    fetchHistory();
  }, [fetchFields, fetchSavedSearches, fetchHistory]);

  useEffect(() => {
    fetchFields();
  }, [entityType, fetchFields]);

  const handleSearch = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/advanced-search/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          query: query || undefined,
          filters,
          page,
          limit: 20,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotalResults(data.pagination.total);
        setCurrentPage(page);
        fetchHistory();
      }
    } catch (error) {
      toast.error('検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!newSearchName) {
      toast.error('検索名を入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/advanced-search/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSearchName,
          description: newSearchDesc || undefined,
          entityType,
          filters,
          sortBy: null,
          sortOrder: 'desc',
          columns: [],
        }),
      });

      if (res.ok) {
        toast.success('検索を保存しました');
        setIsSaveDialogOpen(false);
        setNewSearchName('');
        setNewSearchDesc('');
        fetchSavedSearches();
      }
    } catch (error) {
      toast.error('保存に失敗しました');
    }
  };

  const handleLoadSearch = async (search: SavedSearch) => {
    setEntityType(search.entityType);
    setFilters(search.filters);
    setQuery('');

    // 使用回数を更新
    await fetch(`${API_BASE}/advanced-search/saved/${search.id}/use`, {
      method: 'POST',
    });

    handleSearch(1);
    fetchSavedSearches();
  };

  const handleDeleteSearch = async (searchId: string) => {
    try {
      const res = await fetch(`${API_BASE}/advanced-search/saved/${searchId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('検索を削除しました');
        fetchSavedSearches();
      }
    } catch (error) {
      toast.error('削除に失敗しました');
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/advanced-search/history`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('履歴をクリアしました');
        fetchHistory();
      }
    } catch (error) {
      toast.error('クリアに失敗しました');
    }
  };

  const handleFilterChange = (fieldName: string, value: any) => {
    if (value === '' || value === undefined) {
      const newFilters = { ...filters };
      delete newFilters[fieldName];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [fieldName]: value });
    }
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
  };

  const getResultColumns = () => {
    switch (entityType) {
      case 'PRODUCT':
        return ['title', 'price', 'status', 'category', 'createdAt'];
      case 'ORDER':
        return ['externalOrderId', 'status', 'totalPrice', 'buyerName', 'createdAt'];
      case 'LISTING':
        return ['title', 'marketplace', 'status', 'price', 'createdAt'];
      case 'SHIPMENT':
        return ['trackingNumber', 'status', 'carrier', 'recipientName', 'createdAt'];
      default:
        return ['id', 'createdAt'];
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">高度な検索</h1>
          <p className="text-muted-foreground">複合条件での検索とフィルタリング</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* 検索パネル */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">検索条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* エンティティタイプ */}
              <div className="space-y-2">
                <Label>検索対象</Label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* キーワード検索 */}
              <div className="space-y-2">
                <Label>キーワード</Label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="検索キーワード..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                  />
                </div>
              </div>

              {/* フィルター */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>フィルター</Label>
                  {Object.keys(filters).length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" />
                      クリア
                    </Button>
                  )}
                </div>

                {fields.slice(0, 5).map((field) => (
                  <div key={field.name} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    {field.type === 'ENUM' ? (
                      <Select
                        value={filters[field.name] || ''}
                        onValueChange={(v) => handleFilterChange(field.name, v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="選択..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">すべて</SelectItem>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'NUMBER' ? (
                      <Input
                        type="number"
                        className="h-8"
                        value={filters[field.name] || ''}
                        onChange={(e) => handleFilterChange(field.name, e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={`${field.label}...`}
                      />
                    ) : (
                      <Input
                        className="h-8"
                        value={filters[field.name] || ''}
                        onChange={(e) => handleFilterChange(field.name, e.target.value)}
                        placeholder={`${field.label}...`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={() => handleSearch(1)} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  検索
                </Button>
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Save className="mr-2 h-4 w-4" />
                      検索を保存
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>検索条件を保存</DialogTitle>
                      <DialogDescription>現在の検索条件に名前をつけて保存します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>検索名</Label>
                        <Input
                          value={newSearchName}
                          onChange={(e) => setNewSearchName(e.target.value)}
                          placeholder="例：在庫切れ商品"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>説明（任意）</Label>
                        <Input
                          value={newSearchDesc}
                          onChange={(e) => setNewSearchDesc(e.target.value)}
                          placeholder="この検索の説明..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleSaveSearch}>保存</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* 保存済み検索 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">保存済み検索</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedSearches.length === 0 ? (
                <p className="text-sm text-muted-foreground">保存済みの検索がありません</p>
              ) : (
                savedSearches.slice(0, 5).map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleLoadSearch(search)}
                  >
                    <div className="flex items-center gap-2">
                      {search.isDefault && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                      <span className="text-sm">{search.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSearch(search.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* 結果パネル */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>検索結果</CardTitle>
                  <CardDescription>
                    {totalResults > 0 ? `${totalResults}件の結果` : '検索してください'}
                  </CardDescription>
                </div>
                {Object.keys(filters).length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(filters).map(([key, value]) => (
                      <Badge key={key} variant="secondary">
                        {key}: {String(value)}
                        <button
                          className="ml-1"
                          onClick={() => handleFilterChange(key, undefined)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {getResultColumns().map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id}>
                      {getResultColumns().map((col) => (
                        <TableCell key={col}>
                          {col === 'createdAt' && result[col]
                            ? new Date(result[col]).toLocaleDateString('ja-JP')
                            : col === 'price' || col === 'totalPrice'
                            ? `¥${Number(result[col]).toLocaleString()}`
                            : result[col] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {results.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={getResultColumns().length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        検索条件を入力して検索してください
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* ページネーション */}
              {totalResults > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => handleSearch(currentPage - 1)}
                  >
                    前へ
                  </Button>
                  <span className="py-2 px-4 text-sm">
                    {currentPage} / {Math.ceil(totalResults / 20)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= Math.ceil(totalResults / 20)}
                    onClick={() => handleSearch(currentPage + 1)}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 検索履歴 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">最近の検索</CardTitle>
                {searchHistory.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearHistory}>
                    履歴をクリア
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item) => (
                  <Badge
                    key={item.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => {
                      setEntityType(item.entityType);
                      setQuery(item.query);
                      setFilters(item.filters);
                      handleSearch(1);
                    }}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {item.query || `${item.entityType}検索`}
                    <span className="ml-2 text-muted-foreground">{item.resultCount}件</span>
                  </Badge>
                ))}
                {searchHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground">検索履歴がありません</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
