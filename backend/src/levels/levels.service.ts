import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { RepoState } from "../git-engine/repo-state.types";
import { fromPrismaJson } from "../common/json.util";
import { PointsService } from "../points/points.service";
import { getLevelLearningHints, type LevelGoalHintsBundle } from "./level-hints";

/**
 * 关卡服务。
 * 功能：查询已发布关卡列表和详情，并附带解锁状态。
 * 参数：levelId - 关卡主键；userId - 可选当前用户。
 * 返回值：关卡 DTO。
 */
@Injectable()
export class LevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pointsService: PointsService,
  ) {}

  /**
   * 列出所有已发布关卡。
   * 功能：供前端课程/关卡列表页使用，附带解锁状态。
   * 参数：userId - 可选当前用户 id。
   * 返回值：关卡摘要数组。
   */
  async listPublishedLevels(userId?: bigint) {
    const levels = await this.prisma.level.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        courseId: true,
        chapterId: true,
        title: true,
        description: true,
        difficulty: true,
        sortOrder: true,
        publishedAt: true,
      },
    });

    const unlockStateMap = await this.pointsService.buildUnlockStateMap(userId);

    return levels.map((level) => {
      const levelIdText = level.id.toString();
      const unlockState = unlockStateMap.get(levelIdText) ?? {
        unlockStatus: "locked" as const,
        unlockCost: 0,
        canStart: false,
      };

      return {
        id: levelIdText,
        courseId: level.courseId,
        chapterId: level.chapterId,
        title: level.title,
        description: level.description,
        difficulty: level.difficulty,
        sortOrder: level.sortOrder,
        publishedAt: level.publishedAt,
        unlockCost: unlockState.unlockCost,
        unlockStatus: unlockState.unlockStatus,
        canStart: unlockState.canStart,
      };
    });
  }

  /**
   * 获取已发布关卡详情。
   * 功能：未解锁关卡返回 403，不泄露 initialState。
   * 参数：levelId - 关卡 id；userId - 当前用户 id，未登录时仅前 3 关可访问。
   * 返回值：关卡详情（不含完整 goal 答案）。
   */
  async getPublishedLevel(levelId: bigint, userId?: bigint) {
    const level = await this.prisma.level.findFirst({
      where: { id: levelId, status: "PUBLISHED" },
    });
    if (!level) {
      throw new NotFoundException("关卡不存在或未发布");
    }

    const unlockState = await this.pointsService.getUnlockState(userId, levelId);
    if (!unlockState.canStart) {
      throw new ForbiddenException("关卡未解锁，请先消耗积分解锁");
    }

    const initialState = fromPrismaJson<RepoState>(level.initialState);
    const goal = fromPrismaJson<Record<string, unknown>>(level.goal);

    return {
      id: level.id.toString(),
      courseId: level.courseId,
      chapterId: level.chapterId,
      title: level.title,
      description: level.description,
      difficulty: level.difficulty,
      initialState,
      goalHints: buildLevelHints(goal, level.sortOrder),
      unlockCost: unlockState.unlockCost,
      unlockStatus: unlockState.unlockStatus,
      canStart: unlockState.canStart,
    };
  }

  /**
   * 积分解锁关卡。
   * 功能：委托 PointsService 扣积分并写入解锁记录。
   * 参数：userId - 用户 id；levelId - 关卡 id。
   * 返回值：解锁后的关卡状态。
   */
  unlockLevel(userId: bigint, levelId: bigint) {
    return this.pointsService.unlockLevel(userId, levelId);
  }

  /**
   * 内部用：获取完整关卡配置（含 goal/constraints）。
   * 功能：供 Attempts 模块判题使用。
   * 参数：levelId - 关卡 id。
   * 返回值：完整 Level 实体。
   */
  getLevelForAttempt(levelId: bigint) {
    return this.prisma.level.findFirst({
      where: { id: levelId, status: "PUBLISHED" },
    });
  }
}

/**
 * 组装关卡完整提示包。
 * 功能：合并三层教学提示与通关目标 checklist。
 * 参数：goal - 关卡目标 JSON；sortOrder - 关卡排序号。
 * 返回值：分层提示对象。
 */
