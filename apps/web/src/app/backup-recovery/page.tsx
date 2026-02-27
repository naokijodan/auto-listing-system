// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import {
  Database,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  HardDrive,
  Calendar,
  Shield,
  Download,
  Trash2,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface BackupStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  successRate: number;
  totalSchedules: number;
  activeSchedules: number;
  totalRecoveryPoints: number;
  verifiedPoints: number;
  totalStorageBytes: number;
}

interface BackupJob {
  id: string;
  name: string;
  description?: string;
  backupType: string;
  target: string;
  storage: string;
  status: string;
  sizeBytes?: number;
  compressedSize?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
  schedule?: { name: string };
  _count?: { recoveryPoints: number };
}

interface BackupSchedule {
  id: string;
  name: string;
  description?: string;
  backupType: string;
  target: string;
  storage: string;
  cronExpression: string;
  retentionDays: number;
  maxBackups: number;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  _count?: { jobs: number };
}

interface RecoveryPoint {
  id: string;
  name: string;
  description?: string;
  pointInTime: string;
  sizeBytes: number;
  checksum: string;
  isVerified: boolean;
  verifiedAt?: string;
  verificationStatus?: string;
  restorable: boolean;
  backupJob?: { name: string; backupType: string; target: string };
}

export default function BackupRecoveryPage() {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<RecoveryPoint | null>(null);

  const [newBackup, setNewBackup] = useState({
    name: '',
    backupType: 'FULL',
    target: 'DATABASE',
    storage: 'S3',
  });

  const [newSchedule, setNewSchedule] = useState({
    name: '',
    description: '',
    backupType: 'FULL',
    target: 'DATABASE',
    storage: 'S3',
    cronExpression: '0 2 * * *',
    retentionDays: 30,
    maxBackups: 10,
    encryptionEnabled: true,
    compressionEnabled: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, schedulesRes, pointsRes] = await Promise.all([
        fetch(`${API_BASE}/backup-recovery/stats`),
        fetch(`${API_BASE}/backup-recovery/jobs`),
        fetch(`${API_BASE}/backup-recovery/schedules`),
        fetch(`${API_BASE}/backup-recovery/recovery-points`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }
      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (pointsRes.ok) {
        const data = await pointsRes.json();
        setRecoveryPoints(data.recoveryPoints || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startBackup = async () => {
    try {
      const res = await fetch(`${API_BASE}/backup-recovery/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBackup),
      });

      if (res.ok) {
        setIsBackupDialogOpen(false);
        setNewBackup({ name: '', backupType: 'FULL', target: 'DATABASE', storage: 'S3' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to start backup:', error);
    }
  };

  const createSchedule = async () => {
    try {
      const res = await fetch(`${API_BASE}/backup-recovery/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });

      if (res.ok) {
        setIsScheduleDialogOpen(false);
        setNewSchedule({
          name: '',
          description: '',
          backupType: 'FULL',
          target: 'DATABASE',
          storage: 'S3',
          cronExpression: '0 2 * * *',
          retentionDays: 30,
          maxBackups: 10,
          encryptionEnabled: true,
          compressionEnabled: true,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const toggleSchedule = async (id: string) => {
    try {
      await fetch(`${API_BASE}/backup-recovery/schedules/${id}/toggle`, {
        method: 'PATCH',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('このスケジュールを削除しますか？')) return;
    try {
      await fetch(`${API_BASE}/backup-recovery/schedules/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  const startRestore = async () => {
    if (!selectedPoint) return;
    try {
      const res = await fetch(`${API_BASE}/backup-recovery/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryPointId: selectedPoint.id }),
      });

      if (res.ok) {
        setIsRestoreDialogOpen(false);
        setSelectedPoint(null);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to start restore:', error);
    }
  };

  const verifyPoint = async (id: string) => {
    try {
      await fetch(`${API_BASE}/backup-recovery/verify/${id}`, {
        method: 'POST',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to verify recovery point:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      COMPLETED: 'default',
      RUNNING: 'secondary',
      PENDING: 'outline',
      FAILED: 'destructive',
      CANCELLED: 'outline',
      VERIFYING: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">バックアップ・リカバリ</h1>
          <p className="text-muted-foreground">データの保護と復旧管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                バックアップ開始
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>バックアップ開始</DialogTitle>
                <DialogDescription>新しいバックアップを開始します</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>バックアップ名</Label>
                  <Input
                    value={newBackup.name}
                    onChange={(e) => setNewBackup({ ...newBackup, name: e.target.value })}
                    placeholder="バックアップ名を入力"
                  />
                </div>
                <div>
                  <Label>タイプ</Label>
                  <Select
                    value={newBackup.backupType}
                    onValueChange={(v) => setNewBackup({ ...newBackup, backupType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL">フルバックアップ</SelectItem>
                      <SelectItem value="INCREMENTAL">増分バックアップ</SelectItem>
                      <SelectItem value="DIFFERENTIAL">差分バックアップ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>対象</Label>
                  <Select
                    value={newBackup.target}
                    onValueChange={(v) => setNewBackup({ ...newBackup, target: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DATABASE">データベース</SelectItem>
                      <SelectItem value="FILES">ファイル</SelectItem>
                      <SelectItem value="REDIS">Redis</SelectItem>
                      <SelectItem value="FULL_SYSTEM">フルシステム</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>保存先</Label>
                  <Select
                    value={newBackup.storage}
                    onValueChange={(v) => setNewBackup({ ...newBackup, storage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S3">Amazon S3</SelectItem>
                      <SelectItem value="GCS">Google Cloud Storage</SelectItem>
                      <SelectItem value="AZURE_BLOB">Azure Blob</SelectItem>
                      <SelectItem value="LOCAL">ローカル</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={startBackup}>開始</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総バックアップ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              成功率: {stats?.successRate || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">実行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.runningJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              完了: {stats?.completedJobs || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">スケジュール</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSchedules || 0}</div>
            <p className="text-xs text-muted-foreground">
              有効: {stats?.activeSchedules || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">リカバリポイント</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRecoveryPoints || 0}</div>
            <p className="text-xs text-muted-foreground">
              検証済: {stats?.verifiedPoints || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ストレージ使用量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(Number(stats?.totalStorageBytes || 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">
            <Database className="h-4 w-4 mr-2" />
            バックアップ
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Calendar className="h-4 w-4 mr-2" />
            スケジュール
          </TabsTrigger>
          <TabsTrigger value="recovery">
            <Shield className="h-4 w-4 mr-2" />
            リカバリ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>バックアップジョブ</CardTitle>
              <CardDescription>実行されたバックアップの履歴</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    バックアップジョブがありません
                  </p>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <HardDrive className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{job.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{job.backupType}</Badge>
                            <span>{job.target}</span>
                            <span>→</span>
                            <span>{job.storage}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {job.sizeBytes && (
                          <span className="text-sm text-muted-foreground">
                            {formatBytes(Number(job.sizeBytes))}
                          </span>
                        )}
                        {getStatusBadge(job.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>バックアップスケジュール</CardTitle>
                <CardDescription>定期バックアップの設定</CardDescription>
              </div>
              <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    スケジュール作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>バックアップスケジュール作成</DialogTitle>
                    <DialogDescription>定期的なバックアップを設定します</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>スケジュール名</Label>
                      <Input
                        value={newSchedule.name}
                        onChange={(e) =>
                          setNewSchedule({ ...newSchedule, name: e.target.value })
                        }
                        placeholder="Daily Database Backup"
                      />
                    </div>
                    <div>
                      <Label>Cron式</Label>
                      <Input
                        value={newSchedule.cronExpression}
                        onChange={(e) =>
                          setNewSchedule({ ...newSchedule, cronExpression: e.target.value })
                        }
                        placeholder="0 2 * * *"
                      />
                    </div>
                    <div>
                      <Label>タイプ</Label>
                      <Select
                        value={newSchedule.backupType}
                        onValueChange={(v) =>
                          setNewSchedule({ ...newSchedule, backupType: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">フルバックアップ</SelectItem>
                          <SelectItem value="INCREMENTAL">増分バックアップ</SelectItem>
                          <SelectItem value="DIFFERENTIAL">差分バックアップ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>対象</Label>
                      <Select
                        value={newSchedule.target}
                        onValueChange={(v) => setNewSchedule({ ...newSchedule, target: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DATABASE">データベース</SelectItem>
                          <SelectItem value="FILES">ファイル</SelectItem>
                          <SelectItem value="REDIS">Redis</SelectItem>
                          <SelectItem value="FULL_SYSTEM">フルシステム</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>保持日数</Label>
                      <Input
                        type="number"
                        value={newSchedule.retentionDays}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            retentionDays: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>最大保持数</Label>
                      <Input
                        type="number"
                        value={newSchedule.maxBackups}
                        onChange={(e) =>
                          setNewSchedule({
                            ...newSchedule,
                            maxBackups: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newSchedule.encryptionEnabled}
                        onCheckedChange={(v) =>
                          setNewSchedule({ ...newSchedule, encryptionEnabled: v })
                        }
                      />
                      <Label>暗号化を有効にする</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={newSchedule.compressionEnabled}
                        onCheckedChange={(v) =>
                          setNewSchedule({ ...newSchedule, compressionEnabled: v })
                        }
                      />
                      <Label>圧縮を有効にする</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={createSchedule}>作成</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    スケジュールがありません
                  </p>
                ) : (
                  schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{schedule.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <code className="bg-muted px-1 rounded">
                              {schedule.cronExpression}
                            </code>
                            <Badge variant="outline">{schedule.backupType}</Badge>
                            <span>{schedule.target}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground">
                          <div>保持: {schedule.retentionDays}日</div>
                          <div>実行回数: {schedule._count?.jobs || 0}</div>
                        </div>
                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={() => toggleSchedule(schedule.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSchedule(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>リカバリポイント</CardTitle>
              <CardDescription>復元可能なバックアップポイント</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recoveryPoints.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    リカバリポイントがありません
                  </p>
                ) : (
                  recoveryPoints.map((point) => (
                    <div
                      key={point.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Shield className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{point.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {new Date(point.pointInTime).toLocaleString('ja-JP')}
                            </span>
                            <span>{formatBytes(Number(point.sizeBytes))}</span>
                            {point.backupJob && (
                              <Badge variant="outline">{point.backupJob.backupType}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {point.isVerified ? (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            検証済
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            未検証
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verifyPoint(point.id)}
                          disabled={point.isVerified}
                        >
                          検証
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPoint(point);
                            setIsRestoreDialogOpen(true);
                          }}
                          disabled={!point.restorable}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          リストア
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* リストアダイアログ */}
          <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>リストア確認</DialogTitle>
                <DialogDescription>
                  このリカバリポイントからデータを復元します。
                  この操作は現在のデータを上書きする可能性があります。
                </DialogDescription>
              </DialogHeader>
              {selectedPoint && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium">{selectedPoint.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      ポイント: {new Date(selectedPoint.pointInTime).toLocaleString('ja-JP')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      サイズ: {formatBytes(Number(selectedPoint.sizeBytes))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      リストアを実行すると、現在のデータが上書きされます。
                      この操作は取り消すことができません。
                    </span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button variant="destructive" onClick={startRestore}>
                  リストア実行
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
