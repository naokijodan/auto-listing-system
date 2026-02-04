'use client';

import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { StatusBadge } from '../ui/badge';
import { getRelativeTime } from '@/lib/utils';
import {
  Package,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  DollarSign,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'product_added' | 'listing_published' | 'job_completed' | 'job_failed' | 'price_updated' | 'inventory_check';
  title: string;
  description?: string;
  status?: string;
  createdAt: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons = {
  product_added: Package,
  listing_published: ShoppingCart,
  job_completed: CheckCircle,
  job_failed: AlertCircle,
  price_updated: DollarSign,
  inventory_check: RefreshCw,
};

const activityColors = {
  product_added: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  listing_published: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  job_completed: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  job_failed: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  price_updated: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  inventory_check: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>最近のアクティビティ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              アクティビティはありません
            </p>
          ) : (
            activities.map((activity) => {
              const Icon = activityIcons[activity.type];
              const colorClass = activityColors[activity.type];

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                      {getRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                  {activity.status && <StatusBadge status={activity.status} />}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
