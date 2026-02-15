'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Users,
  Plus,
  Play,
  Pause,
  MessageSquare,
  Eye,
  Edit3,
  UserPlus,
  LogOut,
  Clock,
  Circle,
  Send,
  Lock,
  Unlock,
  RefreshCw,
  Settings,
  Video,
  Mic,
  Share2,
} from 'lucide-react';

interface Session {
  id: string;
  name: string;
  type: string;
  status: string;
  participants: Array<{
    userId: string;
    name: string;
    role: string;
    avatar: string;
    joinedAt: string;
    cursor?: { listingId: string; field: string } | null;
    isOnline?: boolean;
  }>;
  targetIds: string[];
  createdAt: string;
  lastActivity: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: string;
  createdAt: string;
}

interface OnlineUser {
  userId: string;
  name: string;
  avatar: string;
  status: string;
  currentSession: string | null;
  lastSeen: string;
}

export default function RealtimeCollabPage() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'presence' | 'chat' | 'settings'>('sessions');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const { data: sessionsData } = useSWR<{ sessions: Session[] }>(
    '/api/ebay-realtime-collab/sessions',
    fetcher
  );

  const { data: presenceData } = useSWR<{ users: OnlineUser[]; onlineCount: number }>(
    '/api/ebay-realtime-collab/presence',
    fetcher
  );

  const { data: messagesData } = useSWR<{ messages: Message[] }>(
    selectedSession ? `/api/ebay-realtime-collab/sessions/${selectedSession}/messages` : null,
    fetcher
  );

  const { data: settingsData } = useSWR(
    '/api/ebay-realtime-collab/settings',
    fetcher
  );

  const sessions = sessionsData?.sessions ?? [];
  const onlineUsers = presenceData?.users ?? [];
  const messages = messagesData?.messages ?? [];

  const tabs = [
    { id: 'sessions', label: 'セッション', icon: Users },
    { id: 'presence', label: 'オンライン', icon: Circle },
    { id: 'chat', label: 'チャット', icon: MessageSquare },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'paused': return 'bg-amber-500';
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-zinc-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'inventory': return '在庫管理';
      case 'listing': return '出品作業';
      case 'pricing': return '価格調整';
      default: return '一般';
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">リアルタイムコラボレーション</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              チームでリアルタイムに共同作業
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-4">
            <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {presenceData?.onlineCount ?? 0} オンライン
            </span>
          </div>
          <Button variant="outline" size="sm">
            <Video className="h-4 w-4 mr-1" />
            ビデオ通話
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新規セッション
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* セッション一覧 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">アクティブセッション</h3>
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedSession === session.id
                      ? 'ring-2 ring-blue-500'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedSession(session.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-zinc-900 dark:text-white">{session.name}</h4>
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`} />
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {getTypeLabel(session.type)} • {session.targetIds.length}件の対象
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {session.status === 'active' ? (
                        <Button variant="ghost" size="sm">
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 参加者 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-2">
                      {session.participants.slice(0, 4).map((p) => (
                        <img
                          key={p.userId}
                          src={p.avatar}
                          alt={p.name}
                          className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-800"
                          title={p.name}
                        />
                      ))}
                      {session.participants.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium">
                          +{session.participants.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{session.participants.length}人参加中</span>
                  </div>

                  {/* アクション */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <UserPlus className="h-3 w-3 mr-1" />
                      招待
                    </Button>
                    <Button variant="primary" size="sm" className="flex-1">
                      <Play className="h-3 w-3 mr-1" />
                      参加
                    </Button>
                  </div>
                </Card>
              ))}

              {/* 新規セッション作成カード */}
              <Card className="p-4 border-dashed border-2 cursor-pointer hover:border-blue-500 transition-colors">
                <div className="flex flex-col items-center justify-center py-4 text-zinc-500">
                  <Plus className="h-8 w-8 mb-2" />
                  <span className="text-sm">新しいセッションを作成</span>
                </div>
              </Card>
            </div>

            {/* セッション詳細 */}
            <div>
              {selectedSession ? (
                <Card className="p-4">
                  <h3 className="font-medium text-zinc-900 dark:text-white mb-4">セッション詳細</h3>

                  {/* 参加者詳細 */}
                  <div className="mb-4">
                    <h4 className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">参加者</h4>
                    <div className="space-y-2">
                      {sessions.find(s => s.id === selectedSession)?.participants.map((p) => (
                        <div key={p.userId} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full" />
                              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${p.isOnline !== false ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">{p.name}</p>
                              <p className="text-xs text-zinc-500">{p.role === 'owner' ? 'オーナー' : p.role === 'editor' ? '編集者' : '閲覧者'}</p>
                            </div>
                          </div>
                          {p.cursor && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {p.cursor.field}を編集中
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ロック状況 */}
                  <div className="mb-4">
                    <h4 className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">ロック状況</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <span>lst_001 / price - 田中</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <span>lst_003 / title - 佐藤</span>
                      </div>
                    </div>
                  </div>

                  {/* アクション */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-1" />
                      共有
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <LogOut className="h-4 w-4 mr-1" />
                      退出
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 flex flex-col items-center justify-center text-zinc-500">
                  <Users className="h-12 w-12 mb-3 opacity-50" />
                  <p>セッションを選択してください</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'presence' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlineUsers.map((user) => (
              <Card key={user.userId} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">{user.name}</h4>
                    <p className="text-xs text-zinc-500">
                      {user.status === 'online' ? 'オンライン' : user.status === 'away' ? '離席中' : 'オフライン'}
                    </p>
                  </div>
                </div>
                {user.currentSession && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                    セッションに参加中
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    メッセージ
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Video className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* セッション選択 */}
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">セッション選択</h3>
              <div className="space-y-2">
                {sessions.filter(s => s.status === 'active').map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSession === session.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <p className="font-medium text-sm text-zinc-900 dark:text-white">{session.name}</p>
                    <p className="text-xs text-zinc-500">{session.participants.length}人参加中</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* チャットエリア */}
            <Card className="col-span-2 p-4 flex flex-col">
              {selectedSession ? (
                <>
                  <div className="flex-1 overflow-auto mb-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.type === 'system' ? 'justify-center' : ''}`}
                      >
                        {msg.type === 'system' ? (
                          <p className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                            {msg.content}
                          </p>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                              {msg.userName.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-zinc-900 dark:text-white">{msg.userName}</span>
                                <span className="text-xs text-zinc-400">
                                  {new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300">{msg.content}</p>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* メッセージ入力 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="メッセージを入力..."
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                    <Button variant="primary">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500">
                  <p>セッションを選択してチャットを開始</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">コラボレーション設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">自動参加</p>
                    <p className="text-xs text-zinc-500">招待されたセッションに自動で参加</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData?.autoJoinEnabled} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">通知</p>
                    <p className="text-xs text-zinc-500">セッション更新の通知を受け取る</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData?.notificationsEnabled} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">カーソル追跡</p>
                    <p className="text-xs text-zinc-500">他のユーザーのカーソル位置を表示</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData?.cursorTrackingEnabled} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">チャット</p>
                    <p className="text-xs text-zinc-500">セッション内チャットを有効化</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData?.chatEnabled} className="toggle" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">コンフリクト解決</p>
                  <select className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    <option value="last-write-wins">最後の変更を優先</option>
                    <option value="first-write-wins">最初の変更を優先</option>
                    <option value="manual">手動で解決</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">プレゼンス設定</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">ステータス</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500 mr-1" />
                      オンライン
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Circle className="h-3 w-3 fill-amber-500 text-amber-500 mr-1" />
                      離席中
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Circle className="h-3 w-3 fill-red-500 text-red-500 mr-1" />
                      取り込み中
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">タイムアウト（秒）</p>
                  <input
                    type="number"
                    defaultValue={settingsData?.presenceTimeout || 300}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                  <p className="text-xs text-zinc-500 mt-1">非アクティブ後に離席ステータスに変更するまでの時間</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
