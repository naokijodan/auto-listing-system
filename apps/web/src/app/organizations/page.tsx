'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Building2,
  Plus,
  Users,
  Mail,
  Crown,
  Shield,
  User,
  Eye,
  Settings,
  Trash2,
  RefreshCw,
  UserPlus,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetcher, API_BASE } from '@/lib/api';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  email?: string;
  plan: string;
  status: string;
  maxUsers: number;
  maxProducts: number;
  _count?: {
    members: number;
    invitations: number;
  };
  members?: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name?: string;
      email: string;
      avatar?: string;
    };
  }>;
  invitations?: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
  }>;
}

interface Stats {
  total: number;
  active: number;
  totalMembers: number;
  pendingInvitations: number;
  byPlan: Record<string, number>;
}

const planConfig: Record<string, { label: string; color: string }> = {
  FREE: { label: '無料', color: 'bg-zinc-500' },
  STARTER: { label: 'スターター', color: 'bg-blue-500' },
  PROFESSIONAL: { label: 'プロ', color: 'bg-purple-500' },
  ENTERPRISE: { label: 'エンタープライズ', color: 'bg-amber-500' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'アクティブ', color: 'bg-green-500' },
  SUSPENDED: { label: '一時停止', color: 'bg-yellow-500' },
  CANCELLED: { label: '解約済み', color: 'bg-red-500' },
};

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  OWNER: { label: 'オーナー', icon: Crown, color: 'text-amber-500' },
  ADMIN: { label: '管理者', icon: Shield, color: 'text-blue-500' },
  MEMBER: { label: 'メンバー', icon: User, color: 'text-zinc-500' },
  VIEWER: { label: '閲覧者', icon: Eye, color: 'text-zinc-400' },
};

