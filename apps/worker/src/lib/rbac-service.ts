import { prisma, UserStatus, PermissionAction } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const log = logger.child({ module: 'rbac-service' });

// 権限キャッシュ（メモリ）
const permissionCache: Map<string, { permissions: string[]; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 300000; // 5分

interface CreateUserOptions {
  email: string;
  password?: string;
  name?: string;
  roleNames?: string[];
}

interface UserWithPermissions {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
  permissions: string[];
  roles: string[];
}

/**
 * ユーザーを作成
 */
export async function createUser(options: CreateUserOptions): Promise<{ id: string; email: string }> {
  const passwordHash = options.password
    ? await bcrypt.hash(options.password, 12)
    : null;

  const user = await prisma.user.create({
    data: {
      email: options.email,
      passwordHash,
      name: options.name,
      status: passwordHash ? 'ACTIVE' : 'PENDING_VERIFICATION',
    },
  });

  // ロールを割り当て
  if (options.roleNames && options.roleNames.length > 0) {
    const roles = await prisma.role.findMany({
      where: { name: { in: options.roleNames } },
    });

    for (const role of roles) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }
  }

  log.info({ userId: user.id, email: user.email }, 'User created');

  return { id: user.id, email: user.email };
}

/**
 * ユーザー認証
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserWithPermissions; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
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
    return { success: false, error: 'User not found' };
  }

  if (user.status !== 'ACTIVE') {
    return { success: false, error: `User is ${user.status.toLowerCase()}` };
  }

  if (!user.passwordHash) {
    return { success: false, error: 'Password authentication not enabled' };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid password' };
  }

  // 最終ログイン更新
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const permissions = extractPermissions(user.roles);
  const roles = user.roles.map(ur => ur.role.name);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      permissions,
      roles,
    },
  };
}

/**
 * セッションを作成
 */
export async function createSession(
  userId: string,
  options?: { userAgent?: string; ipAddress?: string; expiresInHours?: number }
): Promise<{ token: string; refreshToken: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');

  const expiresInHours = options?.expiresInHours || 24;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

  await prisma.userSession.create({
    data: {
      userId,
      token: crypto.createHash('sha256').update(token).digest('hex'),
      refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      userAgent: options?.userAgent,
      ipAddress: options?.ipAddress,
      expiresAt,
      refreshExpiresAt,
    },
  });

  log.info({ userId }, 'Session created');

  return { token, refreshToken, expiresAt };
}

/**
 * セッションを検証
 */
export async function validateSession(token: string): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const session = await prisma.userSession.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });

  if (!session) {
    return { valid: false, error: 'Session not found' };
  }

  if (!session.isActive) {
    return { valid: false, error: 'Session revoked' };
  }

  if (session.expiresAt < new Date()) {
    return { valid: false, error: 'Session expired' };
  }

  if (session.user.status !== 'ACTIVE') {
    return { valid: false, error: 'User not active' };
  }

  // 最終使用更新
  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });

  return { valid: true, userId: session.userId };
}

/**
 * ユーザーの権限をチェック
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: PermissionAction
): Promise<boolean> {
  const cacheKey = `${userId}:permissions`;
  const cached = permissionCache.get(cacheKey);

  let permissions: string[];

  if (cached && cached.expiresAt > Date.now()) {
    permissions = cached.permissions;
  } else {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
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
      return false;
    }

    permissions = extractPermissions(user.roles);

    // キャッシュに保存
    permissionCache.set(cacheKey, {
      permissions,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  // 権限チェック
  const requiredPermission = `${resource}:${action}`;
  const managePermission = `${resource}:MANAGE`;
  const wildcardPermission = `*:${action}`;
  const fullWildcard = '*:MANAGE';

  return permissions.some(p =>
    p === requiredPermission ||
    p === managePermission ||
    p === wildcardPermission ||
    p === fullWildcard
  );
}

/**
 * ロールを作成
 */
export async function createRole(
  name: string,
  displayName: string,
  permissions: { resource: string; action: PermissionAction }[],
  description?: string
): Promise<{ id: string; name: string }> {
  const role = await prisma.role.create({
    data: {
      name,
      displayName,
      description,
      permissions: {
        create: permissions.map(p => ({
          resource: p.resource,
          action: p.action,
        })),
      },
    },
  });

  log.info({ roleId: role.id, name }, 'Role created');

  return { id: role.id, name: role.name };
}

/**
 * ユーザーにロールを割り当て
 */
export async function assignRole(
  userId: string,
  roleName: string,
  options?: { grantedBy?: string; expiresAt?: Date }
): Promise<void> {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleName}`);
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId, roleId: role.id },
    },
    update: {
      expiresAt: options?.expiresAt,
      grantedBy: options?.grantedBy,
      grantedAt: new Date(),
    },
    create: {
      userId,
      roleId: role.id,
      grantedBy: options?.grantedBy,
      expiresAt: options?.expiresAt,
    },
  });

  // キャッシュを無効化
  permissionCache.delete(`${userId}:permissions`);

  log.info({ userId, roleName }, 'Role assigned');
}

/**
 * ユーザーからロールを削除
 */
export async function revokeRole(userId: string, roleName: string): Promise<void> {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    throw new Error(`Role not found: ${roleName}`);
  }

  await prisma.userRole.delete({
    where: {
      userId_roleId: { userId, roleId: role.id },
    },
  });

  // キャッシュを無効化
  permissionCache.delete(`${userId}:permissions`);

  log.info({ userId, roleName }, 'Role revoked');
}

/**
 * デフォルトロールを初期化
 */
export async function initializeDefaultRoles(): Promise<void> {
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

      log.info({ roleName: roleDef.name }, 'Default role created');
    }
  }
}

/**
 * ユーザー監査ログを記録
 */
export async function logUserAction(
  userId: string,
  action: string,
  description: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    success?: boolean;
    errorMessage?: string;
  }
): Promise<void> {
  await prisma.userAuditLog.create({
    data: {
      userId,
      action,
      description,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      metadata: (options?.metadata || {}) as any,
      success: options?.success ?? true,
      errorMessage: options?.errorMessage,
    },
  });
}

/**
 * キャッシュをクリア
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
  log.info('Permission cache cleared');
}

// ヘルパー関数

function extractPermissions(
  userRoles: Array<{
    role: {
      permissions: Array<{ resource: string; action: PermissionAction }>;
    };
  }>
): string[] {
  const permissions = new Set<string>();

  for (const ur of userRoles) {
    for (const perm of ur.role.permissions) {
      permissions.add(`${perm.resource}:${perm.action}`);
    }
  }

  return Array.from(permissions);
}
