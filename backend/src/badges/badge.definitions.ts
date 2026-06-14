/** 徽章分类 */
export type BadgeCategory =
  | "title"
  | "command"
  | "result"
  | "workflow"
  | "technique"
  | "mastery";

/** 视觉档位：1 朴素 / 2 能量 / 3 空间 / 4 法相 */
export type BadgeVisualTier = 1 | 2 | 3 | 4;

/** 段位 id */
export type RankTierId =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "immortal";

/** 徽章静态定义 */
export interface BadgeDefinition {
  /** 徽章唯一 id */
  id: string;
  /** 分类 */
  category: BadgeCategory;
  /** 展示名称 */
  name: string;
  /** 解锁说明 */
  description: string;
  /** 对应能力描述 */
  ability: string;
  /** 图标 key，前端映射样式 */
  iconKey: string;
  /** 主色 hex */
  color: string;
  /** 视觉档位 */
  visualTier: BadgeVisualTier;
  /** 主线称号等级 1-10，仅 title 类有值 */
  titleLevel?: number;
}

/** 段位定义 */
export interface RankDefinition {
  id: RankTierId;
  name: string;
  label: string;
  /** 对应主线称号等级下限 */
  minTitleLevel: number;
}

/** 10 个主线称号徽章 */
export const TITLE_BADGES: BadgeDefinition[] = [
  {
    id: "title_01",
    category: "title",
    name: "初入山门",
    description: "完成首次关卡",
    ability: "完成首次关卡",
    iconKey: "wood-token",
    color: "#2fb388",
    visualTier: 1,
    titleLevel: 1,
  },
  {
    id: "title_02",
    category: "title",
    name: "炼气码童",
    description: "累计通关 2 关",
    ability: "会查看状态、提交变更",
    iconKey: "spirit-stone",
    color: "#5eb8d4",
    visualTier: 1,
    titleLevel: 2,
  },
  {
    id: "title_03",
    category: "title",
    name: "筑基执笔",
    description: "通关「提交基础」主题",
    ability: "熟练 add、commit",
    iconKey: "bamboo-scroll",
    color: "#3a9fb8",
    visualTier: 1,
    titleLevel: 3,
  },
  {
    id: "title_04",
    category: "title",
    name: "结丹分脉",
    description: "通关「分支操作」主题",
    ability: "掌握分支创建和切换",
    iconKey: "golden-core",
    color: "#e8a838",
    visualTier: 2,
    titleLevel: 4,
  },
  {
    id: "title_05",
    category: "title",
    name: "元婴合流",
    description: "通关「合并流程」主题",
    ability: "掌握 merge 和冲突解决",
    iconKey: "merge-rivers",
    color: "#9b7bd4",
    visualTier: 2,
    titleLevel: 5,
  },
  {
    id: "title_06",
    category: "title",
    name: "化神回溯",
    description: "通关「历史回溯」主题",
    ability: "掌握 reset、restore、revert",
    iconKey: "time-wheel",
    color: "#4a6fa5",
    visualTier: 2,
    titleLevel: 6,
  },
  {
    id: "title_07",
    category: "title",
    name: "炼虚摘星",
    description: "通关「暂存区理解」主题",
    ability: "掌握精确暂存与提交",
    iconKey: "star-pick",
    color: "#8b6fd4",
    visualTier: 3,
    titleLevel: 7,
  },
  {
    id: "title_08",
    category: "title",
    name: "合体改命",
    description: "在通关 attempt 中使用过 reset / revert / restore",
    ability: "掌握历史修正命令",
    iconKey: "fate-disk",
    color: "#c9782a",
    visualTier: 3,
    titleLevel: 8,
  },
  {
    id: "title_09",
    category: "title",
    name: "大乘宗师",
    description: "通关全部已发布关卡",
    ability: "多路径解法稳定通关",
    iconKey: "full-graph",
    color: "#d4dce8",
    visualTier: 4,
    titleLevel: 9,
  },
  {
    id: "title_10",
    category: "title",
    name: "飞升 Git 仙",
    description: "全关卡通关且累计得分达到 400",
    ability: "高难全通、低失误、高评分",
    iconKey: "immortal-seal",
    color: "#f2bd4b",
    visualTier: 4,
    titleLevel: 10,
  },
];

