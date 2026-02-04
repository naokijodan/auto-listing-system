'use client';

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';

interface QueueData {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface QueueStatusProps {
  queues: QueueData[];
}

const queueLabels: Record<string, string> = {
  scrape: 'スクレイピング',
  translate: '翻訳',
  image: '画像処理',
  publish: '出品',
  inventory: '在庫チェック',
};

export function QueueStatus({ queues }: QueueStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>キュー状態</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {queues.map((queue) => {
            const total = queue.waiting + queue.active + queue.completed + queue.failed;
            const completedPercent = total > 0 ? (queue.completed / total) * 100 : 0;
            const failedPercent = total > 0 ? (queue.failed / total) * 100 : 0;
            const activePercent = total > 0 ? (queue.active / total) * 100 : 0;
            const waitingPercent = total > 0 ? (queue.waiting / total) * 100 : 0;

            return (
              <div key={queue.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {queueLabels[queue.name] || queue.name}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      待機: {queue.waiting}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                      実行中: {queue.active}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      完了: {queue.completed}
                    </span>
                    {queue.failed > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-400" />
                        失敗: {queue.failed}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  {completedPercent > 0 && (
                    <div
                      className="bg-emerald-400 transition-all"
                      style={{ width: `${completedPercent}%` }}
                    />
                  )}
                  {activePercent > 0 && (
                    <div
                      className="bg-blue-400 transition-all"
                      style={{ width: `${activePercent}%` }}
                    />
                  )}
                  {waitingPercent > 0 && (
                    <div
                      className="bg-amber-400 transition-all"
                      style={{ width: `${waitingPercent}%` }}
                    />
                  )}
                  {failedPercent > 0 && (
                    <div
                      className="bg-red-400 transition-all"
                      style={{ width: `${failedPercent}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
