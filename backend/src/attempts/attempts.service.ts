import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GitEngineService } from "../git-engine/git-engine.service";
import { JudgeService } from "../judge/judge.service";
import { LevelsService } from "../levels/levels.service";
import { BadgesService } from "../badges/badges.service";
import { PointsService } from "../points/points.service";
import type {
  LevelConstraints,
  LevelGoal,
  RepoState,
} from "../git-engine/repo-state.types";
import { cloneRepoState, resolveConflictFile } from "../git-engine/git-engine.utils";
import { fromPrismaJson, toPrismaJson } from "../common/json.util";

/** 单次命令提交的最大步数上限 */
const MAX_ATTEMPT_STEPS = 200;

/**
 * 练习会话服务。
 * 功能：管理 attempt 生命周期、命令执行和通关结算。
 * 参数：userId、attemptId、command 等。
 * 返回值：attempt 状态和执行结果。
 */
@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gitEngine: GitEngineService,
    private readonly judge: JudgeService,
    private readonly levelsService: LevelsService,
    private readonly badgesService: BadgesService,
    private readonly pointsService: PointsService,
  ) {}

  /**
   * 创建或恢复练习会话。
   * 功能：若存在未完成的 attempt 则直接恢复，否则用关卡 initialState 新建。
   * 参数：userId - 用户 id；levelId - 关卡 id。
   * 返回值：attempt 详情（含命令历史）。
   */
  async createAttempt(userId: bigint, levelId: bigint) {
    const level = await this.levelsService.getLevelForAttempt(levelId);
    if (!level) {
      throw new NotFoundException("关卡不存在或未发布");
    }

    await this.pointsService.assertLevelStartable(userId, levelId);

    const existingAttempt = await this.prisma.attempt.findFirst({
      where: {
        userId,
        levelId,
        status: "IN_PROGRESS",
      },
      orderBy: { startedAt: "desc" },
    });

    if (existingAttempt) {
      return this.buildAttemptDetail(existingAttempt, level);
    }

    const latestCompletedAttempt = await this.prisma.attempt.findFirst({
      where: {
        userId,
        levelId,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
    });

    if (latestCompletedAttempt) {
      return this.buildAttemptDetail(latestCompletedAttempt, level);
    }

    const initialState = cloneRepoState(fromPrismaJson<RepoState>(level.initialState));
    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        levelId,
        currentState: toPrismaJson(initialState),
        stepCount: 0,
      },
    });

    await this.prisma.attemptSnapshot.create({
      data: {
        attemptId: attempt.id,
        stepIndex: 0,
        state: toPrismaJson(initialState),
      },
    });

    return this.buildAttemptDetail(attempt, level);
  }

  /**
   * 获取练习会话详情。
   * 功能：校验归属后返回当前状态和判题差距。
   * 参数：userId - 用户 id；attemptId - 会话 id。
   * 返回值：attempt 详情。
   */
  async getAttempt(userId: bigint, attemptId: bigint) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    const level = await this.prisma.level.findUnique({ where: { id: attempt.levelId } });
    if (!level) {
      throw new NotFoundException("关卡不存在");
    }

    return this.buildAttemptDetail(attempt, level);
  }

  /**
   * 提交 Git 命令。
   * 功能：白名单校验、推进状态、判题、通关结算。
   * 参数：userId - 用户 id；attemptId - 会话 id；command - git 命令。
   * 返回值：执行结果和判题反馈。
   */
  async submitCommand(userId: bigint, attemptId: bigint, command: string) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    if (attempt.status !== "IN_PROGRESS") {
      throw new BadRequestException("该练习已结束");
    }
    if (attempt.stepCount >= MAX_ATTEMPT_STEPS) {
      throw new BadRequestException("已达到最大命令步数");
    }

    const level = await this.prisma.level.findUnique({ where: { id: attempt.levelId } });
    if (!level) {
      throw new NotFoundException("关卡不存在");
    }

    const currentState = fromPrismaJson<RepoState>(attempt.currentState);
    const result = this.gitEngine.executeCommand(command, currentState);

    const newStepCount = attempt.stepCount + 1;
    const goal = fromPrismaJson<LevelGoal>(level.goal);
    const constraints = fromPrismaJson<LevelConstraints>(level.constraints);
    const judgeResult = this.judge.evaluate(result.state, goal, constraints, newStepCount);

    // 只有命令成功或只读命令（status/log）才更新状态
    const nextState = result.success ? result.state : currentState;
    const newStatus = judgeResult.passed ? "COMPLETED" : "IN_PROGRESS";

    await this.prisma.$transaction(async (tx) => {
      await tx.attemptCommand.create({
        data: {
          attemptId,
          stepIndex: newStepCount,
          command,
          feedback: result.feedback,
          success: result.success,
          output: result.output,
        },
      });

      if (result.success) {
        await tx.attemptSnapshot.create({
          data: {
            attemptId,
            stepIndex: newStepCount,
            state: toPrismaJson(result.state),
          },
        });
      }

      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          currentState: toPrismaJson(nextState),
          stepCount: newStepCount,
          status: newStatus,
          completedAt: judgeResult.passed ? new Date() : null,
        },
      });

      if (judgeResult.passed) {
        const durationSeconds = Math.floor(
          (Date.now() - attempt.startedAt.getTime()) / 1000,
        );

        await tx.levelResult.upsert({
          where: { userId_levelId: { userId, levelId: attempt.levelId } },
          create: {
            userId,
            levelId: attempt.levelId,
            attemptId,
            score: judgeResult.score,
            durationSeconds,
            commandCount: newStepCount,
          },
          update: {
            attemptId,
            score: judgeResult.score,
            durationSeconds,
            commandCount: newStepCount,
            completedAt: new Date(),
          },
        });

        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user) {
          const existingEntry = await tx.leaderboardEntry.findUnique({
            where: { userId_levelId: { userId, levelId: attempt.levelId } },
          });
          const shouldUpdateLeaderboard =
            !existingEntry ||
            judgeResult.score > existingEntry.score ||
            (judgeResult.score === existingEntry.score &&
              durationSeconds < existingEntry.durationSeconds);

          if (shouldUpdateLeaderboard) {
            await tx.leaderboardEntry.upsert({
              where: { userId_levelId: { userId, levelId: attempt.levelId } },
              create: {
                userId,
                levelId: attempt.levelId,
                score: judgeResult.score,
                durationSeconds,
                displayName: user.displayName,
              },
              update: {
                score: judgeResult.score,
                durationSeconds,
                displayName: user.displayName,
              },
            });
          }
        }
      }
    });

    let newlyUnlockedBadges: string[] = [];
    let nextLevel = null;
    if (judgeResult.passed) {
      newlyUnlockedBadges = await this.badgesService.syncAfterLevelComplete(userId);
      nextLevel = await this.pointsService.tryAutoUnlockNextLevel(userId, attempt.levelId);
    }

    return {
      success: result.success,
      output: result.output,
      feedback: result.feedback,
      state: nextState,
      stepCount: newStepCount,
      judge: judgeResult,
      completed: judgeResult.passed,
      newlyUnlockedBadges,
      nextLevel,
    };
  }

  /**
   * 保存玩家手动解决后的冲突文件内容。
   * 功能：校验冲突标记已清除，更新工作区并记录一步操作。
   * 参数：userId - 用户 id；attemptId - 会话 id；path - 文件路径；content - 解决后全文。
   * 返回值：更新后的仓库状态与判题结果。
   */
  async resolveConflict(
    userId: bigint,
    attemptId: bigint,
    path: string,
    content: string,
  ) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    if (attempt.status !== "IN_PROGRESS") {
      throw new BadRequestException("该练习已结束");
    }
    if (attempt.stepCount >= MAX_ATTEMPT_STEPS) {
      throw new BadRequestException("已达到最大命令步数");
    }

    const level = await this.prisma.level.findUnique({ where: { id: attempt.levelId } });
    if (!level) {
      throw new NotFoundException("关卡不存在");
    }

    const currentState = cloneRepoState(fromPrismaJson<RepoState>(attempt.currentState));
    try {
      resolveConflictFile(currentState, path, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : "冲突解决失败";
      throw new BadRequestException(message);
    }

    const newStepCount = attempt.stepCount + 1;
    const goal = fromPrismaJson<LevelGoal>(level.goal);
    const constraints = fromPrismaJson<LevelConstraints>(level.constraints);
    const judgeResult = this.judge.evaluate(currentState, goal, constraints, newStepCount);
    const newStatus = judgeResult.passed ? "COMPLETED" : "IN_PROGRESS";
    const commandLabel = `edit ${path}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.attemptCommand.create({
        data: {
          attemptId,
          stepIndex: newStepCount,
          command: commandLabel,
          feedback: `已保存 ${path}，请 git add 并 commit`,
          success: true,
          output: null,
        },
      });

      await tx.attemptSnapshot.create({
        data: {
          attemptId,
          stepIndex: newStepCount,
          state: toPrismaJson(currentState),
        },
      });

      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          currentState: toPrismaJson(currentState),
          stepCount: newStepCount,
          status: newStatus,
          completedAt: judgeResult.passed ? new Date() : null,
        },
      });

      if (judgeResult.passed) {
        const durationSeconds = Math.floor(
          (Date.now() - attempt.startedAt.getTime()) / 1000,
        );

        await tx.levelResult.upsert({
          where: { userId_levelId: { userId, levelId: attempt.levelId } },
          create: {
            userId,
            levelId: attempt.levelId,
            attemptId,
            score: judgeResult.score,
            durationSeconds,
            commandCount: newStepCount,
          },
          update: {
            attemptId,
            score: judgeResult.score,
            durationSeconds,
            commandCount: newStepCount,
            completedAt: new Date(),
          },
        });

        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user) {
          const existingEntry = await tx.leaderboardEntry.findUnique({
            where: { userId_levelId: { userId, levelId: attempt.levelId } },
          });
          const shouldUpdateLeaderboard =
            !existingEntry
            || judgeResult.score > existingEntry.score
            || (judgeResult.score === existingEntry.score
              && durationSeconds < existingEntry.durationSeconds);

          if (shouldUpdateLeaderboard) {
            await tx.leaderboardEntry.upsert({
              where: { userId_levelId: { userId, levelId: attempt.levelId } },
              create: {
                userId,
                levelId: attempt.levelId,
                score: judgeResult.score,
                durationSeconds,
                displayName: user.displayName,
              },
              update: {
                score: judgeResult.score,
                durationSeconds,
                displayName: user.displayName,
              },
            });
          }
        }
      }
    });

    let newlyUnlockedBadges: string[] = [];
    let nextLevel = null;
    if (judgeResult.passed) {
      newlyUnlockedBadges = await this.badgesService.syncAfterLevelComplete(userId);
      nextLevel = await this.pointsService.tryAutoUnlockNextLevel(userId, attempt.levelId);
    }

    return {
      success: true,
      output: "",
      feedback: `已保存 ${path}，请 git add 并 commit`,
      state: currentState,
      stepCount: newStepCount,
      judge: judgeResult,
      completed: judgeResult.passed,
      newlyUnlockedBadges,
      nextLevel,
    };
  }

  /**
   * 清空练习已执行步骤并重置到开局状态。
   * 功能：删除命令历史与中间快照，仓库回到 stepIndex 0。
   * 参数：userId - 用户 id；attemptId - 会话 id。
   * 返回值：重置后的 attempt 详情。
   */
  async resetAttemptSteps(userId: bigint, attemptId: bigint) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    if (attempt.status !== "IN_PROGRESS") {
      throw new BadRequestException("仅进行中的练习可清空步骤");
    }
    if (attempt.stepCount === 0) {
      throw new BadRequestException("当前没有可清空的步骤");
    }

    const level = await this.prisma.level.findUnique({ where: { id: attempt.levelId } });
    if (!level) {
      throw new NotFoundException("关卡不存在");
    }

    const initialSnapshot = await this.prisma.attemptSnapshot.findFirst({
      where: {
        attemptId,
        stepIndex: 0,
      },
    });
    if (!initialSnapshot) {
      throw new NotFoundException("练习初始快照不存在");
    }

    const initialState = cloneRepoState(fromPrismaJson<RepoState>(initialSnapshot.state));

    await this.prisma.$transaction(async (tx) => {
      await tx.attemptCommand.deleteMany({ where: { attemptId } });
      await tx.attemptSnapshot.deleteMany({
        where: {
          attemptId,
          stepIndex: { gt: 0 },
        },
      });
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          currentState: toPrismaJson(initialState),
          stepCount: 0,
          completedAt: null,
        },
      });
    });

    const updatedAttempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!updatedAttempt) {
      throw new NotFoundException("练习会话不存在");
    }

    return this.buildAttemptDetail(updatedAttempt, level);
  }

  /**
   * 获取练习复盘。
   * 功能：返回命令序列和快照时间线。
   * 参数：userId - 用户 id；attemptId - 会话 id。
   * 返回值：replay 数据。
   */
  async getReplay(userId: bigint, attemptId: bigint) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);

    const commands = await this.prisma.attemptCommand.findMany({
      where: { attemptId },
      orderBy: { stepIndex: "asc" },
    });
    const snapshots = await this.prisma.attemptSnapshot.findMany({
      where: { attemptId },
      orderBy: { stepIndex: "asc" },
    });

    return {
      attemptId: attempt.id.toString(),
      status: attempt.status,
      commands,
      snapshots: snapshots.map((s) => ({
        stepIndex: s.stepIndex,
        state: s.state,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * 组装练习会话详情响应。
   * 功能：统一 create/get 返回结构，并计算开局进度基准。
   * 参数：attempt - 数据库会话记录；level - 关卡实体。
   * 返回值：前端可直接恢复的 attempt 详情。
   */
  private async buildAttemptDetail(
    attempt: {
      id: bigint;
      levelId: bigint;
      status: string;
      currentState: unknown;
      stepCount: number;
      startedAt: Date;
      completedAt: Date | null;
    },
    level: {
      goal: unknown;
      constraints: unknown;
    },
  ) {
    const state = fromPrismaJson<RepoState>(attempt.currentState);
    const goal = fromPrismaJson<LevelGoal>(level.goal);
    const constraints = fromPrismaJson<LevelConstraints>(level.constraints);
    const judgeResult = this.judge.evaluate(state, goal, constraints, attempt.stepCount);

    const initialSnapshot = await this.prisma.attemptSnapshot.findFirst({
      where: {
        attemptId: attempt.id,
        stepIndex: 0,
      },
    });
    if (!initialSnapshot) {
      throw new NotFoundException("练习初始快照不存在");
    }

    const initialState = fromPrismaJson<RepoState>(initialSnapshot.state);
    const initialJudge = this.judge.evaluate(initialState, goal, constraints, 0);

    const commands = await this.prisma.attemptCommand.findMany({
      where: { attemptId: attempt.id },
      orderBy: { stepIndex: "asc" },
    });

    return {
      id: attempt.id.toString(),
      levelId: attempt.levelId.toString(),
      status: attempt.status,
      stepCount: attempt.stepCount,
      state,
      judge: judgeResult,
      commands: commands.map((cmd) => ({
        stepIndex: cmd.stepIndex,
        command: cmd.command,
        success: cmd.success,
        feedback: cmd.feedback,
        output: cmd.output,
      })),
      initialGapCount: initialJudge.gaps.length,
      initialSatisfiedKeys: initialJudge.satisfied,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
    };
  }

  /**
   * 查找属于当前用户的 attempt。
   * 功能：权限隔离，禁止访问他人会话。
   * 参数：userId - 用户 id；attemptId - 会话 id。
   * 返回值：Attempt 实体。
   */
  private async findOwnedAttempt(userId: bigint, attemptId: bigint) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) {
      throw new NotFoundException("练习会话不存在");
    }
    if (attempt.userId !== userId) {
      throw new ForbiddenException("无权访问该练习会话");
    }
    return attempt;
  }
}
