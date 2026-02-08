'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationChannels, NotificationChannel } from '@/lib/hooks';
import { postApi, patchApi, deleteApi, fetcher, api } from '@/lib/api';
import useSWR from 'swr';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  TestTube,
  Check,
  X,
  Loader2,
  MessageSquare,
  Hash,
  Send,
  Mail,
  AlertCircle,
  Store,
} from 'lucide-react';

const channelTypes = [
  { id: 'SLACK', label: 'Slack', icon: Hash, color: 'bg-[#4A154B]' },
  { id: 'DISCORD', label: 'Discord', icon: MessageSquare, color: 'bg-[#5865F2]' },
  { id: 'LINE', label: 'LINE', icon: Send, color: 'bg-[#00B900]' },
  { id: 'EMAIL', label: 'Email', icon: Mail, color: 'bg-zinc-600' },
];

interface EventType {
  value: string;
  label: string;
  category: string;
}

export default function NotificationChannelsPage() {
  const { data: channelsResponse, isLoading, mutate } = useNotificationChannels();
  const { data: eventTypesResponse } = useSWR<{ success: boolean; data: EventType[] }>(
    api.getEventTypes(),
    fetcher
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const channels = channelsResponse?.data || [];
  const eventTypes = eventTypesResponse?.data || [];

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await postApi(`/api/notification-channels/${id}/test`, {});
      alert('テスト通知を送信しました');
    } catch (error) {
      alert('テスト通知の送信に失敗しました');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このチャンネルを削除しますか？')) return;

    setDeletingId(id);
    try {
      await deleteApi(`/api/notification-channels/${id}`);
      mutate();
    } catch (error) {
      alert('削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (channel: NotificationChannel) => {
    try {
      await patchApi(`/api/notification-channels/${channel.id}`, {
        isActive: !channel.isActive,
      });
      mutate();
    } catch (error) {
      alert('更新に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">通知チャンネル設定</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Slack、Discord、LINE への通知を設定
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" />
          チャンネル追加
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Channel List */}
      {!isLoading && (
        <div className="space-y-4">
          {channels.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-4 text-zinc-500 dark:text-zinc-400">
                  通知チャンネルが設定されていません
                </p>
                <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4" />
                  最初のチャンネルを追加
                </Button>
              </CardContent>
            </Card>
          ) : (
            channels.map((channel) => {
              const channelType = channelTypes.find((t) => t.id === channel.channel);
              const Icon = channelType?.icon || Bell;

              return (
                <Card key={channel.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn('rounded-lg p-2.5', channelType?.color || 'bg-zinc-500')}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-zinc-900 dark:text-white">
                              {channel.name}
                            </h3>
                            <span className={cn(
                              'rounded px-1.5 py-0.5 text-xs font-medium',
                              channel.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                            )}>
                              {channel.isActive ? '有効' : '無効'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {channelType?.label} • {channel.enabledTypes.length}種類の通知
                            {channel.marketplaceFilter && channel.marketplaceFilter.length > 0 && (
                              <span className="ml-2">
                                • {channel.marketplaceFilter.join(', ')}のみ
                              </span>
                            )}
                          </p>
                          {channel.lastError && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3.5 w-3.5" />
                              {channel.lastError}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(channel.id)}
                          disabled={testingId === channel.id}
                        >
                          {testingId === channel.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="h-4 w-4" />
                          )}
                          テスト
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingChannel(channel)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(channel)}
                        >
                          {channel.isActive ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(channel.id)}
                          disabled={deletingId === channel.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {deletingId === channel.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Marketplace Filter */}
                    {channel.marketplaceFilter && channel.marketplaceFilter.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <Store className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">対象マーケット:</span>
                        {channel.marketplaceFilter.map((mp) => (
                          <span
                            key={mp}
                            className={cn(
                              'rounded px-2 py-0.5 text-xs font-medium',
                              mp === 'JOOM'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            )}
                          >
                            {mp}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Enabled Events */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {channel.enabledTypes.map((type) => {
                        const eventType = eventTypes.find((e) => e.value === type);
                        return (
                          <span
                            key={type}
                            className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {eventType?.label || type}
                          </span>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingChannel) && (
        <ChannelFormModal
          channel={editingChannel}
          eventTypes={eventTypes}
          onClose={() => {
            setShowAddForm(false);
            setEditingChannel(null);
          }}
          onSave={() => {
            mutate();
            setShowAddForm(false);
            setEditingChannel(null);
          }}
        />
      )}
    </div>
  );
}

interface ChannelFormModalProps {
  channel: NotificationChannel | null;
  eventTypes: EventType[];
  onClose: () => void;
  onSave: () => void;
}

function ChannelFormModal({ channel, eventTypes, onClose, onSave }: ChannelFormModalProps) {
  const isEditing = !!channel;
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    channel: channel?.channel || 'SLACK',
    name: channel?.name || '',
    webhookUrl: '',
    token: '',
    enabledTypes: channel?.enabledTypes || [],
    minSeverity: channel?.minSeverity || 'INFO',
    marketplaceFilter: channel?.marketplaceFilter || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = {
        channel: formData.channel,
        name: formData.name,
        enabledTypes: formData.enabledTypes,
        minSeverity: formData.minSeverity,
        marketplaceFilter: formData.marketplaceFilter,
      };

      if (formData.channel === 'LINE') {
        payload.token = formData.token;
      } else {
        payload.webhookUrl = formData.webhookUrl;
      }

      if (isEditing) {
        await patchApi(`/api/notification-channels/${channel.id}`, payload);
      } else {
        await postApi('/api/notification-channels', payload);
      }
      onSave();
    } catch (error) {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const toggleEventType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      enabledTypes: prev.enabledTypes.includes(type)
        ? prev.enabledTypes.filter((t) => t !== type)
        : [...prev.enabledTypes, type],
    }));
  };

  const toggleMarketplace = (mp: 'JOOM' | 'EBAY') => {
    setFormData((prev) => ({
      ...prev,
      marketplaceFilter: prev.marketplaceFilter.includes(mp)
        ? prev.marketplaceFilter.filter((m) => m !== mp)
        : [...prev.marketplaceFilter, mp],
    }));
  };

  // Group event types by category
  const groupedEventTypes = eventTypes.reduce((acc, et) => {
    if (!acc[et.category]) acc[et.category] = [];
    acc[et.category].push(et);
    return acc;
  }, {} as Record<string, EventType[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 dark:bg-zinc-900">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
          {isEditing ? 'チャンネル編集' : '新規チャンネル追加'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Channel Type */}
          {!isEditing && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                チャンネルタイプ
              </label>
              <div className="grid grid-cols-4 gap-2">
                {channelTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, channel: type.id as any }))}
                    className={cn(
                      'flex flex-col items-center rounded-lg border-2 p-3 transition-colors',
                      formData.channel === type.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                    )}
                  >
                    <div className={cn('rounded p-1.5', type.color)}>
                      <type.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="mt-1.5 text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              チャンネル名
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="例: メイン通知チャンネル"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800"
              required
            />
          </div>

          {/* Webhook URL or Token */}
          {formData.channel === 'LINE' ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                LINE Notify Token
              </label>
              <input
                type="password"
                value={formData.token}
                onChange={(e) => setFormData((prev) => ({ ...prev, token: e.target.value }))}
                placeholder="LINE Notify トークンを入力"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800"
                required={!isEditing}
              />
              {isEditing && (
                <p className="mt-1 text-xs text-zinc-500">
                  空欄の場合は既存のトークンを維持します
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.webhookUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, webhookUrl: e.target.value }))}
                placeholder={
                  formData.channel === 'SLACK'
                    ? 'https://hooks.slack.com/services/...'
                    : 'https://discord.com/api/webhooks/...'
                }
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800"
                required={!isEditing}
              />
              {isEditing && (
                <p className="mt-1 text-xs text-zinc-500">
                  空欄の場合は既存のURLを維持します
                </p>
              )}
            </div>
          )}

          {/* Min Severity */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              最低重要度
            </label>
            <select
              value={formData.minSeverity}
              onChange={(e) => setFormData((prev) => ({ ...prev, minSeverity: e.target.value }))}
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="INFO">INFO（すべて）</option>
              <option value="WARNING">WARNING以上</option>
              <option value="ERROR">ERRORのみ</option>
            </select>
          </div>

          {/* Marketplace Filter */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              対象マーケットプレイス
            </label>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              選択したマーケットプレイスの通知のみ受信します。未選択の場合は全てのマーケットプレイスから通知を受信します。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleMarketplace('JOOM')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  formData.marketplaceFilter.includes('JOOM')
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400'
                )}
              >
                <Store className="h-4 w-4" />
                Joom
                {formData.marketplaceFilter.includes('JOOM') && (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => toggleMarketplace('EBAY')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  formData.marketplaceFilter.includes('EBAY')
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400'
                )}
              >
                <Store className="h-4 w-4" />
                eBay
                {formData.marketplaceFilter.includes('EBAY') && (
                  <Check className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              {formData.marketplaceFilter.length === 0
                ? '全てのマーケットプレイスから通知を受信'
                : `${formData.marketplaceFilter.join(', ')} からの通知のみ受信`}
            </p>
          </div>

          {/* Event Types */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              通知するイベント
            </label>
            <div className="max-h-48 space-y-3 overflow-y-auto rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              {Object.entries(groupedEventTypes).map(([category, types]) => (
                <div key={category}>
                  <p className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {types.map((et) => (
                      <button
                        key={et.value}
                        type="button"
                        onClick={() => toggleEventType(et.value)}
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium transition-colors',
                          formData.enabledTypes.includes(et.value)
                            ? 'bg-amber-500 text-white'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                        )}
                      >
                        {et.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              {formData.enabledTypes.length}個のイベントを選択中
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? '更新' : '追加'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