/** 10 个命令专精徽章 */
export const COMMAND_BADGES: BadgeDefinition[] = [
  {
    id: "cmd_status",
    category: "command",
    name: "状态观心",
    description: "在通关 attempt 中使用 git status",
    ability: "使用 git status 发现关键问题并通关",
    iconKey: "eye-status",
    color: "#5eb8d4",
    visualTier: 1,
  },
  {
    id: "cmd_commit_10",
    category: "command",
    name: "一印成章",
    description: "累计成功执行 10 次 git commit",
    ability: "连续完成 10 次有效 commit",
    iconKey: "commit-seal",
    color: "#2fb388",
    visualTier: 1,
  },
  {
    id: "cmd_branch",
    category: "command",
    name: "分脉术士",
    description: "在分支主题关卡通关时使用 branch / checkout / switch",
    ability: "使用 branch/switch 完成分支类关卡",
    iconKey: "branch-split",
    color: "#e8a838",
    visualTier: 2,
  },
  {
    id: "cmd_merge",
    category: "command",
    name: "合流使者",
    description: "在合并主题关卡通关时使用 git merge",
    ability: "完成 merge 类关卡",
    iconKey: "merge-flow",
    color: "#9b7bd4",
    visualTier: 2,
  },
  {
    id: "cmd_conflict",
    category: "command",
    name: "冲突调和者",
    description: "通关合并流程主题关卡",
    ability: "成功解决合并类挑战并通关",
    iconKey: "jade-mend",
    color: "#d94e2d",
    visualTier: 2,
  },
  {
    id: "cmd_undo",
    category: "command",
    name: "回溯行者",
    description: "在历史回溯主题通关时使用 reset / revert / restore",
    ability: "使用 reset/revert/restore 修正错误",
    iconKey: "hourglass-head",
    color: "#4a6fa5",
    visualTier: 2,
  },
  {
    id: "cmd_restore",
    category: "command",
    name: "摘星手",
    description: "在通关 attempt 中使用 git restore",
    ability: "用 restore 精准恢复文件",
    iconKey: "star-hand",
    color: "#8b6fd4",
    visualTier: 3,
  },
  {
    id: "cmd_reset",
    category: "command",
    name: "改命师",
    description: "在通关 attempt 中使用 git reset",
    ability: "使用 reset 整理历史",
    iconKey: "fate-reset",
    color: "#c9782a",
    visualTier: 3,
  },
  {
    id: "cmd_add",
    category: "command",
    name: "藏锋客",
    description: "在 3 次不同关卡通关 attempt 中使用 git add",
    ability: "使用 add 精确暂存变更",
    iconKey: "stash-bag",
    color: "#7a8a9a",
    visualTier: 3,
  },
  {
    id: "cmd_clean",
    category: "command",
    name: "洁净道心",
    description: "通关时达成 working tree clean 目标",
    ability: "通关时 working tree clean",
    iconKey: "clean-mirror",
    color: "#dff7ee",
    visualTier: 1,
  },
];

/** 5 个结果导向徽章 */
export const RESULT_BADGES: BadgeDefinition[] = [
  {
    id: "result_multi_path",
    category: "result",
    name: "殊途同归",
    description: "同一关卡用两种不同命令序列通关",
    ability: "同一关卡用两种不同命令路径通关",
    iconKey: "dual-path",
    color: "#2fb388",
    visualTier: 2,
  },
  {
    id: "result_recovery",
    category: "result",
    name: "逆流成道",
    description: "在出现失败命令后仍成功通关",
    ability: "出现错误后成功修正并通关",
    iconKey: "rejoin-branch",
    color: "#5eb8d4",
    visualTier: 2,
  },
  {
    id: "result_min_steps",
    category: "result",
    name: "最短因果",
    description: "单次通关使用不超过 5 条命令",
    ability: "用少量命令达成目标",
    iconKey: "straight-line",
    color: "#e8a838",
    visualTier: 2,
  },
  {
    id: "result_streak",
    category: "result",
    name: "稳如老祖",
    description: "连续 3 次通关 attempt 全部命令成功",
    ability: "连续 3 关无失败命令",
    iconKey: "steady-mountain",
    color: "#4a6fa5",
    visualTier: 3,
  },
  {
    id: "result_all_clear",
    category: "result",
    name: "不循旧法",
    description: "通关全部已发布关卡",
    ability: "独立完成后段修炼路径",
    iconKey: "blank-scroll",
    color: "#9b7bd4",
    visualTier: 3,
  },
];

