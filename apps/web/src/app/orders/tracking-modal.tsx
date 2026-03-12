"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addToast } from '@/components/ui/toast';
import { addTrackingSchema, CARRIER_OPTIONS } from './types';

interface TrackingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { trackingNumber: string; trackingCarrier: string }) => Promise<void> | void;
}

export default function TrackingModal({ open, onClose, onSubmit }: TrackingModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsed = addTrackingSchema.safeParse({
      trackingNumber,
      trackingCarrier: carrier,
    });
    if (!parsed.success) {
      addToast({ type: 'error', message: '入力が正しくありません' });
      return;
    }

    try {
      setIsSubmitting(true);
      const data = parsed.data;
      await onSubmit({
        trackingNumber: data.trackingNumber.trim(),
        trackingCarrier: data.trackingCarrier,
      });
      setTrackingNumber('');
      setCarrier('');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '追跡情報の追加に失敗しました';
      addToast({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-label="追跡情報の追加">
        <DialogHeader>
          <DialogTitle>追跡情報を追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1" htmlFor="carrier">
              配送業者
            </label>
            <select
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              aria-label="配送業者を選択"
              className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              disabled={isSubmitting}
            >
              <option value="" disabled>
                選択してください
              </option>
              {CARRIER_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1" htmlFor="trackingNumber">
              追跡番号
            </label>
            <input
              id="trackingNumber"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              aria-label="追跡番号を入力"
              className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              disabled={isSubmitting}
              placeholder="例: AB123456789JP"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} aria-busy={isSubmitting} aria-live="polite">
            {isSubmitting ? '送信中...' : '送信'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

