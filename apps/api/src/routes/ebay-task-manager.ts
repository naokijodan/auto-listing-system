import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// ============================================================
// Phase 225: Task Manager（タスク管理）
// 28エンドポイント
// ============================================================

// --- ダッシュボード ---

// GET /dashboard/overview - タスク概要
router.get('/dashboard/overview', async (_req: Request, res: Response) => {
  res.json({
    totalTasks: 156,
    pendingTasks: 42,
    inProgressTasks: 28,
    completedTasks: 78,
    overdueTasks: 8,
    todayDueTasks: 12,
    completionRate: 65.0,
    lastUpdated: '2026-02-16 10:00:00',
  });
});

// GET /dashboard/my-tasks - 自分のタスク
router.get('/dashboard/my-tasks', async (_req: Request, res: Response) => {
  res.json({
    tasks: [
      { id: 'task_001', title: '新商品の出品準備', priority: 'high', status: 'in_progress', dueDate: '2026-02-16', progress: 60 },
      { id: 'task_002', title: '返品対応 #RET-123', priority: 'high', status: 'pending', dueDate: '2026-02-16', progress: 0 },
      { id: 'task_003', title: '在庫確認', priority: 'medium', status: 'in_progress', dueDate: '2026-02-17', progress: 30 },
      { id: 'task_004', title: '月次レポート作成', priority: 'low', status: 'pending', dueDate: '2026-02-20', progress: 0 },
    ],
  });
});

// GET /dashboard/team - チームタスク
router.get('/dashboard/team', async (_req: Request, res: Response) => {
  res.json({
    members: [
      { id: 'user_001', name: '田中太郎', totalTasks: 25, completed: 18, inProgress: 5, pending: 2 },
      { id: 'user_002', name: '鈴木花子', totalTasks: 22, completed: 15, inProgress: 4, pending: 3 },
      { id: 'user_003', name: '佐藤一郎', totalTasks: 20, completed: 12, inProgress: 6, pending: 2 },
    ],
  });
});

// --- タスク管理 ---

// GET /tasks - タスク一覧
router.get('/tasks', async (_req: Request, res: Response) => {
  res.json({
    tasks: [
      { id: 'task_001', title: '新商品の出品準備', description: 'Seiko新作の出品準備', priority: 'high', status: 'in_progress', assignee: '田中太郎', dueDate: '2026-02-16', tags: ['出品', '時計'], progress: 60, createdAt: '2026-02-14' },
      { id: 'task_002', title: '返品対応 #RET-123', description: '顧客からの返品リクエスト対応', priority: 'high', status: 'pending', assignee: '鈴木花子', dueDate: '2026-02-16', tags: ['返品'], progress: 0, createdAt: '2026-02-15' },
      { id: 'task_003', title: '在庫確認', description: '月末在庫棚卸し', priority: 'medium', status: 'in_progress', assignee: '佐藤一郎', dueDate: '2026-02-17', tags: ['在庫'], progress: 30, createdAt: '2026-02-10' },
      { id: 'task_004', title: '月次レポート作成', description: '2月の売上レポート', priority: 'low', status: 'pending', assignee: '田中太郎', dueDate: '2026-02-20', tags: ['レポート'], progress: 0, createdAt: '2026-02-01' },
    ],
    total: 156,
    statuses: ['pending', 'in_progress', 'completed', 'cancelled'],
    priorities: ['high', 'medium', 'low'],
  });
});

// GET /tasks/:id - タスク詳細
router.get('/tasks/:id', async (req: Request, res: Response) => {
  res.json({
    task: {
      id: req.params.id,
      title: '新商品の出品準備',
      description: 'Seiko新作の出品準備。商品写真撮影、説明文作成、価格設定を行う。',
      priority: 'high',
      status: 'in_progress',
      assignee: {
        id: 'user_001',
        name: '田中太郎',
        email: 'tanaka@example.com',
      },
      dueDate: '2026-02-16',
      tags: ['出品', '時計'],
      progress: 60,
      checklist: [
        { id: 'check_001', title: '商品写真撮影', completed: true },
        { id: 'check_002', title: '説明文作成', completed: true },
        { id: 'check_003', title: '価格設定', completed: false },
        { id: 'check_004', title: '最終確認', completed: false },
      ],
      comments: [
        { id: 'comment_001', user: '鈴木花子', text: '写真確認しました。問題なしです。', createdAt: '2026-02-15 14:00:00' },
      ],
      attachments: [
        { id: 'att_001', name: 'product_photo.jpg', size: '2.5MB', uploadedAt: '2026-02-14 10:00:00' },
      ],
      createdAt: '2026-02-14 09:00:00',
      updatedAt: '2026-02-16 09:30:00',
    },
  });
});

// POST /tasks - タスク作成
router.post('/tasks', async (_req: Request, res: Response) => {
  res.json({ success: true, taskId: 'task_new_001', message: 'タスクを作成しました' });
});

