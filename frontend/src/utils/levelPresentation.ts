import type { Component } from "vue";
import {
  BookOpenCheck,
  CircleDot,
  GitBranch,
  GitCommitHorizontal,
  History,
  Zap,
} from "lucide-vue-next";

/** Git 技能类型，对应旧版 challenge.kind */
export type LevelKind = "commit" | "staging" | "branch" | "merge" | "history" | "conflict";

/** 关卡展示元数据 */
export interface LevelPresentation {
  /** 技能类型，决定图标 */
  kind: LevelKind;
  /** 章节中文名，如「仓门初启」 */
  chapterLabel: string;
  /** 技能方向短描述 */
  skillLabel: string;
}

/** 技能类型 -> Lucide 图标组件 */
export const kindIconMap: Record<LevelKind, Component> = {
  commit: GitCommitHorizontal,
  staging: CircleDot,
  branch: GitBranch,
  merge: BookOpenCheck,
  history: History,
  conflict: Zap,
};

/** chapterId 到展示信息的映射（沿用重构前关卡命名） */
const CHAPTER_PRESENTATION: Record<string, LevelPresentation> = {
  commit: { kind: "commit", chapterLabel: "仓门初启", skillLabel: "仓库初始化 / 暂存 / 提交" },
  staging: { kind: "staging", chapterLabel: "暂存炼气", skillLabel: "状态查看 / 精确暂存 / 提交" },
  branch: { kind: "branch", chapterLabel: "分支御剑", skillLabel: "分支创建 / 切换" },
  merge: { kind: "merge", chapterLabel: "合并渡河", skillLabel: "切回主线 / 合并分支" },
  undo: { kind: "history", chapterLabel: "回溯问心", skillLabel: "历史查看 / reset / revert" },
};

/**
 * 根据 chapterId 获取关卡展示元数据。
 * 功能：为关卡卡片提供图标、章节名和技能标签。
 * 参数：chapterId - 章节 id，可为空。
 * 返回值：LevelPresentation，未知章节时使用通用默认值。
 */
export const getLevelPresentation = (chapterId: string | null): LevelPresentation => {
  if (chapterId && CHAPTER_PRESENTATION[chapterId]) {
    return CHAPTER_PRESENTATION[chapterId];
  }
  return {
    kind: "commit",
    chapterLabel: chapterId ?? "修炼章节",
    skillLabel: "Git 状态练习",
  };
};

/**
 * 难度枚举转中文标签。
 * 功能：与旧版「入门 / 进阶 / 突破」文案保持一致。
 * 参数：difficulty - 后端难度枚举。
 * 返回值：中文难度字符串。
 */
export const difficultyLabel = (difficulty: string): string => {
  if (difficulty === "BEGINNER") return "入门";
  if (difficulty === "INTERMEDIATE") return "进阶";
  if (difficulty === "ADVANCED") return "突破";
  return difficulty;
};
