'use client';

import { Card } from '@/components/ui/card';
import { Package, CheckCircle, Clock, TrendingUp, DollarSign } from 'lucide-react';
import type { ListingStats } from './joom-types';

type JoomStatsProps = {
  stats: ListingStats;
  usdToJpy?: number;
};

export function JoomStats({ stats, usdToJpy }: JoomStatsProps) {
  return (
    <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">総出品数</p>
            <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
          </div>
        </div>
      </Card>
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">出品中</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          </div>
        </div>
      </Card>
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">出品待ち</p>
            <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
          </div>
        </div>
      </Card>
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">売上</p>
            <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">${stats.revenue.toFixed(0)}</p>
          </div>
        </div>
      </Card>
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">USD/JPY</p>
            <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
              {usdToJpy !== undefined ? usdToJpy.toFixed(2) : '---'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
