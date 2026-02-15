'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  User,
  BarChart3,
  Settings,
  Shield,
  CreditCard,
  Bell,
  Key,
  Link2,
  Edit,
  Check,
  X,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  LogOut,
  Smartphone,
  Mail,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'profile' | 'security' | 'payment' | 'notifications' | 'settings';

export default function AccountSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'profile', label: 'プロフィール', icon: <User className="w-4 h-4" /> },
    { id: 'security', label: 'セキュリティ', icon: <Shield className="w-4 h-4" /> },
    { id: 'payment', label: '支払い', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'notifications', label: '通知', icon: <Bell className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-slate-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
              <p className="text-sm text-gray-500">Account Settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-slate-600 text-slate-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'payment' && <PaymentTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/account-settings/dashboard/overview`, fetcher);
  const { data: activity } = useSWR(`${API_BASE}/ebay/account-settings/dashboard/activity`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/account-settings/dashboard/stats`, fetcher);

  return (
    <div className="space-y-6">
      {/* アカウント概要 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-slate-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{overview?.sellerId}</h2>
              <span className={`px-2 py-0.5 rounded text-xs ${
                overview?.accountStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {overview?.accountStatus === 'active' ? 'アクティブ' : '非アクティブ'}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                {overview?.sellerLevel}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{overview?.accountType}アカウント</p>
            <p className="text-sm text-gray-400 mt-1">登録日: {overview?.registeredAt}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">フィードバックスコア</p>
            <p className="text-2xl font-bold">{overview?.feedbackScore?.toLocaleString()}</p>
            <p className="text-sm text-green-600">{overview?.positiveFeedback}% ポジティブ</p>
          </div>
        </div>
      </div>

      {/* メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">アカウントヘルス</p>
          <p className="text-2xl font-bold">{overview?.accountHealth}%</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div className="h-2 bg-green-500 rounded-full" style={{ width: `${overview?.accountHealth}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">アクティブリスティング</p>
          <p className="text-2xl font-bold">{overview?.activeListings?.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">今月の売上</p>
          <p className="text-2xl font-bold">¥{stats?.thisMonth?.revenue?.toLocaleString()}</p>
          <p className="text-sm text-green-600">+{stats?.growth?.revenueGrowth}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">保留中のアクション</p>
          <p className="text-2xl font-bold text-amber-600">{overview?.pendingActions}</p>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">最近のアクティビティ</h3>
        <div className="space-y-3">
          {activity?.recentActivity?.map((act: {
            id: string;
            type: string;
            description: string;
            timestamp: string;
            location?: string;
            amount?: number;
            count?: number;
          }) => (
            <div key={act.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  act.type === 'login' ? 'bg-blue-100' :
                  act.type === 'listing' ? 'bg-green-100' :
                  act.type === 'payment' ? 'bg-amber-100' : 'bg-gray-100'
                }`}>
                  {act.type === 'login' && <LogOut className="w-5 h-5 text-blue-600" />}
                  {act.type === 'listing' && <Edit className="w-5 h-5 text-green-600" />}
                  {act.type === 'settings' && <Settings className="w-5 h-5 text-gray-600" />}
                  {act.type === 'payment' && <CreditCard className="w-5 h-5 text-amber-600" />}
                  {act.type === 'message' && <Mail className="w-5 h-5 text-purple-600" />}
                </div>
                <div>
                  <p className="font-medium">{act.description}</p>
                  <p className="text-sm text-gray-500">{act.timestamp}</p>
                </div>
              </div>
              {act.location && <span className="text-sm text-gray-400">{act.location}</span>}
              {act.amount && <span className="font-medium">¥{act.amount.toLocaleString()}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { data } = useSWR(`${API_BASE}/ebay/account-settings/profile`, fetcher);
  const { data: verification } = useSWR(`${API_BASE}/ebay/account-settings/profile/verification`, fetcher);

  return (
    <div className="space-y-6">
      {/* 基本情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">基本情報</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            <Edit className="w-4 h-4" />
            編集
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">ビジネス名</label>
            <p className="font-medium">{data?.profile?.businessName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">表示名</label>
            <p className="font-medium">{data?.profile?.displayName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">メールアドレス</label>
            <p className="font-medium">{data?.profile?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">電話番号</label>
            <p className="font-medium">{data?.profile?.phone}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">説明</label>
            <p className="text-gray-700">{data?.profile?.description}</p>
          </div>
        </div>
      </div>

      {/* 認証ステータス */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">認証ステータス</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(verification?.verification || {}).map(([key, verified]) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {verified ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="font-medium capitalize">{key.replace('Verified', '')}</p>
                <p className="text-sm text-gray-500">{verified ? '認証済み' : '未認証'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 書類 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">提出書類</h3>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            書類をアップロード
          </button>
        </div>
        <div className="space-y-3">
          {verification?.documents?.map((doc: {
            id: string;
            type: string;
            name: string;
            status: string;
            uploadedAt: string;
          }) => (
            <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                  <Upload className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-500">アップロード日: {doc.uploadedAt}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {doc.status === 'approved' ? '承認済み' : doc.status === 'pending' ? '審査中' : '却下'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const { data } = useSWR(`${API_BASE}/ebay/account-settings/security`, fetcher);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* パスワード */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">パスワード</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">パスワード</p>
            <p className="text-sm text-gray-500">最終更新: 30日前</p>
          </div>
          <button className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            パスワードを変更
          </button>
        </div>
      </div>

      {/* 2段階認証 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">2段階認証</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              data?.settings?.twoFactorEnabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Shield className={`w-6 h-6 ${data?.settings?.twoFactorEnabled ? 'text-green-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="font-medium">2段階認証</p>
              <p className="text-sm text-gray-500">
                {data?.settings?.twoFactorEnabled
                  ? `${data?.settings?.twoFactorMethod === 'authenticator' ? '認証アプリ' : 'SMS'}で有効化済み`
                  : '無効'}
              </p>
            </div>
          </div>
          <button className={`px-4 py-2 rounded-lg ${
            data?.settings?.twoFactorEnabled
              ? 'border text-gray-700 hover:bg-gray-50'
              : 'bg-slate-600 text-white hover:bg-slate-700'
          }`}>
            {data?.settings?.twoFactorEnabled ? '設定を変更' : '有効にする'}
          </button>
        </div>
      </div>

      {/* アクティブセッション */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">アクティブセッション</h3>
        <div className="space-y-3">
          {data?.sessions?.map((session: {
            id: string;
            device: string;
            browser: string;
            location: string;
            lastActive: string;
            current: boolean;
          }) => (
            <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-gray-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{session.device}</p>
                    {session.current && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">現在</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {session.browser} • {session.location} • {session.lastActive}
                  </p>
                </div>
              </div>
              {!session.current && (
                <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <LogOut className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* セキュリティ設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">セキュリティ設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">ログイン通知</p>
              <p className="text-sm text-gray-500">新しいログイン時にメール通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={data?.settings?.loginNotifications} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">不審なアクティビティアラート</p>
              <p className="text-sm text-gray-500">異常なアクティビティを検出した場合に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={data?.settings?.suspiciousActivityAlerts} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentTab() {
  const { data } = useSWR(`${API_BASE}/ebay/account-settings/payment`, fetcher);

  return (
    <div className="space-y-6">
      {/* 残高 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">利用可能残高</p>
          <p className="text-2xl font-bold text-green-600">¥{data?.currentBalance?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">保留中</p>
          <p className="text-2xl font-bold text-amber-600">¥{data?.pendingBalance?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">次回出金予定</p>
          <p className="text-xl font-bold">{data?.nextPayout?.date}</p>
          <p className="text-sm text-gray-400">¥{data?.nextPayout?.estimatedAmount?.toLocaleString()}</p>
        </div>
      </div>

      {/* 支払い方法 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">支払い方法</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>
        <div className="space-y-3">
          {data?.paymentMethods?.map((method: {
            id: string;
            type: string;
            name: string;
            accountLast4?: string;
            email?: string;
            primary: boolean;
            verified: boolean;
          }) => (
            <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{method.name}</p>
                    {method.primary && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">メイン</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {method.accountLast4 ? `****${method.accountLast4}` : method.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {method.verified ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 出金設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">出金設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">出金スケジュール</label>
            <select defaultValue={data?.payoutSchedule} className="w-full border rounded-lg px-3 py-2">
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
              <option value="biweekly">隔週</option>
              <option value="monthly">毎月</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">最低出金額</label>
            <input
              type="number"
              defaultValue={data?.minimumPayout}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="mt-6">
          <button className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            今すぐ出金をリクエスト
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/account-settings/notifications`, fetcher);

  const notificationCategories = [
    { key: 'orderReceived', label: '注文受信' },
    { key: 'orderShipped', label: '発送完了' },
    { key: 'paymentReceived', label: '支払い受領' },
    { key: 'buyerMessage', label: 'バイヤーメッセージ' },
    { key: 'promotions', label: 'プロモーション' },
    { key: 'newsletter', label: 'ニュースレター' },
  ];

  return (
    <div className="space-y-6">
      {/* メール通知 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">メール通知</h3>
        <div className="space-y-4">
          {notificationCategories.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between py-3 border-b last:border-0">
              <p className="font-medium">{cat.label}</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={data?.settings?.email?.[cat.key as keyof typeof data.settings.email]}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* プッシュ通知 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">プッシュ通知</h3>
        <div className="space-y-4">
          {notificationCategories.slice(0, 4).map((cat) => (
            <div key={cat.key} className="flex items-center justify-between py-3 border-b last:border-0">
              <p className="font-medium">{cat.label}</p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={data?.settings?.push?.[cat.key as keyof typeof data.settings.push]}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 通知頻度 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">通知頻度</p>
              <p className="text-sm text-gray-500">通知をまとめて送信</p>
            </div>
            <select defaultValue={data?.frequency} className="border rounded-lg px-3 py-2">
              <option value="immediate">即時</option>
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">おやすみモード</p>
              <p className="text-sm text-gray-500">指定時間は通知をミュート</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={data?.quietHours?.enabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/account-settings/settings/general`, fetcher);
  const { data: apiKeys } = useSWR(`${API_BASE}/ebay/account-settings/api-keys`, fetcher);
  const { data: integrations } = useSWR(`${API_BASE}/ebay/account-settings/integrations`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">言語</label>
            <select defaultValue={general?.settings?.language} className="w-full border rounded-lg px-3 py-2">
              <option value="ja">日本語</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">タイムゾーン</label>
            <select defaultValue={general?.settings?.timezone} className="w-full border rounded-lg px-3 py-2">
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">通貨</label>
            <select defaultValue={general?.settings?.currency} className="w-full border rounded-lg px-3 py-2">
              <option value="JPY">JPY (¥)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">日付形式</label>
            <select defaultValue={general?.settings?.dateFormat} className="w-full border rounded-lg px-3 py-2">
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>
          </div>
        </div>
      </div>

      {/* APIキー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">APIキー</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
        <div className="space-y-3">
          {apiKeys?.apiKeys?.map((key: {
            id: string;
            name: string;
            keyPrefix: string;
            createdAt: string;
            lastUsed: string;
            status: string;
          }) => (
            <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-sm text-gray-500">{key.keyPrefix}... • 最終使用: {key.lastUsed}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {key.status === 'active' ? 'アクティブ' : '無効'}
                </span>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 外部サービス連携 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">外部サービス連携</h3>
        <div className="space-y-3">
          {integrations?.integrations?.map((int: {
            id: string;
            service: string;
            status: string;
            connectedAt: string | null;
          }) => (
            <div key={int.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Link2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{int.service}</p>
                  {int.connectedAt && (
                    <p className="text-sm text-gray-500">接続日: {int.connectedAt}</p>
                  )}
                </div>
              </div>
              <button className={`px-4 py-2 rounded-lg ${
                int.status === 'connected'
                  ? 'border text-gray-700 hover:bg-gray-50'
                  : 'bg-slate-600 text-white hover:bg-slate-700'
              }`}>
                {int.status === 'connected' ? '連携解除' : '連携する'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}
