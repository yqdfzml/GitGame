/** 关卡发布状态 */
export type AdminLevelStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** 关卡难度 */
export type AdminLevelDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

/** 管理端关卡列表项 */
export interface AdminLevelItem {
  id: string;
  courseId: string;
  chapterId: string | null;
  title: string;
  description: string;
  difficulty: AdminLevelDifficulty;
  sortOrder: number;
  status: AdminLevelStatus;
  publishedAt: string | null;
  updatedAt: string;
}

/** 关卡 schema 校验结果 */
export interface AdminLevelValidation {
  valid: boolean;
  errors: string[];
}

/** 管理端关卡详情 */
export interface AdminLevelDetail {
  id: string;
  courseId: string;
  chapterId: string | null;
  title: string;
  description: string;
  difficulty: AdminLevelDifficulty;
  sortOrder: number;
  status: AdminLevelStatus;
  publishedAt: string | null;
  initialState: Record<string, unknown>;
  goal: Record<string, unknown>;
  constraints: Record<string, unknown>;
  validation: AdminLevelValidation;
}

/** 关卡编辑表单数据 */
export interface AdminLevelFormData {
  courseId: string;
  chapterId: string;
  title: string;
  description: string;
  difficulty: AdminLevelDifficulty;
  sortOrder: number;
  initialState: Record<string, unknown>;
  goal: Record<string, unknown>;
  constraints: Record<string, unknown>;
}

/** 关卡列表筛选条件 */
export interface AdminLevelListFilters {
  search: string;
  chapterId: string;
  status: string;
  difficulty: string;
}

/** 关卡操作摘要响应 */
export interface AdminLevelActionResult {
  id: string;
  status?: AdminLevelStatus;
  title?: string;
  publishedAt?: string | null;
}

/** 关卡排序更新响应 */
export interface AdminLevelSortResult {
  id: string;
  courseId: string;
  chapterId: string | null;
  sortOrder: number;
}

/** 管理端用户列表项 */
export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
}

/** 管理端用户列表分页结果 */
export interface AdminUserListResult {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 管理端用户列表筛选 */
export interface AdminUserListFilters {
  search: string;
  role: string;
  status: string;
  page: number;
  pageSize: number;
}

/** 管理端用户 attempt 摘要 */
export interface AdminUserAttemptItem {
  id: string;
  levelId: string;
  levelTitle: string;
  status: string;
  stepCount: number;
  startedAt: string;
  completedAt: string | null;
}

/** 管理端用户详情 */
export interface AdminUserDetail {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: import("@shared/types").UserStats;
  wallet: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    currentStreak: number;
    longestStreak: number;
  } | null;
  badges: {
    unlockedCount: number;
    totalCount: number;
    activeTitle: import("@shared/types").ActiveTitle | null;
    rank: import("@shared/types").RankInfo;
    items: import("@shared/types").BadgeItem[];
  };
  recentAttempts: AdminUserAttemptItem[];
  activeSessionCount: number;
}

/** 用户操作结果 */
export interface AdminUserActionResult {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
}

/** 用户编辑提交数据 */
export interface AdminUserUpdatePayload {
  displayName?: string;
  email?: string;
  role?: "USER" | "ADMIN";
  status?: "ACTIVE" | "DISABLED";
}

/** 用户删除结果 */
export interface AdminUserDeleteResult {
  id: string;
  deleted: boolean;
}

/** 撤销会话结果 */
export interface AdminRevokeSessionsResult {
  revokedCount: number;
}

/** 管理端 attempt 列表项 */
export interface AdminAttemptListItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  levelId: string;
  levelTitle: string;
  levelChapterId: string | null;
  status: string;
  stepCount: number;
  startedAt: string;
  completedAt: string | null;
}

/** 管理端 attempt 列表分页结果 */
export interface AdminAttemptListResult {
  items: AdminAttemptListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 管理端 attempt 列表筛选 */
export interface AdminAttemptListFilters {
  search: string;
  levelId: string;
  userId: string;
  status: string;
  page: number;
  pageSize: number;
}

/** 管理端 attempt 命令条目 */
export interface AdminAttemptCommandItem {
  stepIndex: number;
  command: string;
  success: boolean;
  feedback: string | null;
  output: string | null;
  createdAt: string;
}

/** 管理端 attempt 详情 */
export interface AdminAttemptDetail {
  id: string;
  status: string;
  stepCount: number;
  startedAt: string;
  completedAt: string | null;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
  level: {
    id: string;
    title: string;
    chapterId: string | null;
    difficulty: string;
  };
  commands: AdminAttemptCommandItem[];
}

/** 邀请码状态 */
export type AdminInviteStatus = "unused" | "used" | "expired" | "revoked";

/** 管理端邀请码列表项 */
export interface AdminInviteListItem {
  id: string;
  code: string;
  note: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  usedBy: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  status: AdminInviteStatus;
}

/** 创建邀请码参数 */
export interface AdminCreateInvitePayload {
  note?: string;
  expiresAt?: string;
}

/** 邀请码操作结果 */
export interface AdminInviteActionResult {
  id: string;
  code: string;
  note?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  status: AdminInviteStatus;
}

/** Dashboard 统计指标 */
export interface AdminDashboardStats {
  todayRegistrations: number;
  activeUsers: number;
  completionsToday: number;
  failedAttemptsToday: number;
}

/** Dashboard 待处理事项 */
export interface AdminDashboardPending {
  draftLevelCount: number;
  highAbandonLevels: Array<{
    levelId: string;
    levelTitle: string;
    levelStatus: string;
    abandonedCount: number;
  }>;
}

/** Dashboard 概览 */
export interface AdminDashboardOverview {
  stats: AdminDashboardStats;
  pending: AdminDashboardPending;
  recentClears: Array<{
    id: string;
    displayName: string;
    levelTitle: string;
    score: number;
    happenedAt: string;
  }>;
  recentBadgeUnlocks: Array<{
    id: string;
    displayName: string;
    badgeName: string;
    happenedAt: string;
  }>;
}

/** 积分钱包列表项 */
export interface AdminWalletListItem {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
  updatedAt: string;
}

/** 钱包分页结果 */
export interface AdminWalletListResult {
  items: AdminWalletListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 积分流水分页结果 */
export interface AdminLedgerListResult {
  items: Array<{
    id: string;
    userId: string;
    userEmail: string;
    userDisplayName: string;
    delta: number;
    balanceAfter: number;
    reason: string;
    levelId: string | null;
    levelTitle: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

/** 关卡解锁列表项 */
export interface AdminUnlockListItem {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  levelId: string;
  levelTitle: string;
  levelChapterId: string | null;
  cost: number;
  unlockedAt: string;
}

/** 关卡解锁分页结果 */
export interface AdminUnlockListResult {
  items: AdminUnlockListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 徽章定义只读项 */
export interface AdminBadgeDefinitionItem {
  id: string;
  category: string;
  name: string;
  description: string;
  ability: string;
  iconKey: string;
  color: string;
  visualTier: number;
  titleLevel: number | null;
}

/** 管理端排行榜条目 */
export interface AdminLeaderboardItem {
  rank: number;
  userId: string;
  levelId: string;
  levelTitle: string;
  chapterId: string | null;
  displayName: string;
  score: number;
  durationSeconds: number;
  updatedAt: string;
}