/** 6 个流派修炼徽章 */
export const WORKFLOW_BADGES: BadgeDefinition[] = [
  {
    id: "workflow_stash_clear",
    category: "workflow",
    name: "藏锋入袋",
    description: "通关 stash 章节任意关卡",
    ability: "掌握贮藏变更与临时切换工作流",
    iconKey: "stash-pocket",
    color: "#7a8a9a",
    visualTier: 2,
  },
  {
    id: "workflow_tag_archive",
    category: "workflow",
    name: "立碑记名",
    description: "通关含 requiredTags 目标的关卡",
    ability: "用 tag 标记版本里程碑",
    iconKey: "tag-monument",
    color: "#e8a838",
    visualTier: 2,
  },
  {
    id: "workflow_cherry_pick",
    category: "workflow",
    name: "摘星渡法",
    description: "通关 cherry-pick 章节任意关卡",
    ability: "摘取提交并移植到目标分支",
    iconKey: "cherry-star",
    color: "#8b6fd4",
    visualTier: 2,
  },
  {
    id: "workflow_rebase",
    category: "workflow",
    name: "移脉重铸",
    description: "通关含 rebase 路径的关卡",
    ability: "用 rebase 整理线性历史",
    iconKey: "rebase-vein",
    color: "#c9782a",
    visualTier: 3,
  },
  {
    id: "workflow_debug",
    category: "workflow",
    name: "追因问道",
    description: "通关 debug 章节任意关卡",
    ability: "追溯历史、二分定位与 reflog 恢复",
    iconKey: "debug-trail",
    color: "#4a6fa5",
    visualTier: 3,
  },
  {
    id: "workflow_all_chapters",
    category: "workflow",
    name: "百脉初通",
    description: "每个已发布章节至少通关 1 关",
    ability: "覆盖全部 Git 修炼路径",
    iconKey: "all-veins",
    color: "#2fb388",
    visualTier: 3,
  },
];

/** 8 个高阶技法徽章 */
export const TECHNIQUE_BADGES: BadgeDefinition[] = [
  {
    id: "tech_stash_save",
    category: "technique",
    name: "临时收功",
    description: "成功使用 git stash 并最终通关",
    ability: "在切换任务前贮藏未完成变更",
    iconKey: "stash-save",
    color: "#7a8a9a",
    visualTier: 2,
  },
  {
    id: "tech_stash_recover",
    category: "technique",
    name: "藏而不失",
    description: "通关 attempt 中使用 stash pop 或 stash apply",
    ability: "恢复贮藏的工作区变更",
    iconKey: "stash-recover",
    color: "#5eb8d4",
    visualTier: 2,
  },
  {
    id: "tech_tag",
    category: "technique",
    name: "版本立碑",
    description: "通关 attempt 中使用 git tag",
    ability: "为重要 commit 打标签",
    iconKey: "tag-mark",
    color: "#e8a838",
    visualTier: 2,
  },
  {
    id: "tech_cherry_pick",
    category: "technique",
    name: "摘印入主",
    description: "通关 attempt 中使用 git cherry-pick",
    ability: "将指定提交复制到当前分支",
    iconKey: "cherry-seal",
    color: "#8b6fd4",
    visualTier: 3,
  },
  {
    id: "tech_rebase",
    category: "technique",
    name: "重排因果",
    description: "通关 attempt 中使用 git rebase",
    ability: "重放提交以整理分支历史",
    iconKey: "rebase-order",
    color: "#c9782a",
    visualTier: 3,
  },
  {
    id: "tech_rebase_continue",
    category: "technique",
    name: "断劫续脉",
    description: "rebase 冲突后使用 git rebase --continue 并通关",
    ability: "解决 rebase 冲突后继续重放",
    iconKey: "rebase-continue",
    color: "#d94e2d",
    visualTier: 3,
  },
  {
    id: "tech_reflog",
    category: "technique",
    name: "回光照影",
    description: "通关 attempt 中使用 git reflog",
    ability: "查看引用日志找回丢失提交",
    iconKey: "reflog-light",
    color: "#4a6fa5",
    visualTier: 3,
  },
  {
    id: "tech_bisect",
    category: "technique",
    name: "二分问道",
    description: "通关 attempt 中使用 git bisect",
    ability: "二分搜索定位问题提交",
    iconKey: "bisect-half",
    color: "#9b7bd4",
    visualTier: 3,
  },
];

