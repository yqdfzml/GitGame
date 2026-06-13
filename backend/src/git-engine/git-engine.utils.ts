import type { CommitNode, RepoState } from "./repo-state.types";

/**
 * 深拷贝仓库状态，避免命令执行污染原对象。
 * 功能：为每次命令执行创建独立状态副本。
 * 参数：state - 原始仓库状态。
 * 返回值：新的 RepoState 副本。
 */
export const cloneRepoState = (state: RepoState): RepoState => {
  return JSON.parse(JSON.stringify(state)) as RepoState;
};

/**
 * 生成 7 位短 commit id。
 * 功能：基于现有提交数量和消息生成唯一 id。
 * 参数：state - 当前仓库；message - 提交说明。
 * 返回值：短 hash 字符串。
 */
export const createCommitId = (state: RepoState, message: string): string => {
  const seed = Object.keys(state.commits).length + 1;
  const base = `${seed}${message}`.replace(/\s/g, "");
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(7, "0").slice(0, 7);
};

/**
 * 获取 HEAD 当前指向的 commit id。
 * 功能：解析 branch 或 detached HEAD。
 * 参数：state - 仓库状态。
 * 返回值：commit id，找不到时返回 null。
 */
export const getHeadCommitId = (state: RepoState): string | null => {
  if (state.head.type === "branch") {
    return state.branches[state.head.ref] ?? null;
  }
  return state.head.ref;
};

/**
 * 获取 HEAD 当前 commit 的文件快照。
 * 功能：读取 HEAD 指向提交的文件树。
 * 参数：state - 仓库状态。
 * 返回值：path -> content 映射。
 */
export const getHeadFiles = (state: RepoState): Record<string, string> => {
  const commitId = getHeadCommitId(state);
  if (!commitId) {
    return {};
  }
  return state.commits[commitId]?.files ?? {};
};

/**
 * 根据 HEAD 快照刷新工作区文件 status。
 * 功能：对比 workingTree 与 HEAD 文件树，更新 status 字段。
 * 参数：state - 仓库状态（会被原地修改）。
 * 返回值：无。
 */
export const refreshWorkingTreeStatus = (state: RepoState): void => {
  const headFiles = getHeadFiles(state);
  const allPaths = new Set([...Object.keys(headFiles), ...Object.keys(state.workingTree)]);

  for (const path of allPaths) {
    const headContent = headFiles[path];
    const working = state.workingTree[path];

    if (working === undefined && headContent !== undefined) {
      state.workingTree[path] = { content: headContent, status: "deleted" };
      continue;
    }

    if (working !== undefined && headContent === undefined) {
      state.workingTree[path].status = working.status === "added" ? "added" : "untracked";
      continue;
    }

    if (working !== undefined && headContent !== undefined) {
      state.workingTree[path].status = working.content === headContent ? "unchanged" : "modified";
    }
  }
};

/**
 * 判断工作区是否 clean。
 * 功能：供 status 命令和判题器使用。
 * 参数：state - 仓库状态。
 * 返回值：true 表示工作区干净。
 */
export const isWorkingTreeClean = (state: RepoState): boolean => {
  refreshWorkingTreeStatus(state);
  const hasDirtyFile = Object.values(state.workingTree).some(
    (file) => file.status !== "unchanged",
  );
  const hasConflict = Object.keys(state.conflicts).length > 0;
  return !hasDirtyFile && !hasConflict;
};

/**
 * 判断暂存区是否为空。
 * 功能：供 status 命令和判题器使用。
 * 参数：state - 仓库状态。
 * 返回值：true 表示暂存区无文件。
 */
export const isIndexEmpty = (state: RepoState): boolean => {
  return Object.keys(state.index).length === 0;
};

/**
 * 解析 ref 到 commit id。
 * 功能：支持 HEAD、分支名、短 hash。
 * 参数：state - 仓库；ref - 引用字符串。
 * 返回值：commit id 或 null。
 */
