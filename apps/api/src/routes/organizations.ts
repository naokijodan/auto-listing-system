/**
 * 組織管理API
 * Phase 79: マルチテナント対応
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import crypto from 'crypto';

const router = Router();

/**
 * 招待トークンを生成
 */
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * スラグを生成（URLフレンドリーな文字列）
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * @swagger
 * /api/organizations/stats:
 *   get:
 *     summary: 組織統計を取得
 *     tags: [Organizations]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [total, active, totalMembers, pendingInvitations] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'ACTIVE' } }),
      prisma.organizationMember.count({ where: { isActive: true } }),
      prisma.organizationInvitation.count({ where: { status: 'PENDING' } }),
    ]);

    // プラン別組織数
    const byPlan = await prisma.organization.groupBy({
      by: ['plan'],
      _count: true,
    });

    res.json({
      total,
      active,
      totalMembers,
      pendingInvitations,
      byPlan: byPlan.reduce((acc, item) => {
        acc[item.plan] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/plans:
 *   get:
 *     summary: プラン一覧を取得
 *     tags: [Organizations]
 */
router.get('/plans', async (req, res) => {
  res.json({
    plans: [
      {
        value: 'FREE',
        label: '無料プラン',
        maxUsers: 3,
        maxProducts: 100,
        maxListings: 100,
        features: ['基本機能'],
        price: 0,
      },
      {
        value: 'STARTER',
        label: 'スタータープラン',
        maxUsers: 10,
        maxProducts: 1000,
        maxListings: 1000,
        features: ['基本機能', 'A/Bテスト', 'レポート'],
        price: 4980,
      },
      {
        value: 'PROFESSIONAL',
        label: 'プロフェッショナルプラン',
        maxUsers: 50,
        maxProducts: 10000,
        maxListings: 10000,
        features: ['全機能', 'API連携', '優先サポート'],
        price: 14980,
      },
      {
        value: 'ENTERPRISE',
        label: 'エンタープライズプラン',
        maxUsers: -1, // 無制限
        maxProducts: -1,
        maxListings: -1,
        features: ['全機能', '専用サポート', 'SLA保証', 'カスタム開発'],
        price: null, // 要相談
      },
    ],
    roles: [
      { value: 'OWNER', label: 'オーナー', description: '全権限' },
      { value: 'ADMIN', label: '管理者', description: '設定変更可能' },
      { value: 'MEMBER', label: 'メンバー', description: '基本操作' },
      { value: 'VIEWER', label: '閲覧者', description: '読み取り専用' },
    ],
  });
});

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: 組織一覧を取得
 *     tags: [Organizations]
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, plan, search, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              members: true,
              invitations: { where: { status: 'PENDING' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.organization.count({ where }),
    ]);

    res.json({
      data: organizations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: 組織を作成
 *     tags: [Organizations]
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, email, ownerId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // スラグの一意性を確認
    let slug = generateSlug(name);
    const existingSlug = await prisma.organization.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        description,
        email,
        // オーナーがいる場合はメンバーとして追加
        ...(ownerId && {
          members: {
            create: {
              userId: ownerId,
              role: 'OWNER',
            },
          },
        }),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    logger.info(`Organization created: ${organization.id} - ${organization.name}`);
    res.status(201).json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: 組織詳細を取得
 *     tags: [Organizations]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { role: 'asc' },
        },
        invitations: {
          where: { status: 'PENDING' },
          orderBy: { invitedAt: 'desc' },
        },
        _count: {
          select: {
            members: true,
            invitations: true,
          },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   patch:
 *     summary: 組織を更新
 *     tags: [Organizations]
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, description, logo, primaryColor, email, phone, website, settings, status, plan } = req.body;

    const organization = await prisma.organization.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(logo !== undefined && { logo }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(settings && { settings }),
        ...(status && { status }),
        ...(plan && { plan }),
      },
    });

    res.json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     summary: 組織を削除
 *     tags: [Organizations]
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.organization.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ========================================
// メンバー管理
// ========================================

/**
 * @swagger
 * /api/organizations/{id}/members:
 *   get:
 *     summary: メンバー一覧を取得
 *     tags: [Organizations]
 */
router.get('/:id/members', async (req, res, next) => {
  try {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: req.params.id,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, lastLoginAt: true },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    res.json(members);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}/members/{memberId}/role:
 *   patch:
 *     summary: メンバーのロールを変更
 *     tags: [Organizations]
 */
router.patch('/:id/members/:memberId/role', async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'role is required' });
    }

    const member = await prisma.organizationMember.update({
      where: { id: req.params.memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}/members/{memberId}:
 *   delete:
 *     summary: メンバーを削除
 *     tags: [Organizations]
 */
router.delete('/:id/members/:memberId', async (req, res, next) => {
  try {
    // オーナーは削除不可
    const member = await prisma.organizationMember.findUnique({
      where: { id: req.params.memberId },
    });

    if (member?.role === 'OWNER') {
      return res.status(400).json({ error: 'Cannot remove owner' });
    }

    await prisma.organizationMember.update({
      where: { id: req.params.memberId },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ========================================
// 招待管理
// ========================================

/**
 * @swagger
 * /api/organizations/{id}/invitations:
 *   post:
 *     summary: メンバーを招待
 *     tags: [Organizations]
 */
router.post('/:id/invitations', async (req, res, next) => {
  try {
    const { email, role, message, invitedBy } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // 既存のメンバーか確認
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: req.params.id,
        user: { email },
        isActive: true,
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // 既存の招待を確認
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: req.params.id,
        email,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: req.params.id,
        email,
        role: role || 'MEMBER',
        token: generateInviteToken(),
        message,
        invitedBy: invitedBy || 'system',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日間有効
      },
    });

    logger.info(`Invitation sent: ${invitation.id} to ${email}`);
    res.status(201).json(invitation);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/invitations/{token}/accept:
 *   post:
 *     summary: 招待を承諾
 *     tags: [Organizations]
 */
router.post('/invitations/:token/accept', async (req, res, next) => {
  try {
    const { userId } = req.body;

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token: req.params.token },
      include: { organization: true },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Invitation is no longer valid' });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // メンバーとして追加
    const member = await prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      },
      include: {
        organization: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // 招待を承諾済みに更新
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    logger.info(`Invitation accepted: ${invitation.id} by user ${userId}`);
    res.json(member);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}/invitations/{invitationId}:
 *   delete:
 *     summary: 招待をキャンセル
 *     tags: [Organizations]
 */
router.delete('/:id/invitations/:invitationId', async (req, res, next) => {
  try {
    await prisma.organizationInvitation.update({
      where: { id: req.params.invitationId },
      data: { status: 'CANCELLED' },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/my:
 *   get:
 *     summary: 自分が所属する組織一覧を取得
 *     tags: [Organizations]
 */
router.get('/user/:userId/organizations', async (req, res, next) => {
  try {
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: req.params.userId,
        isActive: true,
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json(memberships);
  } catch (error) {
    next(error);
  }
});

export { router as organizationsRouter };
