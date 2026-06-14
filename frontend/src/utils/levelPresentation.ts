import type { Component } from "vue";
import {
  BookOpenCheck,
  CircleDot,
  GitBranch,
  GitCommitHorizontal,
  Globe,
  History,
  Package,
  Search,
  Settings,
  Sparkles,
} from "lucide-vue-next";

/** Git 技能类型，对应章节心智模型分类 */
export type LevelKind =
  | "setup"
  | "workspace"
  | "snapshot"
  | "history"
  | "branch"
  | "merge"
  | "remote"
  | "undo"
  | "advanced";

/** 修炼路径上的主题顺序，按 Pro Git 心智模型递进 */
export const TOPIC_CHAPTER_IDS = [
  "setup",
  "workspace",
  "snapshot",
  "history",
  "branch",
  "merge",
  "remote",
  "undo",
  "advanced",
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
  setup: Settings,
  workspace: CircleDot,
  snapshot: GitCommitHorizontal,
  history: History,
  branch: GitBranch,
  merge: BookOpenCheck,
  remote: Globe,
  undo: Package,
  advanced: Sparkles,
};

/** chapterId 到展示信息的映射 */
const CHAPTER_PRESENTATION: Record<string, LevelPresentation> = {
  setup: {
    kind: "setup",
    chapterLabel: "开坛筑基",
    skillLabel: "config / init",
    topicLabel: "首次配置",
    topicDesc: "认识 Git、配置身份、初始化仓库",
    lockedHint: "关卡开发中，敬请期待",
  },
  workspace: {
    kind: "workspace",
    chapterLabel: "三境初识",
    skillLabel: "status / 工作区状态",
    topicLabel: "观察状态",
    topicDesc: "用 status 理解 working tree、index 与 HEAD",
    lockedHint: "关卡开发中，敬请期待",
  },
  snapshot: {
    kind: "snapshot",
    chapterLabel: "快照成印",
    skillLabel: "diff / add / commit",
    topicLabel: "记录变更",
    topicDesc: "先看 diff，再选择变更并写入历史",
    lockedHint: "关卡开发中，敬请期待",
  },
  history: {
    kind: "history",
    chapterLabel: "史脉溯源",
    skillLabel: "log / show",
    topicLabel: "阅读历史",
    topicDesc: "用 log 与 show 查找并理解提交",
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
    topicDesc: "快进合并、merge commit 与冲突处理",
    lockedHint: "关卡开发中，敬请期待",
  },
  remote: {
    kind: "remote",
    chapterLabel: "云脉协作",
    skillLabel: "clone / fetch / pull / push",
    topicLabel: "远程协作",
    topicDesc: "与 origin 同步代码、处理 push 拒绝",
    lockedHint: "关卡开发中，敬请期待",
  },
  undo: {
    kind: "undo",
    chapterLabel: "回溯补过",
    skillLabel: "restore / reset / revert / stash",
    topicLabel: "撤销与贮藏",
    topicDesc: "区分本地撤销、公开 revert 与 stash",
    lockedHint: "关卡开发中，敬请期待",
  },
  advanced: {
    kind: "advanced",
    chapterLabel: "摘星断案",
    skillLabel: "tag / rebase / bisect / reflog",
    topicLabel: "进阶技法",
    topicDesc: "发布标记、历史整理、诊断与救回",
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

/** @deprecated 旧 debug 章节图标，兼容历史数据 */
export const debugPresentationFallback: LevelPresentation = {
  kind: "advanced",
  chapterLabel: "断案寻因",
  skillLabel: "log / bisect / reflog",
  topicLabel: "诊断恢复",
  topicDesc: "追溯问题、二分定位、reflog 救回",
  lockedHint: "关卡开发中，敬请期待",
};

/** @deprecated 旧 cherry-pick 章节，映射到 advanced */
export const cherryPickPresentationFallback: LevelPresentation = {
  kind: "advanced",
  chapterLabel: "摘星移火",
  skillLabel: "cherry-pick / rebase",
  topicLabel: "历史移植",
  topicDesc: "摘取提交、rebase 整理历史",
  lockedHint: "关卡开发中，敬请期待",
};

/** @deprecated 旧 stash 独立章节，映射到 undo */
export const stashPresentationFallback: LevelPresentation = {
  kind: "undo",
  chapterLabel: "藏锋转身",
  skillLabel: "stash / 临时切换",
  topicLabel: "贮藏变更",
  topicDesc: "中断工作流时保存与恢复本地修改",
  lockedHint: "关卡开发中，敬请期待",
};
