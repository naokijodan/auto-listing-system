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

// Phase 286: eBay Shipping Calculatorï¼ˆé€æ–™è¨ˆç®—ï¼‰
// ãƒ†ãƒ¼ãƒã‚«ãƒ©ãƒ¼: emerald-600

export default function EbayShippingCalculatorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-shipping-calculator/dashboard', fetcher);
  const { data: zonesData } = useSWR('/api/ebay-shipping-calculator/zones', fetcher);
  const { data: carriersData } = useSWR('/api/ebay-shipping-calculator/carriers', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-shipping-calculator/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-600">é€æ–™è¨ˆç®—</h1>
        <p className="text-gray-600">ã‚¼ãƒ¼ãƒ³ãƒ»ã‚­ãƒ£ãƒªã‚¢åˆ¥ã®é€æ–™è¨ˆç®—</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ãƒ€ãƒƒã‚·ãƒ¥ãƒœãƒ¼ãƒ‰</TabsTrigger>
          <TabsTrigger value="zones">ã‚¾ãƒ¼ãƒ³</TabsTrigger>
          <TabsTrigger value="carriers">ã‚­ãƒ£ãƒªã‚</TabsTrigger>
          <TabsTrigger value="calculate">è¨ˆç®—</TabsTrigger>
          <TabsTrigger value="analytics">åˆ†æ</TabsTrigger>
          <TabsTrigger value="settings">è¨­å®š</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">ç·å‡ºè·æ•°</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">{dashboardData?.totalShipments?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">å¹³å‡é€æ–™</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${dashboardData?.avgShippingCost || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">é…é”ç‡</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.deliveryRate || 0}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">ã‚³ã‚¹ãƒˆå‰Šé™¤</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">${dashboardData?.costSavings?.toLocaleString() || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>æœ€è¿‘ã®é…Œé€</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { orderId: 'ORD001', destination: 'US', carrier: 'FedEx', cost: 15, status: 'DELIVERED' },
                    { orderId: 'ORD002', destination: 'UK', carrier: 'DHL', cost: 18.5, status: 'IN_TRANSIT' },
                    { orderId: 'ORD003', destination: 'DE', carrier: 'UPS', cost: 22, status: 'SHIPPED' },
                  ].map((shipment) => (
                    <div key={shipment.orderId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{shipment.orderId}</div><div className="text-sm text-gray-500">{shipment.carrier} -> {shipment.destination}</div></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">${shipment.cost}</span>
                        <Badge className={shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{shipment.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>ã‚­ãƒ£ãƒªã‚¢åˆ¥å®Ÿç¸¾</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'FedEx', shipments: 500, onTime: 97 },{ name: 'DHL', shipments: 450, onTime: 98 },{ name: 'UPS', shipments: 350, onTime: 96 }].map((carrier) => (
                    <div key={carrier.name}>
                      <div className="flex justify-between mb-1"><span>{carrier.name}</span><span>{carrier.shipments}ä»¶ ({carrier.onTime}%)</span></div>
                      <Progress value={carrier.onTime} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="zones">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>é…é€ã‚¾ãƒ¼ãƒ³</CardTitle><Button className="bg-emerald-600 hover:bg-emerald-700">æ–°è¦ã‚¾ãƒ¼ãƒ³</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {zonesData?.zones?.map((zone: any) => (
                  <div key={zone.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center font-bold text-emerald-600">{zone.countries.length}</div>
                      <div><div className="font-medium">{zone.name}</div><div className="text-sm text-gray-500">åŸºæœ¬: ${zone.baseCost} / ${zone.perKgRate}/kg</div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{zone.deliveryDays.min}-{zone.deliveryDays.max}æ—¥</span>
                      <Button variant="outline" size="sm">ç·¨é›†</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carriers">
          <Card>
            <CardHeader><CardTitle>ã‚­ãƒ£ãƒªã‚¢ä¸€è¦§N/CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {carriersData?.carriers?.map((carrier: any) => (
                  <Card key={carrier.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{carrier.name}</CardTitle>
                        <Badge className={carrier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{c…½¥å‹•ä¸­' : 'ç„¡åŠ¹'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-gray-500">API ç­¦æ¥</span><Badge variant={carrier.apiConnected ? 'default' : 'secondary'}>{carrier.apiConnected ? 'æ¥ç¶š' : 'æœªæ¥ç¶š'}</Badge></div>
                        <div className="flex justify-between"><span className="text-gray-500">å¹³å‡é…é”æ—¥çù</span><span>{carrier.avgTransitDays}æ—¥</span></div>
                      </div>
                      <Button variant="outline" className="w-full mt-3">æ–™é‡‘è¨­å®š</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculate">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>é€æ–™è¨ˆç®—</CardTitle><CardDescription>é…é€å…ˆã¨é‡ãé‹å…¥åŠ›</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">é…é€€å…ˆå›½</label>
                  <Select><SelectTrigger><SelectValue placeholder="å›½ã‚’é¸æŠ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">ã‚¢ãƒ¡ãƒªã‚«</SelectItem>
                      <SelectItem value="UK">ã‚¤ã‚®ãƒªã‚¹</SelectItem>
                      <SelectItem value="DE">ãƒ‰ã‚¤ãƒ‰</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">é‡é‡ (kg)</label><Input type="number" placeholder="1.0" /></div>
                  <div><label className="text-sm font-medium">ã‚µã‚¤ã‚º(å¹…)</label><Input type="number" placeholder="30" /></div>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">è¨ˆç®—ã™ã‚‹</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>è¨ˆç®—çµæœ</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ carrier: 'FedEx', service: 'Express', cost: 25, days: '3-5' },{ carrier: 'FedEx', service: 'Standard', cost: 15, days: '5-8' },{ carrier: 'UPS', service: 'Ground', cost: 12, days: '7-10' }].map((quote, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 border rounded-lg ${idx === 1 ? 'border-emerald-500 bg-emerald-50' : ''}`}>
                      <div><div className="font-medium">{quote.carrier} {quote.service}</div><div className="text-sm text-gray-500">{quote.days}æ—¥</div></div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">${quote.cost}</span>
                        {idx === 1 && <Badge className="bg-emerald-100 text-emerald-700">ãŠã™ã™ã‚</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>é€æ–™ã‚³ã‚¹ãƒˆåˆ†æ</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold">$18,750</div>
                  <div className="text-gray-500">é30æ—¥é–“</div>
                </div>
                <div className="space-y-2">
                  {[{ carrier: 'FedEx', cost: 7250, percent: 39 },{ carrier: 'DHL', cost: 7200, percent: 38 },{ carrier: 'UPS', cost: 4300, percent: 23 }].map((item) => (
                    <div key={item.carrier}>
                      <div className="flex justify-between mb-1"><span>{item.carrier}</span><span>${item.cost.toLocaleString()} ({item.percent}%)</span></div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>é…é€€ãƒ‘ãƒ•ã‚©ãƒ¼ãƒãƒ³ã‚¹</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span>æ™‚é–“é€šã‚Šé…é”å„¢</span><span className="font-bold text-green-600">97.5%</span></div>
                  <div className="flex justify-between items-center"><span>å¹³å‡é…é€€æ—¥æ•°</span><span className="font-bold">5.2æ—¥</span></div>
                  <div className="flex justify-between items-center"><span>æŸå‚·ç‡ãÂò÷ããÇ7â6Æ74æÖSÒ&föçBÖ&öÆB#ãã"SÂ÷7ããÂöF—cà¢ÆF—b6Æ74æÖSÒ&fÆW‚§W7F–g’Ö&WGvVVâ—FV×2Ö6VçFW"#ãÇ7ãî{I¾ZKxèrOÇ7ããÇ7â6Æ74æÖSÒ&föçBÖ&öÆB#ããRSÂ÷7ããÂöF—cà¢ÂöF—cà¢Âô6&D6öçFVçCà¢Âô6&Cà¢ÂöF—cà¢ÂõF'46öçFVçCà ¢ÅF'46öçFVçBfÇVSÒ'6WGF–æw2#à¢ÆF—b6Æ74æÖSÒ&w&–Bw&–BÖ6öÇ2ÓÆs¦w&–BÖ6öÇ2Ó"vÓb#à¢Ä6&Cà¢Ä6&D†VFW#ãÄ6&EF—FÆSîYû®iÊÎŠŠŞZé£Âô6&EF—FÆSãÂô6&D†VFW#à¢Ä6&D6öçFVçB6Æ74æÖSÒ'76R×’ÓB#à¢ÆF—cãÆÆ&VÂ6Æ74æÖSÒ'FW‡B×6ÒföçBÖÖVF—VÒ#î88~89^8*8:¾888*Ş8:>8:®8*#ÂöÆ&VÃà¢Å6VÆV7BFVfVÇEfÇVS×·6WGF–æw4FFòæFVfVÇD6'&–W'Óà¢Å6VÆV7EG&–vvW#ãÅ6VÆV7EfÇVRóãÂõ6VÆV7EG&–vvW#à¢Å6VÆV7D6öçFVçCà¢Å6VÆV7D—FVÒfÇVSÒ$fVDW‚#äfVDWƒÂõ6VÆV7D—FVÓà¢Å6VÆV7D—FVÒfÇVSÒ$D„Â#äD„ÃÂõ6VÆV7D—FVÓà¢Å6VÆV7D—FVÒfÇVSÒ%U2#åU3Âõ6VÆV7D—FVÓà¢Âõ6VÆV7D6öçFVçCà¢Âõ6VÆV7Cà¢ÂöF—cà¢ÆF—cãÆÆ&VÂ6Æ74æÖSÒ'FW‡B×6ÒföçBÖÖVF—VÒ#î˜ii•Â^xZii8~8Ş8NX
NûÈ‚NûÈ“ÂöÆ&VÃãÄ–çWBG—SÒ&çVÖ&W""FVfVÇEfÇVS×·6WGF–æw4FFòæg&VU6†—–æuF‡&W6†öÆGÒóãÂöF—cà¢Âô6&D6öçFVçCà¢Âô6&Cà¢Ä6&Cà¢Ä6&D†VFW#ãÄ6&EF—FÆSîKùŞ™›®ŠŠŞZé®Zé®ŠŠŞZë“Âô6&EF—FÆSãÂô6&D†VFW#à¢Ä6&D6öçFVçB6Æ74æÖSÒ'76R×’ÓB#à¢ÆF—b6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"§W7F–g’Ö&WGvVVâ#ãÆF—cãÆF—b6Æ74æÖSÒ&föçBÖÖVF—VÒ#îKùŞ™›®iÈX«“ÂöF—cãÆF—b6Æ74æÖSÒ'FW‡B×6ÒFW‡BÖw&’ÓS#îš¹šŞYXnY88¾KùŞ™›®8).K¹88(³ÂöF—cãÂöF—cãÄ&FvRf&–çC×·6WGF–æw4FFòæ–ç7W&æ6TVæ&ÆVBòvFVfVÇBr¢w6V6öæF'’wÓç·6WGF–æw4FFòæ–ç7W&æ6TVæ&ÆVBòtôâr¢tôdbwÓÂô&FvSãÂöF—cà¢ÆF—cãÆÆ&VÂ6Æ74æÖSÒ'FW‡B×6ÒföçBÖÖVF—VÒ#îKùŞ™›®˜yJ8~8Ş8NX
NûÈ‚NûÈ“ÂöÆ&VÃãÄ–çWBG—SÒ&çVÖ&W""FVfVÇEfÇVS×·6WGF–æw4FFòæ–ç7W&æ6UF‡&W6†öÆGÒóãÂöF—cà¢ÆF—b6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"§W7F–g’Ö&WGvVVâ#ãÆF—cãÆF—b6Æ74æÖSÒ&föçBÖÖVF—VÒ#îiÈZè˜.˜h©ÓÂöF—cãÆF—b6Æ74æÖSÒ'FW‡B×6ÒFW‡BÖw&’ÓS#îˆz®X¹^8~iÈZè˜˜h©î8).hùjƒÂöF—cãÂöF—cãÄ&FvRf&–çC×·6WGF–æw4FFòæWFõ6VÆV7D6†VW7BòvFVfVÇBr¢w6V6öæF'’wÓç·6WGF–æw4FFòæWFõ6VÆV7D6†VW7Bòtôâr¢tôdbwÓÂô&FvSãÂöF—cà¢Âô6&D6öçFVçCà¢Âô6&Cà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&×BÓbfÆW‚§W7F–g’ÖVæB#ãÄ'WGFöâ6Æ74æÖSÒ&&rÖVÖW&ÆBÓc†÷fW#¦&rÖVÖW&ÆBÓs#îŠŠŞZé®8).KùŞZÙƒÂô'WGFöããÂöF—cà¢ÂõF'46öçFVçCà¢ÂõF'3à¢ÂöF—cà¢“°§Ğ