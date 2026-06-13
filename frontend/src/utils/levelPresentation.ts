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

/** 修炼路径上的主题顺序，与参考 UI 横向卡片一致 */
export const TOPIC_CHAPTER_IDS = [
  "commit",
  "staging",
  "branch",
  "merge",
  "undo",
  "conflict",
] as const;

/** 主题章节 id */
export type TopicChapterId = (typeof TOPIC_CHAPTER_IDS)[number];

/** 关卡展示元数据 */
export interface LevelPresentation {
  /** 技能类型，决定图标 */
  kind: LevelKind;
  /** 章节中文名，如「仓门初启」 */
  chapterLabel: string;
  /** 技能方向短描述 */
  skillLabel: string;
  /** 主题卡片标题，如「提交基础」 */
  topicLabel: string;
  /** 主题卡片一行简介 */
  topicDesc: string;
  /** 未开放主题时的轻提示 */
  lockedHint: string;
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

/** chapterId 到展示信息的映射 */
const CHAPTER_PRESENTATION: Record<string, LevelPresentation> = {
  commit: {
    kind: "commit",
    chapterLabel: "仓门初启",
    skillLabel: "仓库初始化 / 暂存 / 提交",
    topicLabel: "提交基础",
    topicDesc: "把修改加入暂存区并完成首次 commit",
    lockedHint: "关卡开发中，敬请期待",
  },
  staging: {
    kind: "staging",
    chapterLabel: "暂存炼气",
    skillLabel: "状态查看 / 精确暂存 / 提交",
    topicLabel: "暂存区理解",
    topicDesc: "区分工作区、暂存区与仓库快照",
    lockedHint: "关卡开发中，敬请期待",
  },
  branch: {
    kind: "branch",
    chapterLabel: "分支御剑",
    skillLabel: "分支创建 / 切换",
    topicLabel: "分支操作",
    topicDesc: "创建分支并切换 HEAD 指针",
    lockedHint: "关卡开发中，敬请期待",
  },
  merge: {
    kind: "merge",
    chapterLabel: "合并渡河",
    skillLabel: "切回主线 / 合并分支",
    topicLabel: "合并流程",
    topicDesc: "将分支变更合入主线分支",
    lockedHint: "关卡开发中，敬请期待",
  },
  undo: {
    kind: "history",
    chapterLabel: "回溯问心",
    skillLabel: "历史查看 / reset / revert",
    topicLabel: "历史回溯",
    topicDesc: "用 reset 或 revert 修正错误提交",
    lockedHint: "关卡开发中，敬请期待",
  },
  conflict: {
    kind: "conflict",
    chapterLabel: "冲突化解",
    skillLabel: "冲突标记 / 解决合并",
    topicLabel: "冲突处理",
    topicDesc: "识别冲突标记并手动解决合并",
    lockedHint: "冲突关卡正在打磨，稍后开放",
  },
};

/**
 * 根据 chapterId 获取关卡展示元数据。
 * 功能：为关卡卡片提供图标、章节名和主题标签。
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
    topicLabel: chapterId ?? "Git 练习",
    topicDesc: "在终端完成 Git 命令挑战",
    lockedHint: "关卡开发中，敬请期待",
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
