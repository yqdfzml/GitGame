import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { BadgesService } from "../badges/badges.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { UpdateUserDto } from "./dto/admin-user.dto";

/** 管理端用户列表查询参数 */
export interface AdminUserListQuery {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

/**
 * 管理端用户服务。
 * 功能：用户列表、详情、状态/角色变更与会话撤销。
 * 参数：用户 id 与操作者 id。
 * 返回值：用户摘要或分页列表。
 */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly badgesService: BadgesService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 分页列出用户。
   * 功能：支持邮箱/昵称搜索，以及角色、状态筛选。
   * 参数：query - 筛选与分页条件。
   * 返回值：分页用户列表。
   */
  async listUsers(query: AdminUserListQuery = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = {
      // 用户管理只展示普通玩家，管理员账号不在此列出
      role: "USER",
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { email: { contains: query.search } },
        { displayName: { contains: query.search } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      items: users.map((user) => ({
        id: user.id.toString(),
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取用户管理详情。
   * 功能：汇总基础信息、学习统计、积分钱包、徽章与最近 attempt。
   * 参数：userId - 目标用户 id。
   * 返回值：用户详情对象。
   */
  async getUserDetail(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const [stats, wallet, badges, recentAttempts, activeSessionCount] = await Promise.all([
      this.usersService.getUserStats(userId),
      this.prisma.userPointWallet.findUnique({ where: { userId } }),
      this.badgesService.syncAndGetUserBadges(userId),
      this.prisma.attempt.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 10,
        include: {
          level: { select: { id: true, title: true } },
        },
      }),
      this.prisma.refreshToken.count({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);

    return {
      id: user.id.toString(),
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats,
      wallet: wallet
        ? {
            balance: wallet.balance,
            totalEarned: wallet.totalEarned,
            totalSpent: wallet.totalSpent,
            currentStreak: wallet.currentStreak,
            longestStreak: wallet.longestStreak,
          }
        : null,
      badges: {
        unlockedCount: badges.unlockedCount,
        totalCount: badges.totalCount,
        activeTitle: badges.activeTitle,
        rank: badges.rank,
        items: badges.badges.filter((badge) => badge.unlocked),
      },
      recentAttempts: recentAttempts.map((attempt) => ({
        id: attempt.id.toString(),
        levelId: attempt.levelId.toString(),
        levelTitle: attempt.level.title,
        status: attempt.status,
        stepCount: attempt.stepCount,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      })),
      activeSessionCount,
    };
  }

  /**
   * 更新用户资料。
   * 功能：修改昵称、邮箱、角色与状态，禁止操作者修改自己的角色或禁用自己。
   * 参数：userId - 目标用户；dto - 更新字段；operatorId - 操作管理员 id。
   * 返回值：更新后的用户摘要。
   */
  async updateUser(userId: bigint, dto: UpdateUserDto, operatorId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    if (userId === operatorId) {
      if (dto.role !== undefined && dto.role !== user.role) {
        throw new BadRequestException("不能修改自己的角色");
      }
      if (dto.status === "DISABLED") {
        throw new BadRequestException("不能禁用自己的账号");
      }
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException("邮箱已被占用");
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName;
    }
    if (dto.email !== undefined) {
      data.email = dto.email;
    }
    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    /** 角色或状态变更时需要使旧 token 失效 */
    const shouldInvalidateSessions =
      (dto.role !== undefined && dto.role !== user.role)
      || (dto.status !== undefined && dto.status !== user.status);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
      },
    });

    if (shouldInvalidateSessions) {
      await this.authService.invalidateUserSessions(userId);
    }

    return {
      id: updated.id.toString(),
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      status: updated.status,
    };
  }

  /**
   * 删除用户。
   * 功能：清理关联数据后永久删除账号，禁止删除自己。
   * 参数：userId - 目标用户；operatorId - 操作管理员 id。
   * 返回值：删除结果。
   */
  async deleteUser(userId: bigint, operatorId: bigint) {
    if (userId === operatorId) {
      throw new BadRequestException("不能删除自己的账号");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    await this.prisma.$transaction(async (tx) => {
      // 英雄帖占用关系需要先解除，否则外键会阻止删除
      await tx.heroInvite.updateMany({
        where: { usedById: userId },
        data: { usedById: null, usedAt: null },
      });
      await tx.leaderboardEntry.deleteMany({ where: { userId } });
      await tx.levelResult.deleteMany({ where: { userId } });
      await tx.attempt.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return { id: userId.toString(), deleted: true };
  }

  /**
   * 更新用户状态。
   * 功能：启用或禁用用户，禁止操作者禁用自己。
   * 参数：userId - 目标用户；status - 新状态；operatorId - 操作管理员 id。
   * 返回值：更新后的用户摘要。
   */
  async updateUserStatus(userId: bigint, status: UserStatus, operatorId: bigint) {
    if (userId === operatorId && status === "DISABLED") {
      throw new BadRequestException("不能禁用自己的账号");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
      },
    });

    if (status !== user.status) {
      await this.authService.invalidateUserSessions(userId);
    }

    return {
      id: updated.id.toString(),
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      status: updated.status,
    };
  }

  /**
   * 更新用户角色。
   * 功能：调整 USER/ADMIN 角色，禁止操作者修改自己。
   * 参数：userId - 目标用户；role - 新角色；operatorId - 操作管理员 id。
   * 返回值：更新后的用户摘要。
   */
  async updateUserRole(userId: bigint, role: UserRole, operatorId: bigint) {
    if (userId === operatorId) {
      throw new BadRequestException("不能修改自己的角色");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
      },
    });

    if (role !== user.role) {
      await this.authService.invalidateUserSessions(userId);
    }

    return {
      id: updated.id.toString(),
      email: updated.email,
      displayName: updated.displayName,
      role: updated.role,
      status: updated.status,
    };
  }

  /**
   * 撤销用户全部登录态。
   * 功能：作废该用户所有未过期的 refresh token。
   * 参数：userId - 目标用户 id。
   * 返回值：撤销的会话数量。
   */
  async revokeUserSessions(userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const revokedCount = await this.authService.invalidateUserSessions(userId);

    return { revokedCount };
  }
}
