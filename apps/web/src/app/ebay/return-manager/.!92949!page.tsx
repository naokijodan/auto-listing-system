
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 287: eBay Return Manager（返品絠理）
// テーマカラー: purple-600

export default function EbayReturnManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-return-manager/dashboard', fetcher);
  const { data: returnsData } = useSWR('/api/ebay-return-manager/returns', fetcher);
  const { data: policiesData } = useSWR('/api/ebay-return-manager/policies', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-return-manager/settings', fetcher);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '審明待';
      case 'APPROVED': return '承認済';