const buildLevelHints = (goal: Record<string, unknown>, sortOrder: number): LevelGoalHintsBundle => {
  const learning = getLevelLearningHints(sortOrder);
  return {
    concepts: learning.concepts,
    directions: learning.directions,
    keyPoints: learning.keyPoints,
    targets: buildGoalTargets(goal),
  };
};

/**
 * 从 goal 生成通关目标 checklist。
 * 功能：让用户知道要达成什么；文件类目标需写明路径与内容，避免「目标内容」等模糊表述。
 * 参数：goal - 关卡目标 JSON。
 * 返回值：目标提示字符串数组。
 */
const buildGoalTargets = (goal: Record<string, unknown>): string[] => {
  const targets: string[] = [];
  /** 关卡最终应在的分支，用于 fileContents 文案 */
  const goalBranch = typeof goal.currentBranch === "string" ? goal.currentBranch : null;

  if (goal.branchMerged) {
    const merges = goal.branchMerged as Array<{ source: string; target: string }>;
    for (const item of merges) {
      targets.push(`将分支 '${item.source}' 合并到 '${item.target}'`);
    }
  }
  if (goal.currentBranch) {
    targets.push(`最终当前分支应为 '${goal.currentBranch as string}'`);
  }
  if (goal.mergeCommitRequired) {
    targets.push("合并结果需为 merge commit（两个父提交）");
  }
  if (goal.branchHeads) {
    const branchNames = Object.keys(goal.branchHeads as Record<string, string>);
    targets.push(`分支 ${branchNames.join("、")} 需指向正确提交`);
  }
  if (goal.branchFileContents) {
    const branchFiles = goal.branchFileContents as Record<string, Record<string, string>>;
    for (const [branch, files] of Object.entries(branchFiles)) {
      for (const [path, content] of Object.entries(files)) {
        targets.push(`分支「${branch}」需提交「${path}」，内容为「${content}」`);
      }
    }
  }
  if (goal.fileContents) {
    for (const [path, content] of Object.entries(goal.fileContents as Record<string, string>)) {
      if (goalBranch) {
        targets.push(`分支「${goalBranch}」最终需包含「${path}」，内容为「${content}」`);
      } else {
        targets.push(`「${path}」最终内容应为「${content}」`);
      }
    }
  }
  if (goal.workingTreeContents) {
    for (const [path, content] of Object.entries(goal.workingTreeContents as Record<string, string>)) {
      targets.push(`工作区「${path}」需保持内容为「${content}」`);
    }
  }
  if (goal.indexContents) {
    for (const [path, content] of Object.entries(goal.indexContents as Record<string, string>)) {
      targets.push(`暂存区「${path}」内容应为「${content}」`);
    }
  }
  if (goal.stashContents) {
    const paths = Object.keys(goal.stashContents as Record<string, string>).join("、");
    targets.push(`需将 ${paths} 的修改贮藏到 stash`);
  }
  if (goal.requiredTags) {
    for (const tagName of Object.keys(goal.requiredTags as Record<string, string>)) {
      targets.push(`需创建标签 '${tagName}'`);
    }
  }
  if (goal.bisectFound) {
    targets.push("需定位历史中的首个不良提交");
  }
  if (goal.branchContains) {
    targets.push("指定分支需保留应有的历史提交");
  }
  if (goal.branchNotContains) {
    targets.push("指定分支不能包含错误提交");
  }
  if (goal.filesAbsentFromHead) {
    const paths = (goal.filesAbsentFromHead as string[]).join("、");
    targets.push(`${paths} 不能进入版本库`);
  }
  if (goal.untrackedFiles) {
    const paths = (goal.untrackedFiles as string[]).join("、");
    targets.push(`${paths} 需保持未跟踪状态`);
  }
  if (goal.workingTreeClean) {
    targets.push("工作区需 clean（无未提交改动）");
  }
  if (goal.indexEmpty) {
    targets.push("暂存区需为空");
  }
  if (goal.noConflicts) {
    targets.push("不能有未解决冲突");
  }
  if (goal.commitsExist) {
    targets.push("需保留指定的历史提交");
  }

  return targets;
};