export const resolveRef = (state: RepoState, ref: string): string | null => {
  const normalized = ref.trim();
  if (normalized === "HEAD") {
    return getHeadCommitId(state);
  }
  if (state.branches[normalized]) {
    return state.branches[normalized];
  }
  if (state.commits[normalized]) {
    return normalized;
  }
  const matched = Object.keys(state.commits).find((id) => id.startsWith(normalized));
  return matched ?? null;
};

/**
 * 创建新提交并更新 HEAD/分支指针。
 * 功能：commit 命令的核心逻辑。
 * 参数：state - 仓库；message - 提交说明；parentIds - 父提交列表。
 * 返回值：新 commit id。
 */
export const createCommit = (
  state: RepoState,
  message: string,
  parentIds: string[],
): string => {
  const commitId = createCommitId(state, message);
  const files: Record<string, string> = { ...getHeadFiles(state) };

  for (const [path, content] of Object.entries(state.index)) {
    files[path] = content;
  }

  const commit: CommitNode = {
    id: commitId,
    message,
    parents: parentIds,
    files,
    timestamp: Date.now(),
  };
  state.commits[commitId] = commit;
  state.index = {};
  state.workingTree = {};
  for (const [path, content] of Object.entries(files)) {
    state.workingTree[path] = { content, status: "unchanged" };
  }

  if (state.head.type === "branch") {
    state.branches[state.head.ref] = commitId;
  } else {
    state.head = { type: "detached", ref: commitId };
  }

  return commitId;
};

/**
 * 切换 HEAD 到指定 ref。
 * 功能：checkout/switch 共用逻辑。
 * 参数：state - 仓库；ref - 分支名或 commit id。
 * 返回值：切换结果描述。
 */
export const checkoutRef = (state: RepoState, ref: string): string => {
  const commitId = resolveRef(state, ref);
  if (!commitId) {
    throw new Error(`路径规格 '${ref}' 未匹配到任何已知 ref`);
  }

  if (state.branches[ref]) {
    state.head = { type: "branch", ref };
  } else {
    state.head = { type: "detached", ref: commitId };
  }

  const files = state.commits[commitId]?.files ?? {};
  state.index = {};
  state.conflicts = {};
  state.workingTree = {};
  for (const [path, content] of Object.entries(files)) {
    state.workingTree[path] = { content, status: "unchanged" };
  }

  return state.head.type === "branch"
    ? `已切换到分支 '${ref}'`
    : `HEAD 目前位于 ${commitId}`;
};

/**
 * 判断 ancestor 是否是 commitId 的祖先。
 * 功能：merge 判题、branchMerged 检查使用。
 * 参数：state - 仓库；ancestor - 祖先 commit；commitId - 目标 commit。
 * 返回值：true 表示是祖先关系。
 */
export const isAncestor = (state: RepoState, ancestor: string, commitId: string): boolean => {
  const visited = new Set<string>();
  const stack = [commitId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === ancestor) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    const node = state.commits[current];
    if (!node) {
      continue;
    }
    for (const parent of node.parents) {
      stack.push(parent);
    }
  }
  return false;
};

/**
 * 格式化 git status 输出。
 * 功能：status 命令返回文本。
 * 参数：state - 仓库状态。
 * 返回值：多行 status 文本。
 */
