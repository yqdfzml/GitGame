import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { RepoState } from "../git-engine/repo-state.types";
import { fromPrismaJson } from "../common/json.util";

/**
 * 关卡服务。
 * 功能：查询已发布关卡列表和详情。
 * 参数：levelId - 关卡主键。
 * 返回值：关卡 DTO。
 */
@Injectable()
export class LevelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 列出所有已发布关卡。
   * 功能：供前端课程/关卡列表页使用。
   * 参数：无。
   * 返回值：关卡摘要数组。
   */
  async listPublishedLevels() {
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

    return levels.map((level) => ({
      id: level.id.toString(),
      courseId: level.courseId,
      chapterId: level.chapterId,
      title: level.title,
      description: level.description,
      difficulty: level.difficulty,
      sortOrder: level.sortOrder,
      publishedAt: level.publishedAt,
    }));
  }

  /**
   * 获取已发布关卡详情。
   * 功能：返回 initialState 供练习页初始化，goal 仅返回描述性 hint。
   * 参数：levelId - 关卡 id。
   * 返回值：关卡详情（不含完整 goal 答案）。
   */
  async getPublishedLevel(levelId: bigint) {
    const level = await this.prisma.level.findFirst({
      where: { id: levelId, status: "PUBLISHED" },
    });
    if (!level) {
      throw new NotFoundException("关卡不存在或未发布");
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
      goalHints: buildGoalHints(goal),
    };
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
 * 从 goal 生成前端可展示的目标提示（不含答案细节）。
 * 功能：让用户知道要达成什么，但不泄露具体 commit hash 等。
 * 参数：goal - 关卡目标 JSON。
 * 返回值：提示字符串数组。
 */
const buildGoalHints = (goal: Record<string, unknown>): string[] => {
  const hints: string[] = [];
  if (goal.currentBranch) {
    hints.push(`当前分支应为 '${goal.currentBranch as string}'`);
  }
  if (goal.workingTreeClean) {
    hints.push("工作区需要 clean");
  }
  if (goal.indexEmpty) {
    hints.push("暂存区需要为空");
  }
  if (goal.noConflicts) {
    hints.push("不能有未解决冲突");
  }
  if (goal.fileContents) {
    hints.push("部分文件需要达到指定内容");
  }
  if (goal.branchMerged) {
    hints.push("需要将指定分支合并到目标分支");
  }
  if (goal.branchContains) {
    hints.push("指定分支需要包含目标提交");
  }
  return hints;
};
