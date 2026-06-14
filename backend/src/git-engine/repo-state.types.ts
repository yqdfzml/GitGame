/**
 * 仓库状态类型定义。
 * 功能：描述虚拟 Git 仓库的完整快照结构。
 */

/** 单个提交节点 */
export interface CommitNode {
  /** 提交哈希（短 hash） */
  id: string;
  /** 提交说明 */
  message: string;
  /** 父提交 id 列表，普通提交 1 个，merge 提交 2 个 */
  parents: string[];
  /** 该提交快照中的文件内容 */
  files: Record<string, string>;
  /** 提交时间戳（毫秒） */
  timestamp: number;
}

/** HEAD 指向类型 */
export interface HeadRef {
  /** branch=分支名，detached=游离提交 id */
  type: "branch" | "detached";
  /** 分支名或提交 id */
  ref: string;
}

/** 工作区文件状态 */
export interface WorkingFile {
  /** 文件内容 */
  content: string;
  /** 相对当前 HEAD 的状态 */
  status: "unchanged" | "modified" | "deleted" | "untracked" | "added";
}

/** 冲突文件信息 */
export interface ConflictFile {
  /** 共同祖先内容 */
  base: string;
  /** 当前分支内容 */
  ours: string;
  /** 合并分支内容 */
  theirs: string;
}

/** stash 条目，保存被贮藏的工作区与暂存区快照 */
export interface StashEntry {
  /** stash 引用 id，如 stash@{0} */
  id: string;
  /** 贮藏说明 */
  message: string;
  /** 贮藏时的工作区文件 */
  workingTree: Record<string, WorkingFile>;
  /** 贮藏时的暂存区 */
  index: Record<string, string>;
}

/** 虚拟 Git 仓库完整状态 */
export interface RepoState {
  /** 所有提交，key 为 commit id */
  commits: Record<string, CommitNode>;
  /** 分支名 -> 最新 commit id */
  branches: Record<string, string>;
  /** 当前 HEAD 指向 */
  head: HeadRef;
  /** 工作区文件 */
  workingTree: Record<string, WorkingFile>;
  /** 暂存区 path -> content */
  index: Record<string, string>;
  /** 未解决冲突 */
  conflicts: Record<string, ConflictFile>;
  /** 贮藏栈，最新条目在数组末尾 */
  stash: StashEntry[];
  /** 进行中的合并操作，冲突解决后 commit 时用于生成双父提交 */
  merging?: { branch: string; commitId: string };
  /** 标签名 -> commit id */
  tags: Record<string, string>;
  /** HEAD 引用日志，用于找回丢失提交 */
  reflog: ReflogEntry[];
  /** 进行中的 rebase 操作 */
  rebasing?: {
    /** 目标基底 commit id */
    onto: string;
    /** 待重放的提交 id 列表 */
    commits: string[];
    /** 当前重放进度索引 */
    index: number;
    /** 原分支名 */
    branch: string;
    /** 重放前的分支顶端 */
    originalTip: string;
  };
  /** 进行中的 bisect 操作 */
  bisect?: {
    /** 已知良好 commit id */
    goodId: string;
    /** 已知不良 commit id */
    badId: string;
    /** 当前检出的 commit id */
    currentId: string;
    /** 已定位的首个不良 commit id */
    foundBadId?: string;
  };
}

/** reflog 条目 */
export interface ReflogEntry {
  /** 操作后的 commit id */
  commitId: string;
  /** 操作说明 */
  message: string;
  /** 关联分支名 */
  branch: string;
}

/** 命令执行结果 */
export interface CommandResult {
  /** 是否执行成功 */
  success: boolean;
  /** 终端输出文本 */
  output: string;
  /** 给用户的中文反馈 */
  feedback: string;
  /** 推进后的仓库状态（失败时保持原状态） */
  state: RepoState;
}

/** 关卡目标定义 */
export interface LevelGoal {
  /** 期望当前分支名 */
  currentBranch?: string;
  /** 指定分支应包含的 commit id */
  branchContains?: Array<{ branch: string; commit: string }>;
  /** 指定分支不应包含的 commit id */
  branchNotContains?: Array<{ branch: string; commit: string }>;
  /** 分支指针必须指向的 commit id */
  branchHeads?: Record<string, string>;
  /** 指定分支 HEAD 提交中的期望文件内容 */
  branchFileContents?: Record<string, Record<string, string>>;
  /** HEAD 提交中期望的文件内容 */
  fileContents?: Record<string, string>;
  /** HEAD 提交中不应存在的文件 */
  filesAbsentFromHead?: string[];
  /** 工作区中期望的文件内容 */
  workingTreeContents?: Record<string, string>;
  /** 必须保持未跟踪状态的文件路径 */
  untrackedFiles?: string[];
  /** 暂存区中期望的文件内容 */
  indexContents?: Record<string, string>;
  /** 工作区是否 clean */
  workingTreeClean?: boolean;
  /** 暂存区是否 empty */
  indexEmpty?: boolean;
  /** 是否不允许冲突 */
  noConflicts?: boolean;
  /** 必须仍然存在的 commit id */
  commitsExist?: string[];
  /** source 分支已合并到 target */
  branchMerged?: Array<{ source: string; target: string }>;
  /** HEAD 提交必须是 merge commit（两个父提交） */
  mergeCommitRequired?: boolean;
  /** 贮藏栈中必须保存的工作区内容 */
  stashContents?: Record<string, string>;
  /** 标签必须指向的 commit id */
  requiredTags?: Record<string, string>;
  /** bisect 必须定位到的不良 commit id */
  bisectFound?: string;
  /** 分支必须不存在（用于验证误删分支已恢复等场景） */
  branchMustNotExist?: string[];
}

/** 关卡约束 */
export interface LevelConstraints {
  /** 最大命令步数 */
  maxSteps?: number;
  /** 通关基础分 */
  baseScore?: number;
  /** 每多一步扣分 */
  stepPenalty?: number;
  /** 最少执行命令步数，观察型关卡用于防止开局即通关 */
  minSteps?: number;
}

/** 判题结果 */
export interface JudgeResult {
  /** 是否达成目标 */
  passed: boolean;
  /** 已满足的目标项 */
  satisfied: string[];
  /** 未满足的目标项及原因 */
  gaps: Array<{ key: string; message: string }>;
  /** 计算得分 */
  score: number;
}

/** 关卡 JSON 完整结构 */
export interface LevelConfig {
  initialState: RepoState;
  goal: LevelGoal;
  constraints: LevelConstraints;
}
