'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addToast } from '@/components/ui/toast';
import { Calendar, Clock, Loader2, Save, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { syncScheduleApi } from '@/lib/api';
import {
  type SyncSchedule as SyncScheduleType,
  type SyncScheduleConfig as SyncScheduleConfigType,
  syncSchedulesResponseSchema,
} from './types';

// Sync interval options
const intervalOptions = [
  { value: '1', label: '1時間' },
  { value: '3', label: '3時間' },
  { value: '6', label: '6時間' },
  { value: '12', label: '12時間' },
  { value: '24', label: '24時間' },
];

export function SyncScheduleSettings() {
  const [selectedMarketplace, setSelectedMarketplace] = useState<'JOOM' | 'EBAY' | 'ETSY' | 'SHOPIFY'>('JOOM');
  const [schedules, setSchedules] = useState<Record<string, SyncScheduleType>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load schedules
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const response = await fetch('/api/sync-schedules');
        if (response.ok) {
          const data = await response.json();
          const parsed = syncSchedulesResponseSchema.safeParse(data);
          if (parsed.success) {
            const scheduleMap: Record<string, SyncScheduleType> = {};
            parsed.data.data.forEach((s) => {
              scheduleMap[s.marketplace] = s;
            });
            setSchedules(scheduleMap);
          }
        } else {
          setDefaultSchedules();
        }
      } catch {
        setDefaultSchedules();
      } finally {
        setLoading(false);
      }
    };
    loadSchedules();
  }, []);

  const setDefaultSchedules = () => {
    setSchedules({
      JOOM: {
        marketplace: 'JOOM',
        inventory: { interval: 6, enabled: true },
        orders: { interval: 6, enabled: true },
        prices: { interval: 6, enabled: true },
        updatedAt: new Date().toISOString(),
      },
      EBAY: {
        marketplace: 'EBAY',
        inventory: { interval: 6, enabled: true },
        orders: { interval: 6, enabled: true },
        prices: { interval: 6, enabled: true },
        updatedAt: new Date().toISOString(),
      },
      ETSY: {
        marketplace: 'ETSY',
        inventory: { interval: 6, enabled: true },
        orders: { interval: 6, enabled: true },
        prices: { interval: 6, enabled: true },
        updatedAt: new Date().toISOString(),
      },
      SHOPIFY: {
        marketplace: 'SHOPIFY',
        inventory: { interval: 6, enabled: true },
        orders: { interval: 6, enabled: true },
        prices: { interval: 6, enabled: true },
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const currentSchedule = schedules[selectedMarketplace];

  const updateScheduleField = (
    syncType: 'inventory' | 'orders' | 'prices',
    field: 'interval' | 'enabled',
    value: number | boolean
  ) => {
    setSchedules((prev) => ({
      ...prev,
      [selectedMarketplace]: {
        ...prev[selectedMarketplace],
        [syncType]: {
          ...prev[selectedMarketplace]?.[syncType],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const schedule = schedules[selectedMarketplace];
      await syncScheduleApi.update(selectedMarketplace, {
        inventory: schedule.inventory,
        orders: schedule.orders,
        prices: schedule.prices,
      });
      addToast({ type: 'success', message: '同期スケジュールを保存しました' });
    } catch {
      addToast({ type: 'error', message: '保存に失敗しました（APIが未実装の可能性があります）' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" aria-live="polite" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Marketplace Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            同期スケジュール設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              マーケットプレイス
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMarketplace('JOOM')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'JOOM'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
                aria-pressed={selectedMarketplace === 'JOOM'}
                aria-label="Joom 同期スケジュールを選択"
              >
                <Store className="h-4 w-4" />
                Joom
              </button>
              <button
                onClick={() => setSelectedMarketplace('EBAY')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'EBAY'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
                aria-pressed={selectedMarketplace === 'EBAY'}
                aria-label="eBay 同期スケジュールを選択"
              >
                <Store className="h-4 w-4" />
                eBay
              </button>
              <button
                onClick={() => setSelectedMarketplace('ETSY')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'ETSY'
                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
                aria-pressed={selectedMarketplace === 'ETSY'}
                aria-label="Etsy 同期スケジュールを選択"
              >
                <Store className="h-4 w-4" />
                Etsy
              </button>
              <button
                onClick={() => setSelectedMarketplace('SHOPIFY')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'SHOPIFY'
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
                aria-pressed={selectedMarketplace === 'SHOPIFY'}
                aria-label="Shopify 同期スケジュールを選択"
              >
                <Store className="h-4 w-4" />
                Shopify
              </button>
            </div>
          </div>

          {currentSchedule && (
            <div className="space-y-6">
              {/* Inventory Sync */}
              <SyncTypeConfig
                label="在庫同期"
                description="商品の在庫数を同期します"
                config={currentSchedule.inventory}
                onIntervalChange={(v) => updateScheduleField('inventory', 'interval', v)}
                onEnabledChange={(v) => updateScheduleField('inventory', 'enabled', v)}
                color={
                  selectedMarketplace === 'JOOM'
                    ? 'amber'
                    : selectedMarketplace === 'EBAY'
                    ? 'blue'
                    : selectedMarketplace === 'ETSY'
                    ? 'orange'
                    : 'green'
                }
              />

              {/* Orders Sync */}
              <SyncTypeConfig
                label="注文同期"
                description="新規注文を取得・同期します"
                config={currentSchedule.orders}
                onIntervalChange={(v) => updateScheduleField('orders', 'interval', v)}
                onEnabledChange={(v) => updateScheduleField('orders', 'enabled', v)}
                color={
                  selectedMarketplace === 'JOOM'
                    ? 'amber'
                    : selectedMarketplace === 'EBAY'
                    ? 'blue'
                    : selectedMarketplace === 'ETSY'
                    ? 'orange'
                    : 'green'
                }
              />

              {/* Prices Sync */}
              <SyncTypeConfig
                label="価格同期"
                description="商品価格を同期・更新します"
                config={currentSchedule.prices}
                onIntervalChange={(v) => updateScheduleField('prices', 'interval', v)}
                onEnabledChange={(v) => updateScheduleField('prices', 'enabled', v)}
                color={
                  selectedMarketplace === 'JOOM'
                    ? 'amber'
                    : selectedMarketplace === 'EBAY'
                    ? 'blue'
                    : selectedMarketplace === 'ETSY'
                    ? 'orange'
                    : 'green'
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} aria-label="同期スケジュールを保存">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <h4 className="mb-2 font-medium text-amber-800 dark:text-amber-300">同期スケジュールについて</h4>
            <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
              <li>- 在庫同期: マーケットプレイスの在庫数を仕入れ元と同期</li>
              <li>- 注文同期: 新規注文の取得と処理状況の更新</li>
              <li>- 価格同期: 為替レートや仕入れ価格に基づく価格更新</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SyncTypeConfigProps {
  label: string;
  description: string;
  config: SyncScheduleConfigType;
  onIntervalChange: (value: number) => void;
  onEnabledChange: (value: boolean) => void;
  color: 'amber' | 'blue' | 'orange' | 'green';
}

const colorMap: Record<string, { bg: string; text: string }> = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
};

export function SyncTypeConfig({ label, description, config, onIntervalChange, onEnabledChange, color }: SyncTypeConfigProps) {
  const bgColor = colorMap[color]?.bg ?? colorMap.blue.bg;
  const textColor = colorMap[color]?.text ?? colorMap.blue.text;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', bgColor)}>
              <Clock className={cn('h-4 w-4', textColor)} />
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-white">{label}</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
          </div>
        </div>
        <Switch checked={config.enabled} onCheckedChange={onEnabledChange} aria-label={`${label} を有効化`} />
      </div>

      {config.enabled && (
        <div className="mt-4 flex items-center gap-4 pl-12">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">実行間隔:</label>
          <Select value={config.interval.toString()} onValueChange={(v: string) => onIntervalChange(Number(v))}>
            <SelectTrigger className="w-32" aria-label={`${label} の間隔`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervalOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} aria-label={`${opt.label}`}> 
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {config.lastRun && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">前回: {new Date(config.lastRun).toLocaleString('ja-JP')}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default SyncScheduleSettings;

