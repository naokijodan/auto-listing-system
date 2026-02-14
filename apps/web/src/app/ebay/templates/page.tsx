'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { fetcher, postApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Star,
  StarOff,
  Loader2,
  ArrowLeft,
  Package,
  DollarSign,
  Tags,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

interface EbayTemplate {
  id: string;
  name: string;
  description: string | null;
  ebayCategoryId: string;
  ebayCategoryName: string | null;
  conditionId: string | null;
  conditionDescription: string | null;
  fulfillmentPolicyId: string | null;
  paymentPolicyId: string | null;
  returnPolicyId: string | null;
  defaultShippingCost: number | null;
  priceMultiplier: number;
  itemSpecifics: Record<string, string> | null;
  descriptionTemplate: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplatesResponse {
  templates: EbayTemplate[];
  total: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function patchApi<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    throw new Error('API error');
  }
  return res.json();
}

const defaultFormData = {
  name: '',
  description: '',
  ebayCategoryId: '',
  ebayCategoryName: '',
  conditionId: '',
  conditionDescription: '',
  fulfillmentPolicyId: '',
  paymentPolicyId: '',
  returnPolicyId: '',
  defaultShippingCost: '',
  priceMultiplier: '1.0',
  itemSpecifics: '{}',
  descriptionTemplate: '',
  isDefault: false,
};