/** 8 个掌握表现徽章 */
export const MASTERY_BADGES: BadgeDefinition[] = [
  {
    id: "mastery_workspace_clean_5",
    category: "mastery",
    name: "明镜五照",
    description: "5 个不同关卡通关时 working tree clean",
    ability: "稳定保持工作区洁净",
    iconKey: "clean-five",
    color: "#dff7ee",
    visualTier: 2,
  },
  {
    id: "mastery_low_steps_3",
    category: "mastery",
    name: "三笔成局",
    description: "3 个不同关卡用不超过 5 条命令通关",
    ability: "以最少命令达成目标",
    iconKey: "low-steps",
    color: "#e8a838",
    visualTier: 2,
  },
  {
    id: "mastery_score_300",
    category: "mastery",
    name: "道行三百",
    description: "累计分数达到 300",
    ability: "持续稳定通关积累得分",
    iconKey: "score-300",
    color: "#5eb8d4",
    visualTier: 2,
  },
  {
    id: "mastery_score_600",
    category: "mastery",
    name: "六百功德",
    description: "累计分数达到 600",
    ability: "高分通关形成稳定修行",
    iconKey: "score-600",
    color: "#3a9fb8",
    visualTier: 3,
  },
  {
    id: "mastery_no_fail_5",
    category: "mastery",
    name: "五关无尘",
    description: "连续 5 次通关 attempt 全部命令成功",
    ability: "连续无失误完成挑战",
    iconKey: "no-fail-five",
    color: "#4a6fa5",
    visualTier: 3,
  },
  {
    id: "mastery_recovery_3",
    category: "mastery",
    name: "三劫归真",
    description: "3 次不同通关 attempt 中先失败后通关",
    ability: "从失误中修正并达成目标",
    iconKey: "recovery-three",
    color: "#2fb388",
    visualTier: 3,
  },
  {
    id: "mastery_multi_path_3",
    category: "mastery",
    name: "万法同归",
    description: "3 个不同关卡存在两种不同命令序列通关",
    ability: "同一目标多种解法皆可达成",
    iconKey: "multi-path-three",
    color: "#9b7bd4",
    visualTier: 3,
  },
  {
    id: "mastery_full_clear_plus",
    category: "mastery",
    name: "Git 真君",
    description: "全关卡通关且累计分数达到 600",
    ability: "全通高难路径并保持高评分",
    iconKey: "full-clear-plus",
    color: "#f2bd4b",
    visualTier: 4,
  },
];

/** 全部徽章定义 */
export const ALL_BADGES: BadgeDefinition[] = [
  ...TITLE_BADGES,
  ...COMMAND_BADGES,
  ...RESULT_BADGES,
  ...WORKFLOW_BADGES,
  ...TECHNIQUE_BADGES,
  ...MASTERY_BADGES,
];

/** 段位阶梯 */
export const RANK_TIERS: RankDefinition[] = [
  { id: "bronze", name: "外门弟子", label: "Bronze", minTitleLevel: 1 },
  { id: "silver", name: "内门弟子", label: "Silver", minTitleLevel: 3 },
  { id: "gold", name: "真传弟子", label: "Gold", minTitleLevel: 5 },
  { id: "platinum", name: "执事长老", label: "Platinum", minTitleLevel: 7 },
  { id: "diamond", name: "护宗长老", label: "Diamond", minTitleLevel: 9 },
  { id: "master", name: "Git 宗师", label: "Master", minTitleLevel: 10 },
  { id: "immortal", name: "飞升仙君", label: "Immortal", minTitleLevel: 10 },
];

/**
 * 根据 badgeId 查找定义。
 * 功能：供服务层组装返回 DTO。
 * 参数：badgeId - 徽章 id。
 * 返回值：定义或 undefined。
 */
export function findBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
  return ALL_BADGES.find((item) => item.id === badgeId);
}
