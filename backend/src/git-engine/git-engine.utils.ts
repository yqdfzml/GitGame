import type { CommitNode, RepoState } from "./repo-state.types";

/**
 * 深拷贝仓库状态，避免命令执行污染原对象。
 * 功能：为每次命令执行创建独立状态副本。
 * 参数：state - 原始仓库状态。
 * 返回值：新的 RepoState 副本。
 */
export const cloneRepoState = (state: RepoState): RepoState => {
  const cloned = JSON.parse(JSON.stringify(state)) as RepoState;
  if (!cloned.stash) {
    cloned.stash = [];
  }
  if (!cloned.tags) {
    cloned.tags = {};
  }
  if (!cloned.reflog) {
    cloned.reflog = [];
  }
  if (!cloned.config) {
    cloned.config = {};
  }
  if (cloned.initialized === undefined) {
    cloned.initialized = true;
  }
  if (!cloned.remotes) {
    cloned.remotes = {};
  }
  if (!cloned.remoteTracking) {
    cloned.remoteTracking = {};
  }
  if (!cloned.cloneSources) {
    cloned.cloneSources = {};
  }
  return cloned;
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
 * 解析 git restore 的路径参数，支持 . 展开为具体文件。
 * 功能：按 --staged / --worktree 标志收集需要处理的文件路径。
 * 参数：state - 仓库状态；pathArgs - 非选项参数；restoreStaged - 是否恢复暂存区；restoreWorktree - 是否恢复工作区。
 * 返回值：需要 restore 的文件路径列表。
 */
export const resolveRestorePaths = (
  state: RepoState,
  pathArgs: string[],
  restoreStaged: boolean,
  restoreWorktree: boolean,
): string[] => {
  refreshWorkingTreeStatus(state);
  const headFiles = getHeadFiles(state);
  const useAllPaths = pathArgs.length === 0 || pathArgs.includes(".");

  if (!useAllPaths) {
    return pathArgs;
  }

  const paths = new Set<string>();

  if (restoreStaged) {
    const indexPaths = Object.keys(state.index);
    if (indexPaths.length > 0) {
      for (const path of indexPaths) {
        paths.add(path);
      }
    } else {
      for (const path of Object.keys(headFiles)) {
        paths.add(path);
      }
    }
  }

  if (restoreWorktree) {
    for (const path of Object.keys(headFiles)) {
      paths.add(path);
    }
    for (const [path, file] of Object.entries(state.workingTree)) {
      if (file.status !== "unchanged") {
        paths.add(path);
      }
    }
  }

  return [...paths];
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
  const headParentMatch = normalized.match(/^HEAD~(\d+)$/);
  if (headParentMatch) {
    let current = getHeadCommitId(state);
    const steps = Number(headParentMatch[1]);
    for (let i = 0; i < steps && current; i += 1) {
      current = state.commits[current]?.parents[0] ?? null;
    }
    return current;
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

  // 提交前备份工作区，后续恢复未纳入本次提交的本地改动
  const previousWorkingTree = JSON.parse(JSON.stringify(state.workingTree)) as RepoState["workingTree"];

  const commit: CommitNode = {
    id: commitId,
    message,
    parents: parentIds,
    files,
    timestamp: Date.now(),
  };
  state.commits[commitId] = commit;
  state.index = {};
  state.conflicts = {};
  state.merging = undefined;
  state.workingTree = {};
  for (const [path, content] of Object.entries(files)) {
    state.workingTree[path] = { content, status: "unchanged" };
  }

  // 只提交部分文件时，未暂存文件的本地修改应保留在工作区
  for (const [path, file] of Object.entries(previousWorkingTree)) {
    const committedContent = files[path];
    if (committedContent === undefined) {
      state.workingTree[path] = { ...file };
      continue;
    }
    if (file.content !== committedContent) {
      state.workingTree[path] = { content: file.content, status: "modified" };
    }
  }
  refreshWorkingTreeStatus(state);

  if (state.head.type === "branch") {
    state.branches[state.head.ref] = commitId;
  } else {
    state.head = { type: "detached", ref: commitId };
  }

  appendReflog(state, commitId, `commit: ${message}`);
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

  // 切换分支前检查工作区与暂存区，避免无声丢失修改
  const targetBranch = state.branches[ref] ? ref : null;
  const currentBranch = state.head.type === "branch" ? state.head.ref : null;
  if (targetBranch && currentBranch && targetBranch !== currentBranch) {
    refreshWorkingTreeStatus(state);
    const hasDirtyWorkingTree = !isWorkingTreeClean(state);
    const hasStagedChanges = !isIndexEmpty(state);
    if (hasDirtyWorkingTree || hasStagedChanges) {
      throw new Error("请先提交或贮藏您的修改，再切换分支");
    }
  }

  if (state.branches[ref]) {
    state.head = { type: "branch", ref };
  } else {
    state.head = { type: "detached", ref: commitId };
  }

  const files = state.commits[commitId]?.files ?? {};
  state.index = {};
  state.conflicts = {};
  state.merging = undefined;
  state.workingTree = {};
  for (const [path, content] of Object.entries(files)) {
    state.workingTree[path] = { content, status: "unchanged" };
  }

  appendReflog(state, commitId, `checkout: ${ref}`);
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
 * 查找两个提交的最近公共祖先（merge-base）。
 * 功能：三方合并时获取 base 版本内容。
 * 参数：state - 仓库；commitA/commitB - 两个提交 id。
 * 返回值：公共祖先 commit id，找不到时返回 null。
 */
export const findMergeBase = (
  state: RepoState,
  commitA: string,
  commitB: string,
): string | null => {
  const ancestorsA = new Set<string>();
  const stackA = [commitA];
  while (stackA.length > 0) {
    const current = stackA.pop()!;
    if (ancestorsA.has(current)) continue;
    ancestorsA.add(current);
    const node = state.commits[current];
    if (!node) continue;
    for (const parent of node.parents) {
      stackA.push(parent);
    }
  }

  const stackB = [commitB];
  const visitedB = new Set<string>();
  while (stackB.length > 0) {
    const current = stackB.pop()!;
    if (visitedB.has(current)) continue;
    visitedB.add(current);
    if (ancestorsA.has(current)) {
      return current;
    }
    const node = state.commits[current];
    if (!node) continue;
    for (const parent of node.parents) {
      stackB.push(parent);
    }
  }
  return null;
};

/**
 * 尝试按行合并两个文件版本。
 * 功能：当双方修改不同行时自动合并，同行冲突则返回 null。
 * 参数：base/ours/theirs - 三个版本的全文。
 * 返回值：合并结果，无法自动合并时返回 null。
 */
export const tryLineMerge = (
  base: string,
  ours: string,
  theirs: string,
): string | null => {
  const baseLines = base.split("\n");
  const ourLines = ours.split("\n");
  const theirLines = theirs.split("\n");
  const maxLen = Math.max(baseLines.length, ourLines.length, theirLines.length);
  const merged: string[] = [];

  for (let i = 0; i < maxLen; i += 1) {
    const baseLine = baseLines[i] ?? "";
    const ourLine = ourLines[i] ?? baseLine;
    const theirLine = theirLines[i] ?? baseLine;
    const ourChanged = ourLine !== baseLine;
    const theirChanged = theirLine !== baseLine;

    if (ourChanged && theirChanged && ourLine !== theirLine) {
      return null;
    }
    if (ourChanged) {
      merged.push(ourLine);
    } else if (theirChanged) {
      merged.push(theirLine);
    } else {
      merged.push(baseLine);
    }
  }

  return merged.join("\n");
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
 * 格式化 git diff 输出（工作区相对 HEAD 或暂存区相对 HEAD）。
 * 功能：只读展示改动，供 diff 关卡教学使用。
 * 参数：state - 仓库状态；cached - true 时比较暂存区与 HEAD。
 * 返回值：diff 文本，无改动时返回空字符串。
 */
export const formatDiff = (state: RepoState, cached = false): string => {
  refreshWorkingTreeStatus(state);
  const headFiles = getHeadFiles(state);
  const lines: string[] = [];

  if (cached) {
    for (const [path, stagedContent] of Object.entries(state.index)) {
      const headContent = headFiles[path] ?? "";
      if (stagedContent !== headContent) {
        lines.push(`diff --git a/${path} b/${path}`);
        lines.push(`--- a/${path}`);
        lines.push(`+++ b/${path}`);
        lines.push(`- ${headContent}`);
        lines.push(`+ ${stagedContent}`);
      }
    }
    return lines.join("\n");
  }

  for (const [path, file] of Object.entries(state.workingTree)) {
    if (file.status === "modified" || file.status === "added") {
      const headContent = headFiles[path] ?? "";
      if (file.content !== headContent) {
        lines.push(`diff --git a/${path} b/${path}`);
        lines.push(`--- a/${path}`);
        lines.push(`+++ b/${path}`);
        lines.push(`- ${headContent}`);
        lines.push(`+ ${file.content}`);
      }
    }
  }

  return lines.join("\n");
};

/**
 * 将工作区与暂存区重置为 HEAD 快照。
 * 功能：stash 贮藏后或 hard reset 时恢复干净工作区。
 * 参数：state - 仓库状态（会被原地修改）。
 * 返回值：无。
 */
export const resetWorkingTreeToHead = (state: RepoState): void => {
  const headFiles = getHeadFiles(state);
  state.workingTree = {};
  for (const [path, content] of Object.entries(headFiles)) {
    state.workingTree[path] = { content, status: "unchanged" };
  }
  state.index = {};
  state.conflicts = {};
};

/**
 * 判断是否存在未提交的本地变更。
 * 功能：供 stash 与切换分支前的守卫逻辑使用。
 * 参数：state - 仓库状态。
 * 返回值：true 表示有变更可贮藏。
 */
export const hasLocalChanges = (state: RepoState): boolean => {
  refreshWorkingTreeStatus(state);
  const hasDirtyWorkingTree = Object.values(state.workingTree).some(
    (file) => file.status !== "unchanged",
  );
  const hasStagedChanges = Object.keys(state.index).length > 0;
  return hasDirtyWorkingTree || hasStagedChanges;
};

/**
 * 记录 reflog 条目。
 * 功能：在分支指针移动时留下可追溯记录。
 * 参数：state - 仓库；commitId - 新指针；message - 操作说明。
 * 返回值：无。
 */
export const appendReflog = (state: RepoState, commitId: string, message: string): void => {
  if (!state.reflog) {
    state.reflog = [];
  }
  const branchName = state.head.type === "branch" ? state.head.ref : "HEAD";
  state.reflog.unshift({ commitId, message, branch: branchName });
  if (state.reflog.length > 50) {
    state.reflog.pop();
  }
};

/**
 * 收集从 base 到 tip 的提交链（不含 base，含 tip）。
 * 功能：rebase 时确定需要重放的提交列表。
 * 参数：state - 仓库；baseId - 基底提交；tipId - 分支顶端。
 * 返回值：从旧到新的 commit id 数组。
 */
export const collectCommitsAfter = (
  state: RepoState,
  baseId: string,
  tipId: string,
): string[] => {
  const chain: string[] = [];
  const visited = new Set<string>();
  const stack = [tipId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current) || current === baseId) {
      continue;
    }
    visited.add(current);
    chain.push(current);
    const node = state.commits[current];
    if (!node) {
      continue;
    }
    for (const parent of node.parents) {
      stack.push(parent);
    }
  }
  return chain.reverse();
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

/**
 * 查找 echo 命令中用于重定向的 > 位置（忽略引号内字符）。
 * 功能：定位 echo content > path 的分隔符，避免把引号里的 > 误判为重定向。
 * 参数：raw - 原始命令字符串。
 * 返回值：> 的索引；未找到或遇到 >> 时返回 -1。
 */
const findEchoRedirectIndex = (raw: string): number => {
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (ch === ">" && !inDoubleQuote && !inSingleQuote) {
      if (raw[i + 1] === ">") {
        return -1;
      }
      return i;
    }
  }

  return -1;
};

/**
 * 解析 echo 命令的内容参数。
 * 功能：支持带引号与不带引号的 echo 文本。
 * 参数：contentRaw - echo 与 > 之间的文本。
 * 返回值：解析后的文件内容；格式非法时返回 null。
 */
const parseEchoContent = (contentRaw: string): string | null => {
  if (contentRaw.length === 0) {
    return "";
  }

  const firstChar = contentRaw[0];
  if (firstChar === '"') {
    const closingQuoteIndex = contentRaw.indexOf('"', 1);
    if (closingQuoteIndex < 0) {
      return null;
    }
    if (contentRaw.slice(closingQuoteIndex + 1).trim().length > 0) {
      return null;
    }
    return contentRaw.slice(1, closingQuoteIndex);
  }

  if (firstChar === "'") {
    const closingQuoteIndex = contentRaw.indexOf("'", 1);
    if (closingQuoteIndex < 0) {
      return null;
    }
    if (contentRaw.slice(closingQuoteIndex + 1).trim().length > 0) {
      return null;
    }
    return contentRaw.slice(1, closingQuoteIndex);
  }

  return contentRaw;
};

/**
 * 校验练习终端允许写入的工作区文件路径。
 * 功能：阻止路径穿越与绝对路径，避免借 echo 越权写文件。
 * 参数：path - 目标文件路径。
 * 返回值：非法时返回错误文案；合法时返回 null。
 */
export const validateWorkspaceFilePath = (path: string): string | null => {
  if (path.length === 0) {
    return "缺少目标文件路径";
  }
  if (path.length > 120) {
    return "文件路径过长";
  }
  if (path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:/.test(path)) {
    return "不支持绝对路径";
  }
  if (path.includes("..")) {
    return "不允许路径穿越";
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path)) {
    return "文件路径包含非法字符";
  }
  return null;
};

/**
 * 解析 echo 重定向写文件命令（练习专用）。
 * 功能：识别 echo "content" > path，供虚拟终端新建或覆盖工作区文件。
 * 参数：raw - 用户输入的原始命令。
 * 返回值：解析成功返回内容与路径；非 echo 命令返回 null；格式非法返回 error。
 */
export const parseEchoWriteCommand = (
  raw: string,
): { content: string; path: string } | { error: string } | null => {
  const trimmed = raw.trim();
  if (!/^echo\s+/i.test(trimmed)) {
    return null;
  }

  const redirectIndex = findEchoRedirectIndex(trimmed);
  if (redirectIndex < 0) {
    return { error: "echo 命令需使用 > 重定向到文件路径" };
  }

  const leftPart = trimmed.slice(0, redirectIndex).trim();
  const pathPart = trimmed.slice(redirectIndex + 1).trim();
  const pathError = validateWorkspaceFilePath(pathPart);
  if (pathError) {
    return { error: pathError };
  }

  const contentMatch = leftPart.match(/^echo\s+([\s\S]*)$/i);
  if (!contentMatch) {
    return { error: "echo 命令格式不正确" };
  }

  const content = parseEchoContent(contentMatch[1].trim());
  if (content === null) {
    return { error: "无法解析 echo 内容，请检查引号是否成对" };
  }

  return { content, path: pathPart };
};

/**
 * 向虚拟工作区写入文件内容。
 * 功能：新建未跟踪文件或覆盖已跟踪文件，供 echo 重定向使用。
 * 参数：state - 仓库状态；path - 文件路径；content - 文件内容。
 * 返回值：无。
 */
export const writeWorkingTreeFile = (state: RepoState, path: string, content: string): void => {
  const headFiles = getHeadFiles(state);
  const inHead = headFiles[path] !== undefined;
  state.workingTree[path] = {
    content,
    status: inHead ? "modified" : "untracked",
  };
  refreshWorkingTreeStatus(state);
};

/**
 * 判断文本是否仍含 Git 冲突标记。
 * 功能：保存冲突文件前校验玩家是否已手动清理标记行。
 * 参数：content - 待写入的文件全文。
 * 返回值：true 表示仍含冲突标记。
 */
export const hasConflictMarkers = (content: string): boolean => {
  return content.includes("<<<<<<<")
    || content.includes("=======")
    || content.includes(">>>>>>>");
};

/**
 * 将玩家编辑后的内容写入冲突文件并清除冲突状态。
 * 功能：更新工作区、移除 conflicts 记录，后续仍需 git add。
 * 参数：state - 仓库状态；path - 冲突文件路径；content - 解决后的全文。
 * 返回值：无；文件不存在冲突或仍含标记时抛出 Error。
 */
export const resolveConflictFile = (state: RepoState, path: string, content: string): void => {
  if (!state.conflicts[path]) {
    throw new Error(`文件 '${path}' 当前没有冲突`);
  }
  if (hasConflictMarkers(content)) {
    throw new Error("内容仍包含冲突标记，请删除 <<<<<<< / ======= / >>>>>>> 后再保存");
  }
  const headFiles = getHeadFiles(state);
  const inHead = headFiles[path] !== undefined;
  state.workingTree[path] = {
    content,
    status: inHead ? "modified" : "untracked",
  };
  delete state.conflicts[path];
  refreshWorkingTreeStatus(state);
};

/**
 * touch 工作区文件（练习专用）。
 * 功能：新建空文件；已存在且未删除的文件保持原内容不变。
 * 参数：state - 仓库状态；path - 目标文件路径。
 * 返回值：无。
 */
export const touchWorkingTreeFile = (state: RepoState, path: string): void => {
  refreshWorkingTreeStatus(state);
  const headFiles = getHeadFiles(state);
  const headContent = headFiles[path];
  const existing = state.workingTree[path];

  if (existing && existing.status !== "deleted") {
    refreshWorkingTreeStatus(state);
    return;
  }

  if (headContent !== undefined) {
    state.workingTree[path] = { content: "", status: "modified" };
    refreshWorkingTreeStatus(state);
    return;
  }

  state.workingTree[path] = { content: "", status: "untracked" };
  refreshWorkingTreeStatus(state);
};

/**
 * 解析 touch 新建文件命令（练习专用）。
 * 功能：识别 touch path [path...]，供 macOS/Linux 用户创建空文件。
 * 参数：raw - 用户输入的原始命令。
 * 返回值：解析成功返回路径列表；非 touch 命令返回 null；格式非法返回 error。
 */
export const parseTouchCommand = (
  raw: string,
): { paths: string[] } | { error: string } | null => {
  const trimmed = raw.trim();
  if (!/^touch(\s|$)/i.test(trimmed)) {
    return null;
  }

  const tokens = parseCommandTokens(trimmed);
  if (tokens.length === 0 || tokens[0].toLowerCase() !== "touch") {
    return null;
  }

  const paths: string[] = [];
  for (const token of tokens.slice(1)) {
    if (token.startsWith("-")) {
      continue;
    }
    const pathError = validateWorkspaceFilePath(token);
    if (pathError) {
      return { error: pathError };
    }
    paths.push(token);
  }

  if (paths.length === 0) {
    return { error: "touch 需要指定文件路径" };
  }

  return { paths };
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
  "stash",
  "cherry-pick",
  "tag",
  "show",
  "reflog",
  "rebase",
  "bisect",
  "diff",
  "config",
  "init",
  "clone",
  "remote",
  "fetch",
  "pull",
  "push",
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
    return { valid: false, reason: "仅允许 git 命令、echo 写文件或 touch 新建文件" };
  }
  if (!tokens[1] || !ALLOWED_GIT_COMMANDS.has(tokens[1])) {
    return { valid: false, reason: `不允许的命令: ${tokens[1] ?? "未知"}` };
  }
  if (tokens.length > 20) {
    return { valid: false, reason: "参数数量超过限制" };
  }
  return { valid: true, tokens };
};
