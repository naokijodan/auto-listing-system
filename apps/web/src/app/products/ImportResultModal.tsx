'use client';

import { Button } from '@/components/ui/button';

interface ImportResultModalProps {
  result: {
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  };
  onClose: () => void;
}

export function ImportResultModal({ result, onClose }: ImportResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          インポート結果
        </h3>
        <div className="mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">新規作成:</span>
            <span className="font-medium text-emerald-600">{result.created}件</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">更新:</span>
            <span className="font-medium text-blue-600">{result.updated}件</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">失敗:</span>
            <span className="font-medium text-red-600">{result.failed}件</span>
          </div>
        </div>
        {result.errors.length > 0 && (
          <div className="mb-4 max-h-32 overflow-y-auto rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {result.errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </div>
        )}
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={onClose}
        >
          閉じる
        </Button>
      </div>
    </div>
  );
}