export const formatStatus = (state: RepoState): string => {
  refreshWorkingTreeStatus(state);
  const lines: string[] = [];
  const branchName =
    state.head.type === "branch" ? state.head.ref : `(HEAD detached at ${state.head.ref})`;
  lines.push(`位于分支 ${branchName}`);

  if (Object.keys(state.conflicts).length > 0) {
    lines.push("您有尚未合并的路径。");
  }

  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];

  for (const [path, file] of Object.entries(state.workingTree)) {
    if (file.status === "untracked" || file.status === "added") {
      untracked.push(path);
    } else if (file.status === "modified" || file.status === "deleted") {
      if (state.index[path] !== undefined) {
        staged.push(path);
      } else {
        unstaged.push(path);
      }
    }
  }

  for (const path of Object.keys(state.index)) {
    if (!staged.includes(path) && state.workingTree[path]?.status === "unchanged") {
      staged.push(path);
    }
  }

  if (staged.length > 0) {
    lines.push("要提交的变更：");
    for (const path of staged) {
      lines.push(`  新文件:   ${path}`);
    }
  }

  if (unstaged.length > 0) {
    lines.push("尚未暂存以备提交的变更：");
    for (const path of unstaged) {
      lines.push(`  修改:     ${path}`);
    }
  }

  if (untracked.length > 0) {
    lines.push("未跟踪的文件：");
    for (const path of untracked) {
      lines.push(`  ${path}`);
    }
  }

  if (
    staged.length === 0 &&
    unstaged.length === 0 &&
    untracked.length === 0 &&
    Object.keys(state.conflicts).length === 0
  ) {
    lines.push("无文件要提交，干净的工作区");
  }

  return lines.join("\n");
};

/**
 * 格式化 git log 输出。
 * 功能：log 命令返回文本。
 * 参数：state - 仓库；maxCount - 最多显示条数。
 * 返回值：log 文本。
 */
export const formatLog = (state: RepoState, maxCount = 20): string => {
  const headId = getHeadCommitId(state);
  if (!headId) {
    return "";
  }

  const lines: string[] = [];
  const visited = new Set<string>();
  const stack = [headId];

  while (stack.length > 0 && lines.length < maxCount * 3) {
    const current = stack.pop()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    const node = state.commits[current];
    if (!node) {
      continue;
    }
    lines.push(`commit ${node.id}`);
    lines.push(`    ${node.message}`);
    lines.push("");
    for (const parent of node.parents) {
      stack.push(parent);
    }
  }

  return lines.join("\n").trim();
};

/**
 * 解析用户输入的 Git 命令为 token 数组。
 * 功能：支持引号包裹的参数。
 * 参数：raw - 原始命令字符串。
 * 返回值：tokens 数组。
 */
export const parseCommandTokens = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const tokens: string[] = [];
  let current = "";
  let inQuote: '"' | "'" | null = null;

  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
        tokens.push(current);
        current = "";
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    if (ch === " ") {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current.length > 0) {
    tokens.push(current);
  }

  if (tokens[0]?.toLowerCase() === "git") {
    tokens[0] = "git";
    if (tokens[1]) {
      tokens[1] = tokens[1].toLowerCase();
    }
  }
  return tokens;
};

/** v1 允许的 git 子命令白名单 */
export const ALLOWED_GIT_COMMANDS = new Set([
  "status",
  "add",
  "commit",
  "branch",
  "checkout",
  "switch",
  "log",
  "merge",
  "reset",
  "revert",
  "restore",
]);

/**
 * 校验命令是否在白名单内且格式合法。
 * 功能：安全边界，拒绝 shell 注入和非法命令。
 * 参数：raw - 原始命令；maxLength - 最大长度。
 * 返回值：校验结果。
 */
export const validateCommandInput = (
  raw: string,
  maxLength = 512,
): { valid: boolean; reason?: string; tokens?: string[] } => {
  if (raw.length > maxLength) {
    return { valid: false, reason: "命令长度超过限制" };
  }
  if (raw.includes(";") || raw.includes("|") || raw.includes("&") || raw.includes("`")) {
    return { valid: false, reason: "不允许 shell 元字符" };
  }
  const tokens = parseCommandTokens(raw);
  if (tokens.length === 0) {
    return { valid: false, reason: "命令不能为空" };
  }
  if (tokens[0] !== "git") {
    return { valid: false, reason: "仅允许 git 命令" };
  }
  if (!tokens[1] || !ALLOWED_GIT_COMMANDS.has(tokens[1])) {
    return { valid: false, reason: `不允许的命令: ${tokens[1] ?? "未知"}` };
  }
  if (tokens.length > 20) {
    return { valid: false, reason: "参数数量超过限制" };
  }
  return { valid: true, tokens };
};
