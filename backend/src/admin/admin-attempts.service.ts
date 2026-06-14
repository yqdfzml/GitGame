import { Injectable, NotFoundException } from "@nestjs/common";
import { AttemptStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** 管理端 attempt 列表查询参数 */
export interface AdminAttemptListQuery {
  search?: string;
  levelId?: bigint;
  userId?: bigint;
  status?: AttemptStatus;
  page?: number;
  pageSize?: number;
}

/**
 * 管理端练习记录服务。
 * 功能：attempt 列表、详情查询，供运营排查卡点与 bug。
 * 参数：筛选条件与 attempt id。
 * 返回值：分页列表或详情对象。
 */
@Injectable()
export class AdminAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页列出 attempt。
   * 功能：支持用户搜索、关卡、状态筛选。
   * 参数：query - 筛选与分页条件。
   * 返回值：分页 attempt 列表。
   */
  async listAttempts(query: AdminAttemptListQuery = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.AttemptWhereInput = {};

    if (query.levelId) {
      where.levelId = query.levelId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.user = {
        OR: [
          { email: { contains: query.search } },
          { displayName: { contains: query.search } },
        ],
      };
    }

    const [total, attempts] = await Promise.all([
      this.prisma.attempt.count({ where }),
      this.prisma.attempt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startedAt: "desc" },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          level: { select: { id: true, title: true, chapterId: true } },
        },
      }),
    ]);

    return {
      items: attempts.map((attempt) => ({
        id: attempt.id.toString(),
        userId: attempt.userId.toString(),
        userEmail: attempt.user.email,
        userDisplayName: attempt.user.displayName,
        levelId: attempt.levelId.toString(),
        levelTitle: attempt.level.title,
        levelChapterId: attempt.level.chapterId,
        status: attempt.status,
        stepCount: attempt.stepCount,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取 attempt 详情。
   * 功能：返回用户信息、关卡信息与完整命令序列。
   * 参数：attemptId - attempt id。
   * 返回值：attempt 详情。
   */
  async getAttemptDetail(attemptId: bigint) {
    const attempt = await this.prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, avatarUrl: true },
        },
        level: {
          select: { id: true, title: true, chapterId: true, difficulty: true },
        },
        commands: {
          orderBy: { stepIndex: "asc" },
        },
      },
    });
    if (!attempt) {
      throw new NotFoundException("练习记录不存在");
    }

    return {
      id: attempt.id.toString(),
      status: attempt.status,
      stepCount: attempt.stepCount,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      user: {
        id: attempt.user.id.toString(),
        email: attempt.user.email,
        displayName: attempt.user.displayName,
        avatarUrl: attempt.user.avatarUrl,
      },
      level: {
        id: attempt.level.id.toString(),
        title: attempt.level.title,
        chapterId: attempt.level.chapterId,
        difficulty: attempt.level.difficulty,
      },
      commands: attempt.commands.map((command) => ({
        stepIndex: command.stepIndex,
        command: command.command,
        success: command.success,
        feedback: command.feedback,
        output: command.output,
        createdAt: command.createdAt,
      })),
    };
  }
}
