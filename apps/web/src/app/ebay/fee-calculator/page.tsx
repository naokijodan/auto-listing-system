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

export default function EbayFeeCalculatorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-fee-calculator/dashboard', fetcher);
  const { data: categoriesData } = useSWR('/api/ebay-fee-calculator/categories', fetcher);
  const { data: storePlansData } = useSWR('/api/ebay-fee-calculator/store-plans', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-fee-calculator/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sky-600">æ‰‹æ•°æ–™è¨ˆç®—</h1>
        <p className="text-gray-600">eBayå„ç¨®æ‰‹æ•°æ–™ã®è¨ˆç®—ãƒ»æ¯”è¶</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ãƒ€ãƒƒã‚·ãƒ¥ãƒœãƒ¼ãƒˆ</TabsTrigger>
          <TabsTrigger value="calculate">è¨ˆç®—</TabsTrigger>
          <TabsTrigger value="categories">ã‚«ãƒ†ã‚´ãƒª</TabsTrigger>
          <TabsTrigger value="store-plans">ã‚¹ãƒˆã‚¢ãƒ—ãƒ©ãƒ³</TabsTrigger>
          <TabsTrigger value="analytics">åˆ†æ</TabsTrigger>
          <TabsTrigger value="settings">è¨­å®š</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">ç·æ‰‹æ•°æ–™</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-sky-600">${dashboardData?.totalFeesPaid?.toLocaleString() || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">å¹³å‡æ‰‹æ•°æ–™ç€</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardData?.avgFeeRate || 0}%</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">ã‚³ã‚¹ãƒˆå‰Šé™¤</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">${dashboardData?.feeSavings?.toLocaleString() || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">ã‚¹ãƒˆã‚¢ã‚¿ã‚¤ãƒ—</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{dashboardData?.storeType || 'N/A'}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>ã‚«ãƒ†ã‚´ãƒªåˆ¥æ‰‹æ•°æ–™</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ category: 'Watches', fees: 5000, rate: 11.5 },{ category: 'Electronics', fees: 3500, rate: 13.0 },{ category: 'Collectibles', fees: 2500, rate: 12.5 }].map((item) => (<div key={item.category}><div className="flex justify-between mb-1"><span>{item.category}</span><span>${item.fees.toLocaleString()} ({item.rate}%)</span></div><Progress value={item.rate * 5} className="h-2" /></div>))}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>æœ€è¿‘ã®æ‰‹æ•°æ–™</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ date: '2026-02-10', fees: 400, sales: 3200 },{ date: '2026-02-13', fees: 450, sales: 3600 },{ date: '2026-02-16', fees: 420, sales: 3350 }].map((item) => (<div key={item.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-sm">{item.date}</span><div className="flex gap-4"><span className="text-green-600">${item.sales}</span><span className="text-red-600">-${item.fees}</span></div></div>))}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="calculate">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>æ‰‹æ•°æ–™è¨ˆç®—</CardTitle><CardDescription>è²©å£²ä¾¡æ ¼ã¨ã‚«ãƒ†ã‚´ãƒªã‚’å…¥åŠ›</CardDescription></CardHeader><CardContent className="space-y-4"><div><label className="text-sm font-medium">è²©ã–ä¾¡æ ¼($)</label><Input type="number" placeholder="100" /></div><div><label className="text-sm font-medium">ã‚«ãƒ†ã‚´ãƒª</label><Select><SelectTrigger><SelectValue placeholder="é¸æŠ" /></SelectTrigger><SelectContent><SelectItem value="watches">Watches</SelectItem><SelectItem value="electronics">Electronics</SelectItem></SelectContent></Select></div><Button className="w-full bg-sky-600 hover:bg-sky-700">è¨ˆç®—ã™ã‚‹</Button></CardContent></Card>
            <Card><CardHeader><CardTitle>è¨ˆç®—çµæœ</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex justify-between"><span>è½æœ­æ‰‹æ•°æ–™</span><span className="font-bold">$12.90</span></div><div className="flex justify-between"><span>æ±ºæ¸ˆæ‰‹æ•°æ–™</span><span className="font-bold">$3.00</span></div><div className="border-t pt-2 flex justify-between"><span className="font-medium">ç·æ‰‹æ•°æ–™</span><span className="font-bold text-red-600">$15.90</span></div><div className="flex justify-between"><span className="font-medium">ç´”åˆ©ç›Š</span><span className="font-bold text-green-600">$84.10</span></div></div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="categories"><Card><CardHeader><CardTitle>ã‚«ãƒ†ã‚´ãƒªåˆ¥æ‰‹æ•°æ–™ç‡</CardTitle></CardHeader><CardContent><div className="space-y-3">{categoriesData?.categories?.map((cat: any) => (<div key={cat.id} className="flex items-center justify-between p-4 border rounded-lg"><div><div className="font-medium">{cat.name}</div><div className="text-sm text-gray-500">{cat.insertionFree} ç„¡æ–™å‡ºå“</div></div><Badge className="bg-sky-100 text-sky-700">{cat.fvfRate}%</Badge></div>))}</div></CardContent></Card></TabsContent>

        <TabsContent value="store-plans"><Card><CardHeader><CardTitle>ã‚¹ãƒˆã‚¢ãƒ—ãƒ©ãƒ³æ¯”è¼ƒÂ½CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{storePlansData?.plans?.map((plan: any) => (<Card key={plan.id} className="hover:shadow-md transition-shadow"><CardHeader><CardTitle>{plan.name}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-sky-600 mb-2">${plan.monthly}/month</div><div className="text-sm text-gray-500">FVFå‰²å¼•: {plan.fvfDiscount}%</div><div className="text-sm text-gray-500">ç„¡æ–™å‡ºå“: {plan.freeListings}</div></CardContent></Card>))}</div></CardContent></Card></TabsContent>

        <TabsContent value="analytics"><Card><CardHeader><CardTitle>æ‰‹æ•°æ–™åˆ†æ</CardTitle></CardHeader><CardContent><div className="text-center text-gray-500">åˆ†æãƒ‡ãƒ¼ã‚¿ã‚’è¡¨ç¤ºä¸­...</div></CardContent></Card></TabsContent>

        <TabsContent value="settings"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle>è¨­å®šå®šê*jë®ºæĞØ\™]OĞØ\™XY\Ø\™ÛÛ[Û\ÜÓ˜[YOHœÜXÙK^KM]ˆÛ\ÜÓ˜[YOH™›^][\ËXÙ[\ˆ\İYKX™]ÙY[ˆ]]ˆÛ\ÜÓ˜[YOH™›Û[YY][H¸àåøàëxàè¸àï8à­øàéøàìù¢bù¥l9¥¦z!êk§yio9i*ÏÙ]Ù]˜YÙH˜\šX[^ÜÙ][™ÜÑ]OËš[˜ÛYT›Û[İY™Y\ÈÈ	ÙY˜][	Èˆ	ÜÙXÛÛ™\IßOÜÙ][™ÜÑ]OËš[˜ÛYT›Û[İY™Y\ÈÈ	ÓÓ‰Èˆ	ÓÑ‘‰ßOĞ˜YÙOÙ]]ˆÛ\ÜÓ˜[YOH™›^][\ËXÙ[\ˆ\İYKX™]ÙY[ˆ]]ˆÛ\ÜÓ˜[YOH™›Û[YY][Hº!ê¹båz*"9ë¥ÏÙ]Ù]˜YÙH˜\šX[^ÜÙ][™ÜÑ]OË˜]]ĞØ[İ[]HÈ	ÙY˜][	Èˆ	ÜÙXÛÛ™\IßOÜÙ][™ÜÑ]OË˜]]ĞØ[İ[]HÈ	ÓÓ‰Èˆ	ÓÑ‘‰ßOĞ˜YÙOÙ]ĞØ\™ÛÛ[ĞØ\™Ù]]ˆÛ\ÜÓ˜[YOH›]Mˆ›^\İYKY[™]ÛˆÛ\ÜÓ˜[YOH˜™Ë\ÚŞKMŒİ™\˜™Ë\ÚŞKMÌº*+yk¦¸à¤¹/çykfĞ]ÛÙ]ÕXœĞÛÛ[‚ˆÕXœÏ‚ˆÙ]‚ˆ
NÂŸB