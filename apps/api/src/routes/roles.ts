import { Router } from 'express';
import { prisma, PermissionAction } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'roles' });

/**
 * ロール一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: roles.map(r => ({
        id: r.id,
        name: r.name,
        displayName: r.displayName,
        description: r.description,
        isSystem: r.isSystem,
        userCount: r._count.users,
        permissions: r.permissions.map(p => ({
          resource: p.resource,
          action: p.action,
        })),
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ロール詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: {
        permissions: true,
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new AppError(404, 'Role not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions.map(p => ({
          id: p.id,
          resource: p.resource,
          action: p.action,
        })),
        users: role.users.map(ur => ({
          ...ur.user,
          grantedAt: ur.grantedAt,
          expiresAt: ur.expiresAt,
        })),
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ロール作成
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, displayName, description, permissions = [] } = req.body;

    if (!name || !displayName) {
      throw new AppError(400, 'name and displayName are required', 'INVALID_INPUT');
    }

    const existing = await prisma.role.findUnique({
      where: { name },
    });

    if (existing) {
      throw new AppError(409, 'Role name already exists', 'CONFLICT');
    }

    // 権限を検証
    const validActions = Object.values(PermissionAction);
    for (const perm of permissions) {
      if (!validActions.includes(perm.action)) {
        throw new AppError(400, `Invalid action: ${perm.action}`, 'INVALID_INPUT');
      }
    }

    const role = await prisma.role.create({
      data: {
        name,
        displayName,
        description,
        permissions: {
          create: permissions.map((p: { resource: string; action: PermissionAction }) => ({
            resource: p.resource,
            action: p.action,
          })),
        },
      },
      include: {
        permissions: true,
      },
    });

    log.info({ roleId: role.id, name }, 'Role created');

    res.status(201).json({
      success: true,
      data: {
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        permissions: role.permissions.map(p => ({
          resource: p.resource,
          action: p.action,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ロール更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { displayName, description } = req.body;

    const existing = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError(404, 'Role not found', 'NOT_FOUND');
    }

    if (existing.isSystem) {
      throw new AppError(403, 'Cannot modify system role', 'FORBIDDEN');
    }

    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(description !== undefined && { description }),
      },
    });

    log.info({ roleId: role.id }, 'Role updated');

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ロール削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'Role not found', 'NOT_FOUND');
    }

    if (existing.isSystem) {
      throw new AppError(403, 'Cannot delete system role', 'FORBIDDEN');
    }

    if (existing._count.users > 0) {
      throw new AppError(400, 'Cannot delete role with assigned users', 'INVALID_OPERATION');
    }

    await prisma.role.delete({
      where: { id: req.params.id },
    });

    log.info({ roleId: req.params.id }, 'Role deleted');

    res.json({
      success: true,
      message: 'Role deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ロールに権限を追加
 */
router.post('/:id/permissions', async (req, res, next) => {
  try {
    const { resource, action } = req.body;

    if (!resource || !action) {
      throw new AppError(400, 'resource and action are required', 'INVALID_INPUT');
    }

    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (!role) {
      throw new AppError(404, 'Role not found', 'NOT_FOUND');
    }

    if (role.isSystem) {
      throw new AppError(403, 'Cannot modify system role permissions', 'FORBIDDEN');
    }

    const validActions = Object.values(PermissionAction);
    if (!validActions.includes(action)) {
      throw new AppError(400, `Invalid action: ${action}`, 'INVALID_INPUT');
    }

    // 既存チェック
    const existing = await prisma.permission.findUnique({
      where: {
        roleId_resource_action: {
          roleId: req.params.id,
          resource,
          action,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'Permission already exists', 'CONFLICT');
    }

    const permission = await prisma.permission.create({
      data: {
        roleId: req.params.id,
        resource,
        action,
      },
    });

    log.info({ roleId: req.params.id, resource, action }, 'Permission added');

    res.status(201).json({
      success: true,
      data: {
        id: permission.id,
        resource: permission.resource,
        action: permission.action,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ロールから権限を削除
 */
router.delete('/:id/permissions/:permissionId', async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (!role) {
      throw new AppError(404, 'Role not found', 'NOT_FOUND');
    }

    if (role.isSystem) {
      throw new AppError(403, 'Cannot modify system role permissions', 'FORBIDDEN');
    }

    await prisma.permission.delete({
      where: { id: req.params.permissionId },
    });

    log.info({ roleId: req.params.id, permissionId: req.params.permissionId }, 'Permission removed');

    res.json({
      success: true,
      message: 'Permission removed',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 利用可能なリソースとアクション一覧
 */
router.get('/meta/resources', async (_req, res, next) => {
  try {
    const resources = [
      'products',
      'listings',
      'orders',
      'sales',
      'inventory',
      'analytics',
      'settings',
      'users',
      'roles',
      'webhooks',
      'exports',
      'notifications',
    ];

    const actions = Object.values(PermissionAction);

    res.json({
      success: true,
      data: {
        resources,
        actions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * デフォルトロールを初期化
 */
router.post('/initialize', async (req, res, next) => {
  try {
    const defaultRoles = [
      {
        name: 'admin',
        displayName: '管理者',
        description: '全権限を持つ管理者ロール',
        isSystem: true,
        permissions: [
          { resource: '*', action: 'MANAGE' as PermissionAction },
        ],
      },
      {
        name: 'operator',
        displayName: 'オペレーター',
        description: '日常業務を行うオペレーターロール',
        isSystem: true,
        permissions: [
          { resource: 'products', action: 'READ' as PermissionAction },
          { resource: 'products', action: 'UPDATE' as PermissionAction },
          { resource: 'listings', action: 'READ' as PermissionAction },
          { resource: 'listings', action: 'UPDATE' as PermissionAction },
          { resource: 'listings', action: 'PUBLISH' as PermissionAction },
          { resource: 'orders', action: 'READ' as PermissionAction },
          { resource: 'orders', action: 'UPDATE' as PermissionAction },
          { resource: 'inventory', action: 'READ' as PermissionAction },
        ],
      },
      {
        name: 'viewer',
        displayName: '閲覧者',
        description: '閲覧のみ可能なロール',
        isSystem: true,
        permissions: [
          { resource: 'products', action: 'READ' as PermissionAction },
          { resource: 'listings', action: 'READ' as PermissionAction },
          { resource: 'orders', action: 'READ' as PermissionAction },
          { resource: 'analytics', action: 'READ' as PermissionAction },
        ],
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const roleDef of defaultRoles) {
      const existing = await prisma.role.findUnique({
        where: { name: roleDef.name },
      });

      if (!existing) {
        await prisma.role.create({
          data: {
            name: roleDef.name,
            displayName: roleDef.displayName,
            description: roleDef.description,
            isSystem: roleDef.isSystem,
            permissions: {
              create: roleDef.permissions,
            },
          },
        });
        created++;
      } else {
        skipped++;
      }
    }

    log.info({ created, skipped }, 'Default roles initialized');

    res.json({
      success: true,
      data: { created, skipped },
      message: `Created ${created} roles, skipped ${skipped} existing`,
    });
  } catch (error) {
    next(error);
  }
});

export { router as rolesRouter };
