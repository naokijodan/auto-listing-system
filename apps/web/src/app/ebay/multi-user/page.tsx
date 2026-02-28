
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Users,
  RefreshCw,
  Plus,
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  Mail,
  Lock,
  Key,
  Building2,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';

type Tab = 'users' | 'roles' | 'teams' | 'permissions' | 'activity';

export default function MultiUserPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // データ取得
  const { data: usersData, mutate: mutateUsers } = useSWR<any>(
    `/api/ebay-multi-user/users${searchQuery ? `?search=${searchQuery}` : ''}${selectedRole ? `${searchQuery ? '&' : '?'}role=${selectedRole}` : ''}`,
    fetcher
  );
  const { data: rolesData, mutate: mutateRoles } = useSWR<any>('/api/ebay-multi-user/roles', fetcher);
  const { data: teamsData, mutate: mutateTeams } = useSWR<any>('/api/ebay-multi-user/teams', fetcher);
  const { data: permissionsData } = useSWR<any>('/api/ebay-multi-user/permissions', fetcher);
  const { data: activityData } = useSWR<any>('/api/ebay-multi-user/activity', fetcher);
  const { data: dashboardData } = useSWR<any>('/api/ebay-multi-user/dashboard', fetcher);

  const users = usersData?.users ?? [];
  const roles = rolesData?.roles ?? [];
  const teams = teamsData?.teams ?? [];
  const permissions = permissionsData?.permissions ?? [];
  const activities = activityData?.activities ?? [];
  const dashboard = dashboardData ?? { userStats: {}, roleStats: {}, teamStats: {} };

  const handleResetPassword = async (userId: string) => {
    try {
      await postApi(`/api/ebay-multi-user/users/${userId}/reset-password`, {});
      addToast({ type: 'success', message: 'パスワードリセットメールを送信しました' });
    } catch {
      addToast({ type: 'error', message: 'パスワードリセットに失敗しました' });
    }
  };

  const handleToggleMfa = async (userId: string, enabled: boolean) => {
    try {
      await postApi(`/api/ebay-multi-user/users/${userId}/mfa`, { enabled: !enabled });
      addToast({ type: 'success', message: 'MFA設定を更新しました' });
      mutateUsers();
    } catch {
      addToast({ type: 'error', message: 'MFA設定の更新に失敗しました' });
    }
  };

  const handleChangeUserStatus = async (userId: string, status: string) => {
    try {
      await postApi(`/api/ebay-multi-user/users/${userId}/status`, { status });
      addToast({ type: 'success', message: 'ユーザーステータスを更新しました' });
      mutateUsers();
    } catch {
      addToast({ type: 'error', message: 'ステータス更新に失敗しました' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('このユーザーを削除しますか？')) return;
    try {
      await deleteApi(`/api/ebay-multi-user/users/${userId}`);
      addToast({ type: 'success', message: 'ユーザーを削除しました' });
      mutateUsers();
    } catch {
      addToast({ type: 'error', message: 'ユーザー削除に失敗しました' });
    }
  };

  const tabs = [
    { id: 'users', label: 'ユーザー', icon: Users },
    { id: 'roles', label: 'ロール', icon: Shield },
    { id: 'teams', label: 'チーム', icon: Building2 },
    { id: 'permissions', label: '権限', icon: Key },
    { id: 'activity', label: 'アクティビティ', icon: History },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">管理者</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">マネージャー</span>;
      case 'STAFF':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">スタッフ</span>;
      case 'VIEWER':
        return <span className="px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-700">閲覧者</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-700">{role}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" />有効</span>;
      case 'INACTIVE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-500"><XCircle className="h-3 w-3" />無効</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" />招待中</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-500">{status}</span>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">マルチユーザー管理</h1>
            <p className="text-sm text-zinc-500">アクティブユーザー: {dashboard.userStats.active ?? 0}名</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowUserModal(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            ユーザー招待
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mutateUsers()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">総ユーザー</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard.userStats.total ?? 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">アクティブ</p>
              <p className="text-2xl font-bold text-emerald-600">{dashboard.userStats.active ?? 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">ロール</p>
              <p className="text-2xl font-bold text-purple-600">{dashboard.roleStats.total ?? 0}</p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">チーム</p>
              <p className="text-2xl font-bold text-cyan-600">{dashboard.teamStats.total ?? 0}</p>
            </div>
            <Building2 className="h-8 w-8 text-cyan-500" />
          </div>
        </Card>
      </div>

      {/* タブ */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="名前またはメールで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-3 rounded-lg border border-zinc-200 bg-white text-sm"
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">すべてのロール</option>
                <option value="ADMIN">管理者</option>
                <option value="MANAGER">マネージャー</option>
                <option value="STAFF">スタッフ</option>
                <option value="VIEWER">閲覧者</option>
              </select>
            </div>

            <div className="space-y-2">
              {users.map((user: any) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-zinc-900 dark:text-white">{user.name}</h3>
                          {getRoleBadge(user.role)}
                          {getStatusBadge(user.status)}
                        </div>
                        <p className="text-sm text-zinc-500">{user.email}</p>
                        <p className="text-xs text-zinc-400">
                          {user.department && `${user.department} • `}
                          最終ログイン: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ja-JP') : '未ログイン'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleMfa(user.id, user.mfaEnabled)}
                        className={user.mfaEnabled ? 'text-emerald-600' : 'text-zinc-400'}
                        title={user.mfaEnabled ? 'MFA有効' : 'MFA無効'}
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleResetPassword(user.id)} title="パスワードリセット">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="編集">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <select
                        value={user.status}
                        onChange={(e) => handleChangeUserStatus(user.id, e.target.value)}
                        className="h-8 rounded border border-zinc-200 bg-white px-2 text-xs"
                      >
                        <option value="ACTIVE">有効</option>
                        <option value="INACTIVE">無効</option>
                        <option value="SUSPENDED">停止</option>
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowRoleModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                カスタムロール
              </Button>
            </div>

            <div className="space-y-2">
              {roles.map((role: any) => (
                <Card key={role.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{role.displayName}</h3>
                        {role.isSystem && <span className="px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-500">システム</span>}
                      </div>
                      <p className="text-sm text-zinc-500">{role.description}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        ユーザー数: {role.userCount} • 権限数: {role.permissions.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!role.isSystem && (
                        <>
                          <Button variant="ghost" size="sm" title="編集">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" title="削除">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowTeamModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                チーム作成
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {teams.map((team: any) => (
                <Card key={team.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-zinc-900 dark:text-white">{team.name}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" title="編集">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" title="削除">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 mb-2">{team.description}</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm text-zinc-600">{team.memberCount}名</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
            {['LISTINGS', 'ORDERS', 'REPORTS', 'USERS', 'SETTINGS', 'PRICING'].map((category) => (
              <Card key={category} className="p-4">
                <h3 className="font-medium text-zinc-900 dark:text-white mb-3">{category}</h3>
                <div className="flex flex-wrap gap-2">
                  {permissions
                    .filter((p: any) => p.category === category)
                    .map((permission: any) => (
                      <span
                        key={permission.id}
                        className="px-3 py-1 rounded-full text-sm bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {permission.name}
                      </span>
                    ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-2">
            {activities.map((activity: any) => (
              <Card key={activity.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center">
                    <History className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-900 dark:text-white">
                      <span className="font-medium">{activity.userName}</span>が
                      <span className="text-zinc-500"> {activity.action}</span>を実行
                      {activity.target && <span className="text-zinc-500"> ({activity.target})</span>}
                    </p>
                    <p className="text-xs text-zinc-400">{new Date(activity.timestamp).toLocaleString('ja-JP')}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