export default function EbayTemplatesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EbayTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  const { data, error, isLoading, mutate } = useSWR<TemplatesResponse>(
    '/api/ebay-templates',
    fetcher
  );

  const openCreateModal = useCallback(() => {
    setEditingTemplate(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((template: EbayTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      ebayCategoryId: template.ebayCategoryId,
      ebayCategoryName: template.ebayCategoryName || '',
      conditionId: template.conditionId || '',
      conditionDescription: template.conditionDescription || '',
      fulfillmentPolicyId: template.fulfillmentPolicyId || '',
      paymentPolicyId: template.paymentPolicyId || '',
      returnPolicyId: template.returnPolicyId || '',
      defaultShippingCost: template.defaultShippingCost?.toString() || '',
      priceMultiplier: template.priceMultiplier?.toString() || '1.0',
      itemSpecifics: template.itemSpecifics
        ? JSON.stringify(template.itemSpecifics, null, 2)
        : '{}',
      descriptionTemplate: template.descriptionTemplate || '',
      isDefault: template.isDefault,
    });
    setIsModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.name || !formData.ebayCategoryId) {
      addToast('テンプレート名とカテゴリIDは必須です', 'error');
      return;
    }

    let itemSpecifics = {};
    try {
      itemSpecifics = formData.itemSpecifics ? JSON.parse(formData.itemSpecifics) : {};
    } catch {
      addToast('Item SpecificsはJSON形式で入力してください', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        ebayCategoryId: formData.ebayCategoryId,
        ebayCategoryName: formData.ebayCategoryName || null,
        conditionId: formData.conditionId || null,
        conditionDescription: formData.conditionDescription || null,
        fulfillmentPolicyId: formData.fulfillmentPolicyId || null,
        paymentPolicyId: formData.paymentPolicyId || null,
        returnPolicyId: formData.returnPolicyId || null,
        defaultShippingCost: formData.defaultShippingCost
          ? parseFloat(formData.defaultShippingCost)
          : null,
        priceMultiplier: parseFloat(formData.priceMultiplier) || 1.0,
        itemSpecifics,
        descriptionTemplate: formData.descriptionTemplate || null,
        isDefault: formData.isDefault,
      };

      if (editingTemplate) {
        await patchApi(`/api/ebay-templates/${editingTemplate.id}`, payload);
        addToast('テンプレートを更新しました', 'success');
      } else {
        await postApi('/api/ebay-templates', payload);
        addToast('テンプレートを作成しました', 'success');
      }

      setIsModalOpen(false);
      mutate();
    } catch {
      addToast('保存に失敗しました', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingTemplate, mutate]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('このテンプレートを削除しますか？')) return;

      setDeletingId(id);
      try {
        await deleteApi(`/api/ebay-templates/${id}`);
        addToast('テンプレートを削除しました', 'success');
        mutate();
      } catch {
        addToast('削除に失敗しました', 'error');
      } finally {
        setDeletingId(null);
      }
    },
    [mutate]
  );

  const handleToggleDefault = useCallback(
    async (template: EbayTemplate) => {
      try {
        await patchApi(`/api/ebay-templates/${template.id}`, {
          isDefault: !template.isDefault,
        });
        addToast(
          template.isDefault
            ? 'デフォルト設定を解除しました'
            : 'デフォルトに設定しました',
          'success'
        );
        mutate();
      } catch {
        addToast('更新に失敗しました', 'error');
      }
    },
    [mutate]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        テンプレートの読み込みに失敗しました
      </div>
    );
  }

  const templates = data?.templates || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              eBay管理
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              出品テンプレート
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              カテゴリ別のデフォルト設定を管理
            </p>
          </div>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          新規テンプレート
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                総テンプレート数
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {templates.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                デフォルト設定
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {templates.filter((t) => t.isDefault).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                カテゴリ数
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {new Set(templates.map((t) => t.ebayCategoryId)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            テンプレートがありません
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            新しいテンプレートを作成して、出品作業を効率化しましょう
          </p>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            テンプレートを作成
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                'p-4 hover:shadow-md transition-shadow',
                !template.isActive && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <Badge variant="secondary" className="shrink-0">
                        <Star className="h-3 w-3 mr-1" />
                        デフォルト
                      </Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Tags className="h-4 w-4" />
                  <span className="truncate">
                    {template.ebayCategoryName || template.ebayCategoryId}
                  </span>
                </div>
                {template.defaultShippingCost !== null && (
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <DollarSign className="h-4 w-4" />
                    <span>送料: ${template.defaultShippingCost.toFixed(2)}</span>
                  </div>
                )}
                {template.priceMultiplier !== 1.0 && (
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Settings className="h-4 w-4" />
                    <span>価格倍率: {template.priceMultiplier}x</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleDefault(template)}
                  title={
                    template.isDefault
                      ? 'デフォルト設定を解除'
                      : 'デフォルトに設定'
                  }
                >
                  {template.isDefault ? (
                    <StarOff className="h-4 w-4" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  disabled={deletingId === template.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {deletingId === template.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'テンプレートを編集' : '新規テンプレート'}
            </DialogTitle>
            <DialogDescription>
              カテゴリ別のデフォルト設定を登録します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">テンプレート名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="例: 腕時計テンプレート"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">カテゴリID *</Label>
                <Input
                  id="categoryId"
                  value={formData.ebayCategoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, ebayCategoryId: e.target.value })
                  }
                  placeholder="例: 31387"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryName">カテゴリ名</Label>
              <Input
                id="categoryName"
                value={formData.ebayCategoryName}
                onChange={(e) =>
                  setFormData({ ...formData, ebayCategoryName: e.target.value })
                }
                placeholder="例: Wristwatches"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="テンプレートの説明"
                rows={2}
              />
            </div>

            {/* Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conditionId">コンディションID</Label>
                <Input
                  id="conditionId"
                  value={formData.conditionId}
                  onChange={(e) =>
                    setFormData({ ...formData, conditionId: e.target.value })
                  }
                  placeholder="例: 1000 (New), 3000 (Used)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionDescription">コンディション説明</Label>
                <Input
                  id="conditionDescription"
                  value={formData.conditionDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditionDescription: e.target.value,
                    })
                  }
                  placeholder="商品の状態の詳細"
                />
              </div>
            </div>

            {/* Policies */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fulfillmentPolicyId">配送ポリシーID</Label>
                <Input
                  id="fulfillmentPolicyId"
                  value={formData.fulfillmentPolicyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fulfillmentPolicyId: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentPolicyId">支払いポリシーID</Label>
                <Input
                  id="paymentPolicyId"
                  value={formData.paymentPolicyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentPolicyId: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnPolicyId">返品ポリシーID</Label>
                <Input
                  id="returnPolicyId"
                  value={formData.returnPolicyId}
                  onChange={(e) =>
                    setFormData({ ...formData, returnPolicyId: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shippingCost">デフォルト送料 (USD)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  step="0.01"
                  value={formData.defaultShippingCost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultShippingCost: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceMultiplier">価格倍率</Label>
                <Input
                  id="priceMultiplier"
                  type="number"
                  step="0.1"
                  value={formData.priceMultiplier}
                  onChange={(e) =>
                    setFormData({ ...formData, priceMultiplier: e.target.value })
                  }
                  placeholder="1.0"
                />
              </div>
            </div>

            {/* Item Specifics */}
            <div className="space-y-2">
              <Label htmlFor="itemSpecifics">Item Specifics (JSON)</Label>
              <Textarea
                id="itemSpecifics"
                value={formData.itemSpecifics}
                onChange={(e) =>
                  setFormData({ ...formData, itemSpecifics: e.target.value })
                }
                placeholder='{"Brand": "Seiko", "Type": "Wristwatch"}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            {/* Description Template */}
            <div className="space-y-2">
              <Label htmlFor="descriptionTemplate">説明文テンプレート</Label>
              <Textarea
                id="descriptionTemplate"
                value={formData.descriptionTemplate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    descriptionTemplate: e.target.value,
                  })
                }
                placeholder="出品説明文のテンプレート（変数: {{title}}, {{condition}} など）"
                rows={4}
              />
            </div>

            {/* Default Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div>
                <Label htmlFor="isDefault" className="text-base">
                  デフォルトテンプレート
                </Label>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  このカテゴリの出品時に自動適用されます
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
