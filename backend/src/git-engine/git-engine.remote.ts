import type { RemoteRepo, RepoState } from "./repo-state.types";
import {
  checkoutRef,
  cloneRepoState,
  createCommit,
  findMergeBase,
  getHeadCommitId,
  getHeadFiles,
  isAncestor,
  refreshWorkingTreeStatus,
  resetWorkingTreeToHead,
  tryLineMerge,
} from "./git-engine.utils";

/**
 * 判断仓库是否已初始化。
 * 功能：未 init 时只允许 config / init / clone。
 * 参数：state - 仓库状态。
 * 返回值：是否已初始化。
 */
export const isRepoInitialized = (state: RepoState): boolean => {
  return state.initialized !== false;
};

/**
 * 未初始化仓库时的拒绝结果文案。
 * 功能：统一提示玩家先 git init 或 git clone。
 * 返回值：错误说明字符串。
 */
export const notInitializedMessage = (): string => {
  return "当前目录还不是 Git 仓库，请先 git init 或 git clone";
};

/**
 * 把远程提交合并进本地 commits 字典（不改动分支与工作区）。
 * 功能：fetch 后本地可解析 origin/* 引用。
 * 参数：state - 本地仓库；remote - 远程快照。
 * 返回值：无。
 */
export const mergeRemoteCommitsIntoLocal = (state: RepoState, remote: RemoteRepo): void => {
  for (const [commitId, commit] of Object.entries(remote.commits)) {
    if (!state.commits[commitId]) {
      state.commits[commitId] = cloneRepoState({ commits: { [commitId]: commit } } as RepoState).commits[commitId];
    }
  }
};

/**
 * 更新 remoteTracking 中 origin/* 指针。
 * 功能：模拟 git fetch 更新远程跟踪分支。
 * 参数：state - 仓库状态；remoteName - 远程名；remote - 远程快照。
 * 返回值：无。
 */
export const syncRemoteTrackingRefs = (
  state: RepoState,
  remoteName: string,
  remote: RemoteRepo,
): void => {
  if (!state.remoteTracking) {
    state.remoteTracking = {};
  }
  for (const [branch, commitId] of Object.entries(remote.branches)) {
    state.remoteTracking[`${remoteName}/${branch}`] = commitId;
  }
};

/**
 * 解析 remote/branch 形式的引用。
 * 功能：pull / merge origin/main 时使用。
 * 参数：state - 仓库状态；ref - 如 origin/main。
 * 返回值：commit id 或 null。
 */
export const resolveRemoteTrackingRef = (state: RepoState, ref: string): string | null => {
  if (state.remoteTracking?.[ref]) {
    return state.remoteTracking[ref];
  }
  const slashIndex = ref.indexOf("/");
  if (slashIndex <= 0) {
    return null;
  }
  const remoteName = ref.slice(0, slashIndex);
  const branchName = ref.slice(slashIndex + 1);
  const remote = state.remotes?.[remoteName];
  if (!remote) {
    return null;
  }
  return remote.branches[branchName] ?? null;
};

/**
 * 将远程仓库快照复制到本地（git clone）。
 * 功能：创建本地 main 分支、写入 commits、登记 origin 远程。
 * 参数：state - 目标本地状态；source - 远程源快照；remoteName - 默认 origin。
 * 返回值：无。
 */
export const applyCloneSource = (
  state: RepoState,
  source: RemoteRepo,
  remoteName = "origin",
): void => {
  state.initialized = true;
  state.commits = JSON.parse(JSON.stringify(source.commits));
  state.branches = JSON.parse(JSON.stringify(source.branches));
  state.tags = {};
  state.stash = [];
  state.reflog = [];
  state.index = {};
  state.conflicts = {};
  state.workingTree = {};
  state.merging = undefined;
  state.rebasing = undefined;
  state.bisect = undefined;

  const defaultBranch = source.branches.main
    ? "main"
    : Object.keys(source.branches)[0] ?? "main";
  state.head = { type: "branch", ref: defaultBranch };

  const headFiles = getHeadFiles(state);
  for (const [path, content] of Object.entries(headFiles)) {
    state.workingTree[path] = { content, status: "unchanged" };
  }

  state.remotes = {
    [remoteName]: JSON.parse(JSON.stringify(source)),
  };
  syncRemoteTrackingRefs(state, remoteName, source);
};

/**
 * 执行 fetch：只更新远程跟踪分支，不修改当前工作区与本地分支。
 * 功能：模拟 git fetch origin。
 * 参数：state - 仓库状态；remoteName - 远程名。
 * 返回值：成功时的说明文本；失败时抛出 Error。
 */
