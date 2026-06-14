/** 用户信息 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

/** 关卡解锁状态 */
export type LevelUnlockStatus = "free" | "unlocked" | "completed" | "locked";

/** 关卡分层提示 */
export interface LevelGoalHints {
  concepts: string[];
  directions: string[];
  keyPoints: string[];
  targets: string[];
}

/** 空提示默认值 */
export const EMPTY_LEVEL_GOAL_HINTS: LevelGoalHints = {
  concepts: [],
  directions: [],
  keyPoints: [],
  targets: [],
};

/** 关卡摘要 */
export interface LevelSummary {
  id: string;
  courseId: string;
  chapterId: string | null;
  title: string;
  description: string;
  difficulty: string;
  sortOrder: number;
  unlockCost: number;
  unlockStatus: LevelUnlockStatus;
  canStart: boolean;
}

/** 积分钱包摘要 */
export interface PointWalletSummary {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  lastCheckInDate: string | null;
}

/** 单日解题记录 */
export interface PracticeCalendarDay {
  date: string;
  solveCount: number;
}

/** 近一年解题日历 */
export interface PracticeCalendarResponse {
  startDate: string;
  endDate: string;
  days: PracticeCalendarDay[];
}

/** 关卡解锁结果 */
export interface LevelUnlockResult {
  unlockStatus: LevelUnlockStatus;
  unlockCost: number;
  canStart: boolean;
}

/** 判题差距项 */
export interface JudgeGap {
  key: string;
  message: string;
}

/** 判题结果 */
export interface JudgeResult {
  passed: boolean;
  satisfied: string[];
  gaps: JudgeGap[];
  score: number;
}

/** HEAD 引用 */
export interface HeadRef {
  type: "branch" | "detached";
  ref: string;
}

/** 工作区文件 */
export interface WorkingFile {
  content: string;
  status: string;
}

/** 提交节点 */
export interface CommitNode {
  id: string;
  message: string;
  parents: string[];
  files: Record<string, string>;
  timestamp: number;
}

/** 贮藏栈条目 */
export interface StashEntry {
  /** stash 引用 id，如 stash@{0} */
  id: string;
  /** 贮藏说明 */
  message: string;
  /** 贮藏时的工作区文件快照 */
  workingTree?: Record<string, WorkingFile>;
  /** 贮藏时的暂存区快照 */
  index?: Record<string, string>;
}

/** 仓库状态 */
export interface RepoState {
  commits: Record<string, CommitNode>;
  branches: Record<string, string>;
  head: HeadRef;
  workingTree: Record<string, WorkingFile>;
  index: Record<string, string>;
  conflicts: Record<string, unknown>;
  /** 贮藏栈 */
  stash?: StashEntry[];
}

/** 命令历史条目 */
export interface CommandEntry {
  stepIndex: number;
  command: string;
  success: boolean;
  feedback: string;
  output: string | null;
}

/** 练习会话 */
export interface AttemptDetail {
  id: string;
  levelId: string;
  status: string;
  stepCount: number;
  state: RepoState;
  judge: JudgeResult;
  commands: CommandEntry[];
  /** 开局时的差距项数量，用于进度条从 0% 起算 */
  initialGapCount: number;
  /** 开局时已满足的条件 key */
  initialSatisfiedKeys: string[];
  completedAt?: string | null;
}

/** 命令提交响应 */
export interface CommandResponse {
  success: boolean;
  output: string;
  feedback: string;
  state: RepoState;
  stepCount: number;
  judge: JudgeResult;
  completed: boolean;
  /** 本次通关新解锁的徽章 id */
  newlyUnlockedBadges?: string[];
  /** 通关后下一关信息，含是否已自动解锁 */
  nextLevel?: NextLevelAfterComplete | null;
}

/** 通关后下一关信息 */
export interface NextLevelAfterComplete {
  levelId: string;
  title: string;
  canStart: boolean;
  autoUnlocked: boolean;
  unlockCost: number;
}

/** 当前主线称号 */
export interface ActiveTitle {
  id: string;
  name: string;
  level: number;
  color: string;
  iconKey: string;
  visualTier: number;
}

/** 修炼段位 */
export interface RankInfo {
  id: string;
  name: string;
  label: string;
}

/** 徽章分类 */
export type BadgeCategory =
  | "title"
  | "command"
  | "result"
  | "workflow"
  | "technique"
  | "mastery";

/** 徽章条目 */
export interface BadgeItem {
  id: string;
  category: BadgeCategory;
  name: string;
  description: string;
  ability: string;
  iconKey: string;
  color: string;
  visualTier: number;
  titleLevel?: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

/** 徽章页数据 */
export interface UserBadgesResponse {
  activeTitle: ActiveTitle | null;
  rank: RankInfo;
  badges: BadgeItem[];
  unlockedCount: number;
  totalCount: number;
}

/** 用户最近通关记录 */
export interface RecentLevelResult {
  levelId: string;
  title: string;
  courseId: string;
  score: number;
  durationSeconds: number;
  completedAt: string;
}

/** 用户学习统计 */
export interface UserStats {
  completedLevelCount: number;
  totalScore: number;
  completedLevelIds: string[];
  activeTitle: ActiveTitle | null;
  rank: RankInfo;
  recentResults: RecentLevelResult[];
}

/** 排行榜条目（全局按做题积分） */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  /** 玩家头像 URL，未设置时为 null */
  avatarUrl: string | null;
  practiceScore: number;
  completedLevels: number;
  userId?: string;
}

/** 单关得分排行榜条目（管理端按关卡查询时使用） */
export interface LevelScoreLeaderboardEntry {
  rank: number;
  displayName: string;
  /** 玩家头像 URL，未设置时为 null */
  avatarUrl: string | null;
  userId: string;
  levelId: string;
  levelTitle: string;
  chapterId: string | null;
  score: number;
  durationSeconds: number;
  updatedAt: string;
}

/** 首页动态类型 */
export type HomeActivityType = "level_clear" | "badge_unlock";

/** 首页通关动态 */
export interface HomeActivityItem {
  id: string;
  type: HomeActivityType;
  displayName: string;
  levelTitle: string | null;
  badgeName: string | null;
  score: number | null;
  happenedAt: string;
  message: string;
}

/** 首页概览 */
export interface HomeOverview {
  leaderboard: LeaderboardEntry[];
  activities: HomeActivityItem[];
}