// PUT /tasks/:id - タスク更新
router.put('/tasks/:id', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, message: 'タスクを更新しました' });
});

// PUT /tasks/:id/status - ステータス更新
router.put('/tasks/:id/status', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, message: 'ステータスを更新しました' });
});

// PUT /tasks/:id/assign - 担当者変更
router.put('/tasks/:id/assign', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, message: '担当者を変更しました' });
});

// DELETE /tasks/:id - タスク削除
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, message: 'タスクを削除しました' });
});

// --- チェックリスト ---

// POST /tasks/:id/checklist - チェックリスト追加
router.post('/tasks/:id/checklist', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, checklistId: 'check_new_001', message: 'チェックリストを追加しました' });
});

// PUT /tasks/:id/checklist/:checkId - チェックリスト更新
router.put('/tasks/:id/checklist/:checkId', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, checklistId: req.params.checkId, message: 'チェックリストを更新しました' });
});

// --- コメント ---

// POST /tasks/:id/comments - コメント追加
router.post('/tasks/:id/comments', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, commentId: 'comment_new_001', message: 'コメントを追加しました' });
});

// DELETE /tasks/:id/comments/:commentId - コメント削除
router.delete('/tasks/:id/comments/:commentId', async (req: Request, res: Response) => {
  res.json({ success: true, taskId: req.params.id, commentId: req.params.commentId, message: 'コメントを削除しました' });
});

// --- プロジェクト ---

// GET /projects - プロジェクト一覧
router.get('/projects', async (_req: Request, res: Response) => {
  res.json({
    projects: [
      { id: '1', name: '新商品出品', tasksCount: 25, completedTasks: 18, progress: 72, dueDate: '2026-02-28' },
      { id: '2', name: '月次業務', tasksCount: 15, completedTasks: 10, progress: 67, dueDate: '2026-02-28' },
      { id: '3', name: 'システム改善', tasksCount: 30, completedTasks: 12, progress: 40, dueDate: '2026-03-15' },
    ],
  });
});

// GET /projects/:id - プロジェクト詳細
router.get('/projects/:id', async (req: Request, res: Response) => {
  res.json({
    project: {
      id: req.params.id,
      name: '新商品出品',
      description: '2月の新商品出品プロジェクト',
      status: 'in_progress',
      tasksCount: 25,
      completedTasks: 18,
      progress: 72,
      members: ['田中太郎', '鈴木花子'],
      dueDate: '2026-02-28',
      createdAt: '2026-02-01',
    },
  });
});

// POST /projects - プロジェクト作成
router.post('/projects', async (_req: Request, res: Response) => {
  res.json({ success: true, projectId: 'project_new_001', message: 'プロジェクトを作成しました' });
});

// PUT /projects/:id - プロジェクト更新
router.put('/projects/:id', async (req: Request, res: Response) => {
  res.json({ success: true, projectId: req.params.id, message: 'プロジェクトを更新しました' });
});

// --- レポート ---

// GET /reports/productivity - 生産性レポート
router.get('/reports/productivity', async (_req: Request, res: Response) => {
  res.json({
    summary: {
      totalCompleted: 78,
      avgCompletionTime: 2.5,
      onTimeRate: 92.5,
    },
    weekly: [
      { week: 'W06', completed: 25, created: 30 },
      { week: 'W07', completed: 28, created: 25 },
      { week: 'W08', completed: 25, created: 22 },
    ],
  });
});

// GET /reports/workload - ワークロードレポート
router.get('/reports/workload', async (_req: Request, res: Response) => {
  res.json({
    byMember: [
      { member: '田中太郎', assigned: 25, completed: 18, workload: 75 },
      { member: '鈴木花子', assigned: 22, completed: 15, workload: 68 },
      { member: '佐藤一郎', assigned: 20, completed: 12, workload: 60 },
    ],
  });
});

// --- 設定 ---

// GET /settings/general - 一般設定
router.get('/settings/general', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      defaultPriority: 'medium',
      defaultAssignee: null,
      autoArchiveDays: 30,
      reminderEnabled: true,
      reminderBefore: 24,
    },
  });
});

// PUT /settings/general - 一般設定更新
router.put('/settings/general', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '設定を更新しました' });
});

// GET /settings/notifications - 通知設定
router.get('/settings/notifications', async (_req: Request, res: Response) => {
  res.json({
    settings: {
      onTaskAssigned: true,
      onTaskCompleted: true,
      onCommentAdded: true,
      onDueDateApproaching: true,
      onOverdue: true,
      dailyDigest: true,
    },
  });
});

// PUT /settings/notifications - 通知設定更新
router.put('/settings/notifications', async (_req: Request, res: Response) => {
  res.json({ success: true, message: '通知設定を更新しました' });
});

export default router;
