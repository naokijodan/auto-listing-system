
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EbayFeeCalculatorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sky-600">手数料計算</h1>
        <p className="text-gray-600">eBay各種手数料の計算・比較</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="calculate">計算</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">総手数料</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-600">$0</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均手数料率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calculate">
          <Card>
            <CardHeader>
              <CardTitle>手数料計算</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">計算機能は準備中です</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別手数料率</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">カテゴリデータを読み込み中...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
