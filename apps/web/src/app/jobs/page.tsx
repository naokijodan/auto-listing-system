'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { getRelativeTime } from '@/lib/utils';
import { RefreshCw, Play, Pause, Trash2 } from 'lucide-react';

const mockJobs = [
  {
    id: 'job-001',
    type: 'scrape',
    status: 'completed',
    productTitle: 'SEIKO SKX007',
    attempts: 1,
    createdAt: '2024-02-04T10:30:00Z',
    completedAt: '2024-02-04T10:30:45Z',
  },
  {
    id: 'job-002',
    type: 'translate',
    status: 'active',
    productTitle: 'ORIENT バンビーノ',
    attempts: 1,
    createdAt: '2024-02-04T10:31:00Z',
  },
  {
    id: 'job-003',
    type: 'image',
    status: 'waiting',
    productTitle: 'CASIO G-SHOCK',
    attempts: 0,
    createdAt: '2024-02-04T10:31:30Z',
  },
  {
    id: 'job-004',
    type: 'publish',
    status: 'failed',
    productTitle: 'CITIZEN プロマスター',
    attempts: 3,
    errorMessage: 'eBay API rate limit exceeded',
    createdAt: '2024-02-04T10:25:00Z',
  },
];

const jobTypeLabels: Record<string, string> = {
  scrape: 'スクレイピング',
  translate: '翻訳',
  image: '画像処理',
  publish: '出品',
  inventory: '在庫チェック',
};

const jobTypeColors: Record<string, string> = {
  scrape: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  translate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  image: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  publish: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  inventory: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400',
};

export default function JobsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ジョブ監視</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            バックグラウンドジョブの状態を監視
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Pause className="h-4 w-4" />
            一時停止
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4" />
            更新
          </Button>
        </div>
      </div>

      {/* Queue Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {['scrape', 'translate', 'image', 'publish', 'inventory'].map((queue) => (
          <Card key={queue} className="p-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${jobTypeColors[queue]}`}>
                {jobTypeLabels[queue]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">12</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">待機中</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">3</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">実行中</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Job List */}
      <Card>
        <CardHeader>
          <CardTitle>最近のジョブ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    ジョブID
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    タイプ
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    対象商品
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    試行回数
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    作成日時
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {mockJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="py-3 px-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                      {job.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${jobTypeColors[job.type]}`}>
                        {jobTypeLabels[job.type]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white">
                      {job.productTitle}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {job.attempts}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {getRelativeTime(job.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {job.status === 'failed' && (
                          <Button variant="ghost" size="sm" title="リトライ">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" title="削除">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mockJobs.some((job) => job.errorMessage) && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <h4 className="font-medium text-red-800 dark:text-red-400">エラー詳細</h4>
              {mockJobs
                .filter((job) => job.errorMessage)
                .map((job) => (
                  <p key={job.id} className="mt-1 text-sm text-red-600 dark:text-red-400">
                    <span className="font-mono">{job.id}</span>: {job.errorMessage}
                  </p>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
