// @ts-nocheck
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EbayShippingCalculatorPage() {
  const [activeTab, setActiveTab] = useState('calculator');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sky-600">送料計算</h1>
        <p className="text-gray-600">eBay国際配送料金の計算・比較</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="calculator">計算</TabsTrigger>
          <TabsTrigger value="carriers">配送業者</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle>送料計算</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">送料計算機能は準備中です</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carriers">
          <Card>
            <CardHeader>
              <CardTitle>配送業者一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">配送業者データを読み込み中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>配送設定</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">設定は準備中です</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