export default function OrganizationsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const { data: stats, mutate: mutateStats } = useSWR<Stats>(
    `${API_BASE}/organizations/stats`,
    fetcher
  );

  const { data: orgsData, mutate: mutateOrgs } = useSWR(
    `${API_BASE}/organizations`,
    fetcher
  );

  const organizations = orgsData?.data || [];

  const handleCreateOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          email: formData.get('email'),
        }),
      });

      if (response.ok) {
        toast.success('組織を作成しました');
        setIsCreateOpen(false);
        mutateOrgs();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '作成に失敗しました');
      }
    } catch {
      toast.error('作成に失敗しました');
    }
  };

  const handleInviteMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrg) return;

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(`${API_BASE}/organizations/${selectedOrg.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          role: formData.get('role'),
          message: formData.get('message'),
        }),
      });

      if (response.ok) {
        toast.success('招待を送信しました');
        setIsInviteOpen(false);
        mutateOrgs();
      } else {
        const error = await response.json();
        toast.error(error.error || '招待に失敗しました');
      }
    } catch {
      toast.error('招待に失敗しました');
    }
  };

  const handleRemoveMember = async (orgId: string, memberId: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;

    try {
      const response = await fetch(`${API_BASE}/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('メンバーを削除しました');
        mutateOrgs();
      } else {
        const error = await response.json();
        toast.error(error.error || '削除に失敗しました');
      }
    } catch {
      toast.error('削除に失敗しました');
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('招待リンクをコピーしました');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">組織管理</h1>
          <p className="text-sm text-zinc-500">チームと組織の管理</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規組織
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>組織を作成</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">組織名 *</Label>
                <Input id="name" name="name" required placeholder="株式会社サンプル" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea id="description" name="description" placeholder="組織の説明" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">連絡先メール</Label>
                <Input id="email" name="email" type="email" placeholder="contact@example.com" />
              </div>
              <Button type="submit" className="w-full">
                作成
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">組織数</CardTitle>
            <Building2 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-zinc-500">全{stats?.total || 0}組織</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">メンバー数</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">保留中の招待</CardTitle>
            <Mail className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingInvitations || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">有料プラン</CardTitle>
            <Crown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.byPlan?.STARTER || 0) +
                (stats?.byPlan?.PROFESSIONAL || 0) +
                (stats?.byPlan?.ENTERPRISE || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => mutateOrgs()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-zinc-500">
              組織がありません
            </CardContent>
          </Card>
        ) : (
          organizations.map((org: Organization) => (
            <Card
              key={org.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedOrg(org)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {org.logo ? (
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <Building2 className="h-6 w-6 text-zinc-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{org.name}</h3>
                      <p className="text-xs text-zinc-500">/{org.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={planConfig[org.plan]?.color}>
                      {planConfig[org.plan]?.label}
                    </Badge>
                    <Badge variant="outline" className={statusConfig[org.status]?.color}>
                      {statusConfig[org.status]?.label}
                    </Badge>
                  </div>
                </div>

                {org.description && (
                  <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{org.description}</p>
                )}

                <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {org._count?.members || 0}メンバー
                  </span>
                  <span>上限: {org.maxUsers}人</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Organization Detail Dialog */}
      {selectedOrg && (
        <Dialog open={!!selectedOrg} onOpenChange={() => setSelectedOrg(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedOrg.name}
                <Badge className={planConfig[selectedOrg.plan]?.color}>
                  {planConfig[selectedOrg.plan]?.label}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="members">
              <TabsList>
                <TabsTrigger value="members">メンバー</TabsTrigger>
                <TabsTrigger value="invitations">招待</TabsTrigger>
                <TabsTrigger value="settings">設定</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => setIsInviteOpen(true)}
                  >
                    <UserPlus className="mr-1 h-3 w-3" />
                    招待
                  </Button>
                </div>

                <div className="space-y-2">
                  {selectedOrg.members?.map((member) => {
                    const RoleIcon = roleConfig[member.role]?.icon || User;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            {member.user.avatar ? (
                              <img
                                src={member.user.avatar}
                                alt={member.user.name || ''}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <User className="h-5 w-5 text-zinc-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {member.user.name || member.user.email}
                            </p>
                            <p className="text-xs text-zinc-500">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 ${roleConfig[member.role]?.color}`}>
                            <RoleIcon className="h-4 w-4" />
                            <span className="text-sm">{roleConfig[member.role]?.label}</span>
                          </div>
                          {member.role !== 'OWNER' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(selectedOrg.id, member.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="invitations" className="space-y-4">
                {selectedOrg.invitations?.length === 0 ? (
                  <p className="text-center text-zinc-500 py-4">保留中の招待はありません</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOrg.invitations?.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-xs text-zinc-500">
                            {roleConfig[invitation.role]?.label} •{' '}
                            {new Date(invitation.expiresAt).toLocaleDateString('ja-JP')}まで有効
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invitation.id)}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          リンクをコピー
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>スラグ</Label>
                    <p className="mt-1">/{selectedOrg.slug}</p>
                  </div>
                  <div>
                    <Label>プラン</Label>
                    <p className="mt-1">{planConfig[selectedOrg.plan]?.label}</p>
                  </div>
                  <div>
                    <Label>メンバー上限</Label>
                    <p className="mt-1">{selectedOrg.maxUsers}人</p>
                  </div>
                  <div>
                    <Label>商品上限</Label>
                    <p className="mt-1">{selectedOrg.maxProducts}件</p>
                  </div>
                </div>
                {selectedOrg.email && (
                  <div>
                    <Label>連絡先メール</Label>
                    <p className="mt-1">{selectedOrg.email}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを招待</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">メールアドレス *</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                required
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>ロール</Label>
              <Select name="role" defaultValue="MEMBER">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">管理者</SelectItem>
                  <SelectItem value="MEMBER">メンバー</SelectItem>
                  <SelectItem value="VIEWER">閲覧者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-message">メッセージ（任意）</Label>
              <Textarea
                id="invite-message"
                name="message"
                placeholder="招待メッセージ"
              />
            </div>
            <Button type="submit" className="w-full">
              招待を送信
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
