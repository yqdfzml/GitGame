import type { Component } from "vue";
import {
  BookOpenCheck,
  CircleDot,
  GitBranch,
  GitCommitHorizontal,
  History,
  Package,
  Search,
  Sparkles,
} from "lucide-vue-next";

/** Git 技能类型，对应章节心智模型分类 */
export type LevelKind =
  | "workspace"
  | "snapshot"
  | "branch"
  | "merge"
  | "undo"
  | "stash"
  | "cherry-pick"
  | "debug";

/** 修炼路径上的主题顺序，按 Git 心智模型递进 */
export const TOPIC_CHAPTER_IDS = [
  "workspace",
  "snapshot",
  "branch",
  "merge",
  "undo",
  "stash",
  "cherry-pick",
  "debug",
] as const;

/** 主题章节 id */
export type TopicChapterId = (typeof TOPIC_CHAPTER_IDS)[number];

/** 关卡展示元数据 */
export interface LevelPresentation {
  /** 技能类型，决定图标 */
  kind: LevelKind;
  /** 章节中文名 */
  chapterLabel: string;
  /** 技能方向短描述 */
  skillLabel: string;
  /** 主题卡片标题 */
  topicLabel: string;
  /** 主题卡片一行简介 */
  topicDesc: string;
  /** 未开放主题时的轻提示 */
  lockedHint: string;
}

/** 技能类型 -> Lucide 图标组件 */
export const kindIconMap: Record<LevelKind, Component> = {
  workspace: CircleDot,
  snapshot: GitCommitHorizontal,
  branch: GitBranch,
  merge: BookOpenCheck,
  undo: History,
  stash: Package,
  "cherry-pick": Sparkles,
  debug: Search,
};

/** chapterId 到展示信息的映射 */
const CHAPTER_PRESENTATION: Record<string, LevelPresentation> = {
  workspace: {
    kind: "workspace",
    chapterLabel: "初入仓境",
    skillLabel: "工作区 / 暂存区 / HEAD",
    topicLabel: "三境识别",
    topicDesc: "用 status 理解 working tree、index 与 HEAD",
    lockedHint: "关卡开发中，敬请期待",
  },
  snapshot: {
    kind: "snapshot",
    chapterLabel: "快照成印",
    skillLabel: "add / commit / restore",
    topicLabel: "快照提交",
    topicDesc: "选择变更、暂存快照、写入历史",
    lockedHint: "关卡开发中，敬请期待",
  },
  branch: {
    kind: "branch",
    chapterLabel: "分脉立道",
    skillLabel: "branch / switch / checkout",
    topicLabel: "分支指针",
    topicDesc: "理解 branch 引用与 HEAD 位置",
    lockedHint: "关卡开发中，敬请期待",
  },
  merge: {
    kind: "merge",
    chapterLabel: "合流破障",
    skillLabel: "merge / 冲突解决",
    topicLabel: "合并历史",
    topicDesc: "合并分支历史，处理冲突",
    lockedHint: "关卡开发中，敬请期待",
  },
  undo: {
    kind: "undo",
    chapterLabel: "回溯补过",
    skillLabel: "reset / restore / revert",
    topicLabel: "撤销与恢复",
    topicDesc: "区分撤回暂存、恢复文件与撤销提交",
    lockedHint: "关卡开发中，敬请期待",
  },
  stash: {
    kind: "stash",
    chapterLabel: "藏锋转身",
    skillLabel: "stash / 临时切换",
    topicLabel: "贮藏变更",
    topicDesc: "中断工作流时保存与恢复本地修改",
    lockedHint: "关卡开发中，敬请期待",
  },
  "cherry-pick": {
    kind: "cherry-pick",
    chapterLabel: "摘星移火",
    skillLabel: "cherry-pick / rebase",
    topicLabel: "历史移植",
    topicDesc: "摘取提交、rebase 整理历史",
    lockedHint: "关卡开发中，敬请期待",
  },
  debug: {
    kind: "debug",
    chapterLabel: "断案寻因",
    skillLabel: "log / bisect / reflog",
    topicLabel: "诊断恢复",
    topicDesc: "追溯问题、二分定位、reflog 救回",
    lockedHint: "关卡开发中，敬请期待",
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
    kind: "workspace",
    chapterLabel: chapterId ?? "修炼章节",
    skillLabel: "Git 状态练习",
    topicLabel: chapterId ?? "Git 练习",
    topicDesc: "在终端完成 Git 命令挑战",
    lockedHint: "关卡开发中，敬请期待",
  };
};

/**
 * 获取章节中文展示名。
 * 功能：管理后台与玩家端统一章节文案，避免直接露出 chapterId。
 * 参数：chapterId - 章节 id，可为空。
 * 返回值：中文章节名。
 */
export const getChapterLabel = (chapterId: string | null): string => {
  return getLevelPresentation(chapterId).chapterLabel;
};

/**
 * 难度枚举转中文标签。
 * 功能：与「入门 / 进阶 / 突破」文案保持一致。
 * 参数：difficulty - 后端难度枚举。
 * 返回值：中文难度字符串。
 */
export const difficultyLabel = (difficulty: string): string => {
  if (difficulty === "BEGINNER") return "入门";
  if (difficulty === "INTERMEDIATE") return "进阶";
  if (difficulty === "ADVANCED") return "突破";
  return difficulty;
};
