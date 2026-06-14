/** 用户信息 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

/** 关卡摘要 */
export interface LevelSummary {
  id: string;
  courseId: string;
  chapterId: string | null;
  title: string;
  description: string;
  difficulty: string;
  sortOrder: number;
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

/** 仓库状态 */
export interface RepoState {
  commits: Record<string, CommitNode>;
  branches: Record<string, string>;
  head: HeadRef;
  workingTree: Record<string, WorkingFile>;
  index: Record<string, string>;
  conflicts: Record<string, unknown>;
  /** 贮藏栈 */
  stash?: Array<{ id: string; message: string }>;
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

/** 徽章条目 */
export interface BadgeItem {
  id: string;
  category: "title" | "command" | "result";
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

/** 用户学习统计 */
export interface UserStats {
  completedLevelCount: number;
  totalScore: number;
  completedLevelIds: string[];
  activeTitle: ActiveTitle | null;
  rank: RankInfo;
}

/** 排行榜条目 */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  durationSeconds: number;
  levelId: string;
}