export const runFetch = (state: RepoState, remoteName: string): string => {
  const remote = state.remotes?.[remoteName];
  if (!remote) {
    throw new Error(`远程 '${remoteName}' 不存在`);
  }
  mergeRemoteCommitsIntoLocal(state, remote);
  syncRemoteTrackingRefs(state, remoteName, remote);
  const branchCount = Object.keys(remote.branches).length;
  return `来自 ${remote.url}\n * [已更新 ${branchCount} 个远程分支]`;
};

/**
 * 执行 push：将本地分支同步到远程，远端领先时拒绝。
 * 功能：模拟 git push origin main。
 * 参数：state - 仓库状态；remoteName - 远程名；branchName - 分支名。
 * 返回值：成功时的输出文本；失败时抛出 Error。
 */
export const runPush = (state: RepoState, remoteName: string, branchName: string): string => {
  const remote = state.remotes?.[remoteName];
  if (!remote) {
    throw new Error(`远程 '${remoteName}' 不存在`);
  }
  const localTip = state.branches[branchName];
  if (!localTip) {
    throw new Error(`本地分支 '${branchName}' 不存在`);
  }
  const remoteTip = remote.branches[branchName];
  if (remoteTip && remoteTip !== localTip && !isAncestor(state, remoteTip, localTip)) {
    throw new Error(
      `[rejected] ${branchName} -> ${branchName} (fetch first)\n` +
        "hint: 远程包含本地没有的提交，请先 git pull 或 git fetch",
    );
  }
  remote.branches[branchName] = localTip;
  mergeRemoteCommitsIntoLocal(state, remote);
  if (!state.remoteTracking) {
    state.remoteTracking = {};
  }
  state.remoteTracking[`${remoteName}/${branchName}`] = localTip;
  return `${branchName} -> ${branchName} (${localTip})`;
};

/**
 * 将 origin 上的分支合并到当前分支（pull 的 merge 阶段）。
 * 功能：在 fetch 之后把 remoteTracking 指向的提交合入 HEAD 分支。
 * 参数：state - 仓库状态；remoteRef - 如 origin/main。
 * 返回值：合并结果说明；失败时抛出 Error。
 */
export const mergeRemoteIntoCurrentBranch = (state: RepoState, remoteRef: string): string => {
  const remoteCommitId = resolveRemoteTrackingRef(state, remoteRef);
  if (!remoteCommitId) {
    throw new Error(`无法解析远程引用 '${remoteRef}'`);
  }
  if (state.head.type !== "branch") {
    throw new Error("不能在 detached HEAD 上 pull");
  }
  const currentBranch = state.head.ref;
  const currentTip = state.branches[currentBranch];
  if (!currentTip) {
    throw new Error(`分支 '${currentBranch}' 不存在`);
  }
  if (currentTip === remoteCommitId) {
    return "已经是最新。";
  }
  if (isAncestor(state, remoteCommitId, currentTip)) {
    return "已经是最新。";
  }
  if (isAncestor(state, currentTip, remoteCommitId)) {
    state.branches[currentBranch] = remoteCommitId;
    checkoutRef(state, currentBranch);
    return "Fast-forward";
  }

  const ours = state.commits[currentTip].files;
  const theirs = state.commits[remoteCommitId].files;
  const mergeBaseId = findMergeBase(state, currentTip, remoteCommitId);
  const baseFiles = mergeBaseId ? state.commits[mergeBaseId]?.files ?? {} : ours;
  const allPaths = new Set([...Object.keys(ours), ...Object.keys(theirs)]);
  state.conflicts = {};
  const mergedFiles: Record<string, string> = { ...ours };

  for (const path of allPaths) {
    const ourContent = ours[path];
    const theirContent = theirs[path];
    const baseContent = baseFiles[path] ?? "";

    if (ourContent === theirContent) {
      if (ourContent !== undefined) {
        mergedFiles[path] = ourContent;
      }
      continue;
    }

    if (ourContent !== undefined && theirContent !== undefined) {
      const lineMerged = tryLineMerge(baseContent, ourContent, theirContent);
      if (lineMerged !== null) {
        mergedFiles[path] = lineMerged;
        continue;
      }
      state.conflicts[path] = { base: baseContent, ours: ourContent, theirs: theirContent };
      mergedFiles[path] = `<<<<<<< HEAD\n${ourContent}\n=======\n${theirContent}\n>>>>>>> ${remoteRef}`;
    } else if (theirContent !== undefined) {
      mergedFiles[path] = theirContent;
    }
  }

  if (Object.keys(state.conflicts).length > 0) {
    state.merging = { branch: remoteRef, commitId: remoteCommitId };
    state.index = { ...mergedFiles };
    state.workingTree = {};
    for (const [path, content] of Object.entries(mergedFiles)) {
      state.workingTree[path] = { content, status: "modified" };
    }
    throw new Error("合并冲突，请先解决冲突后提交");
  }

  state.index = { ...mergedFiles };
  createCommit(state, `Merge ${remoteRef}`, [currentTip, remoteCommitId]);
  return "Merge made by the 'ort' strategy.";
};
