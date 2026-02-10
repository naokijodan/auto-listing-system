import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import * as bcrypt from 'bcrypt';

const router = Router();
const log = logger.child({ module: 'users' });

/**
 * ユーザー一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = '20', offset = '0', search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          twoFactorEnabled: true,
          createdAt: true,
          roles: {
            include: {
              role: {
                select: { name: true, displayName: true },
              },
            },
          },
        },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users.map(u => ({
        ...u,
        roles: u.roles.map(r => ({
          name: r.role.name,
          displayName: r.role.displayName,
          expiresAt: r.expiresAt,
        })),
      })),
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザー詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    // 権限を抽出
    const permissions = new Set<string>();
    for (const ur of user.roles) {
      for (const perm of ur.role.permissions) {
        permissions.add(`${perm.resource}:${perm.action}`);
      }
    }

    res.json({
      success: true,
      data: {
        ...user,
        roles: user.roles.map(r => ({
          name: r.role.name,
          displayName: r.role.displayName,
          grantedAt: r.grantedAt,
          expiresAt: r.expiresAt,
        })),
        permissions: Array.from(permissions),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザー作成
 */
router.post('/', async (req, res, next) => {
  try {
    const { email, password, name, roles = [] } = req.body;

    if (!email) {
      throw new AppError(400, 'email is required', 'INVALID_INPUT');
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new AppError(409, 'Email already exists', 'CONFLICT');
    }

    const passwordHash = password
      ? await bcrypt.hash(password, 12)
      : null;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        status: passwordHash ? 'ACTIVE' : 'PENDING_VERIFICATION',
      },
    });

    // ロールを割り当て
    if (roles.length > 0) {
      const roleRecords = await prisma.role.findMany({
        where: { name: { in: roles } },
      });

      for (const role of roleRecords) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            grantedBy: req.headers['x-api-key'] as string,
          },
        });
      }
    }

    log.info({ userId: user.id, email }, 'User created');

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザー更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, status, twoFactorEnabled } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(twoFactorEnabled !== undefined && { twoFactorEnabled }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        twoFactorEnabled: true,
      },
    });

    log.info({ userId: user.id }, 'User updated');

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザーにロールを割り当て
 */
router.post('/:id/roles', async (req, res, next) => {
  try {
    const { roleName, expiresAt } = req.body;

    if (!roleName) {
      throw new AppError(400, 'roleName is required', 'INVALID_INPUT');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new AppError(404, 'Role not found', 'NOT_FOUND');
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: req.params.id, roleId: role.id },
      },
      update: {
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: req.headers['x-api-key'] as string,
        grantedAt: new Date(),
      },
      create: {
        userId: req.params.id,
        roleId: role.id,
        grantedBy: req.headers['x-api-key'] as string,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    log.info({ userId: req.params.id, roleName }, 'Role assigned');

    res.json({
      success: true,
      message: `Role ${roleName} assigned to user`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザーからロールを削除
 */
router.delete('/:id/roles/:roleName', async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({
      where: { name: req.params.roleName },
    });

    if (!role) {
      throw new AppError(404, 'Role not found', 'NOT_FOUND');
    }

    await prisma.userRole.delete({
      where: {
        userId_roleId: { userId: req.params.id, roleId: role.id },
      },
    });

    log.info({ userId: req.params.id, roleName: req.params.roleName }, 'Role revoked');

    res.json({
      success: true,
      message: `Role ${req.params.roleName} revoked from user`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザーのセッション一覧
 */
router.get('/:id/sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: req.params.id },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * セッションを無効化
 */
router.delete('/:id/sessions/:sessionId', async (req, res, next) => {
  try {
    await prisma.userSession.update({
      where: { id: req.params.sessionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'Manual revocation',
      },
    });

    log.info({ userId: req.params.id, sessionId: req.params.sessionId }, 'Session revoked');

    res.json({
      success: true,
      message: 'Session revoked',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザーの監査ログ
 */
router.get('/:id/audit-logs', async (req, res, next) => {
  try {
    const { limit = '50' } = req.query;

    const logs = await prisma.userAuditLog.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * パスワードリセット
 */
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters', 'INVALID_INPUT');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    // 全セッションを無効化
    await prisma.userSession.updateMany({
      where: { userId: req.params.id, isActive: true },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'Password reset',
      },
    });

    log.info({ userId: req.params.id }, 'Password reset');

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

export { router as usersRouter };
