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
import { LeaderboardService } from "../leaderboard/leaderboard.service";
import type {
  LevelConstraints,
  LevelGoal,
  RepoState,
} from "../git-engine/repo-state.types";
import { cloneRepoState } from "../git-engine/git-engine.utils";

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
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * 创建新练习会话。
   * 功能：复制关卡 initialState 作为 currentState。
   * 参数：userId - 用户 id；levelId - 关卡 id。
   * 返回值：attempt 摘要。
   */
  async createAttempt(userId: bigint, levelId: bigint) {
    const level = await this.levelsService.getLevelForAttempt(levelId);
    if (!level) {
      throw new NotFoundException("关卡不存在或未发布");
    }

    const initialState = cloneRepoState(level.initialState as RepoState);
    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        levelId,
        currentState: initialState,
        stepCount: 0,
      },
    });

    await this.prisma.attemptSnapshot.create({
      data: {
        attemptId: attempt.id,
        stepIndex: 0,
        state: initialState,
      },
    });

    const goal = level.goal as LevelGoal;
    const constraints = level.constraints as LevelConstraints;
    const judgeResult = this.judge.evaluate(initialState, goal, constraints, 0);

    return {
      id: attempt.id.toString(),
      levelId: levelId.toString(),
      status: attempt.status,
      stepCount: 0,
      state: initialState,
      judge: judgeResult,
      startedAt: attempt.startedAt,
    };
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

    const state = attempt.currentState as RepoState;
    const goal = level.goal as LevelGoal;
    const constraints = level.constraints as LevelConstraints;
    const judgeResult = this.judge.evaluate(state, goal, constraints, attempt.stepCount);

    const commands = await this.prisma.attemptCommand.findMany({
      where: { attemptId },
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
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
    };
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

    const currentState = attempt.currentState as RepoState;
    const result = this.gitEngine.executeCommand(command, currentState);

    const newStepCount = attempt.stepCount + 1;
    const goal = level.goal as LevelGoal;
    const constraints = level.constraints as LevelConstraints;
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
            state: result.state,
          },
        });
      }

      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          currentState: nextState,
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
      }
    });

    if (judgeResult.passed) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.leaderboardService.upsertEntry({
          userId,
          levelId: attempt.levelId,
          score: judgeResult.score,
          durationSeconds: Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000),
          displayName: user.displayName,
        });
      }
    }

    return {
      success: result.success,
      output: result.output,
      feedback: result.feedback,
      state: nextState,
      stepCount: newStepCount,
      judge: judgeResult,
      completed: judgeResult.passed,
    };
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
