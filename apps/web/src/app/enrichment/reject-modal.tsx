"use client";

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addToast } from '@/components/ui/toast';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isProcessing: boolean;
}

const PRESET_REASONS = ['画像不鮮明', 'スペック誤記', '禁制品の疑い', '価格異常', 'その他'] as const;

const reasonSchema = z.object({ reason: z.string().trim().min(1) });

export default function RejectModal({ isOpen, onClose, onSubmit, isProcessing }: RejectModalProps) {
  const [selected, setSelected] = useState<string>('');
  const [otherText, setOtherText] = useState<string>('');

  const finalReason = useMemo(() => {
    return selected === 'その他' ? otherText : selected;
  }, [selected, otherText]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const resetState = () => {
    setSelected('');
    setOtherText('');
  };

  const handleSubmit = () => {
    const parsed = reasonSchema.safeParse({ reason: finalReason });
    if (!parsed.success) {
      addToast({ type: 'error', message: '理由を入力してください' });
      return;
    }
    try {
      onSubmit(parsed.data.reason);
      resetState();
      onClose();
    } catch (e) {
      addToast({ type: 'error', message: '送信に失敗しました' });
    }
  };

  const titleId = 'reject-modal-title';

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label="タスクを却下"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>タスクを却下</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1" htmlFor="rejectReason">
              却下理由（定型）
            </label>
            <select
              id="rejectReason"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              disabled={isProcessing}
            >
              <option value="" disabled>
                選択してください
              </option>
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selected === 'その他' && (
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-300 mb-1" htmlFor="rejectOther">
                却下理由（自由入力）
              </label>
              <textarea
                id="rejectOther"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                className="w-full min-h-[96px] rounded-lg border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="理由を入力してください"
                disabled={isProcessing}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing} aria-busy={isProcessing} aria-live="polite">
            {isProcessing ? '送信中...' : '送信'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

