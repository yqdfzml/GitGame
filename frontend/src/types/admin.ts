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
  stats: import("./index").UserStats;
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
    activeTitle: import("./index").ActiveTitle | null;
    rank: import("./index").RankInfo;
    items: import("./index").BadgeItem[];
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

/** 撤销会话结果 */
export interface AdminRevokeSessionsResult {
  revokedCount: number;
}
