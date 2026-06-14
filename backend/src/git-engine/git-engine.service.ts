import { Injectable } from "@nestjs/common";
import type { CommandResult, RepoState } from "./repo-state.types";
import {
  appendReflog,
  checkoutRef,
  cloneRepoState,
  collectCommitsAfter,
  createCommit,
  findMergeBase,
  formatLog,
  formatStatus,
  getHeadCommitId,
  getHeadFiles,
  hasLocalChanges,
  isAncestor,
  refreshWorkingTreeStatus,
  resetWorkingTreeToHead,
  resolveRef,
  tryLineMerge,
  validateCommandInput,
} from "./git-engine.utils";

/**
 * Git 虚拟状态机服务。
 * 功能：解析白名单 Git 命令并推进虚拟仓库状态，不执行真实 shell。
 * 参数：通过 executeCommand 传入命令和当前状态。
 * 返回值：CommandResult，含输出、反馈和新状态。
 */
@Injectable()
export class GitEngineService {
  /**
   * 执行一条 Git 命令。
   * 功能：校验白名单后分派到具体子命令处理器。
   * 参数：rawCommand - 用户输入；currentState - 当前仓库快照。
   * 返回值：CommandResult。
   */
  executeCommand(rawCommand: string, currentState: RepoState): CommandResult {
    const validation = validateCommandInput(rawCommand);
    if (!validation.valid || !validation.tokens) {
      return {
        success: false,
        output: validation.reason ?? "非法命令",
        feedback: validation.reason ?? "非法命令",
        state: currentState,
      };
    }

    const tokens = validation.tokens;
    const subCommand = tokens[1];
    const state = cloneRepoState(currentState);

    try {
      switch (subCommand) {
        case "status":
          return this.handleStatus(state);
        case "add":
          return this.handleAdd(state, tokens.slice(2));
        case "commit":
          return this.handleCommit(state, tokens.slice(2));
        case "branch":
          return this.handleBranch(state, tokens.slice(2));
        case "checkout":
          return this.handleCheckout(state, tokens.slice(2));
        case "switch":
          return this.handleSwitch(state, tokens.slice(2));
        case "log":
          return this.handleLog(state);
        case "merge":
          return this.handleMerge(state, tokens.slice(2));
        case "reset":
          return this.handleReset(state, tokens.slice(2));
        case "revert":
          return this.handleRevert(state, tokens.slice(2));
        case "restore":
          return this.handleRestore(state, tokens.slice(2));
        case "stash":
          return this.handleStash(state, tokens.slice(2));
        case "cherry-pick":
          return this.handleCherryPick(state, tokens.slice(2));
        case "tag":
          return this.handleTag(state, tokens.slice(2));
        case "show":
          return this.handleShow(state, tokens.slice(2));
        case "reflog":
          return this.handleReflog(state);
        case "rebase":
          return this.handleRebase(state, tokens.slice(2));
        case "bisect":
          return this.handleBisect(state, tokens.slice(2));
        default:
          return {
            success: false,
            output: `不支持: git ${subCommand}`,
            feedback: `不支持: git ${subCommand}`,
            state: currentState,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "命令执行失败";
      return {
        success: false,
        output: message,
        feedback: message,
        state: currentState,
      };
    }
  }

  /** 处理 git status，只读返回格式化文本 */
  private handleStatus(state: RepoState): CommandResult {
    const output = formatStatus(state);
    return { success: true, output, feedback: "已显示当前仓库状态", state };
  }

  /** 处理 git add，将工作区变更加入暂存区 */
  private handleAdd(state: RepoState, args: string[]): CommandResult {
    refreshWorkingTreeStatus(state);
    const paths: string[] = [];

    if (args.length === 0 || args.includes(".")) {
      for (const [path, file] of Object.entries(state.workingTree)) {
        if (file.status !== "unchanged") {
          paths.push(path);
        }
      }
    } else {
      paths.push(...args.filter((a) => !a.startsWith("-")));
    }

    if (paths.length === 0) {
      return { success: false, output: "没有可暂存的变更", feedback: "没有可暂存的变更", state };
    }

    for (const path of paths) {
      const file = state.workingTree[path];
      if (!file) {
        return { success: false, output: `路径 '${path}' 不存在`, feedback: `路径 '${path}' 不存在`, state };
      }
      if (file.status === "deleted") {
        delete state.index[path];
      } else {
        state.index[path] = file.content;
      }
    }

    return { success: true, output: "", feedback: `已暂存 ${paths.length} 个文件`, state };
  }

  /** 处理 git commit，用暂存区创建新提交 */
  private handleCommit(state: RepoState, args: string[]): CommandResult {
    const messageIndex = args.indexOf("-m");
    const message = messageIndex >= 0 ? args[messageIndex + 1] : undefined;
    if (!message) {
      return { success: false, output: "请使用 -m 提供提交说明", feedback: "请使用 -m 提供提交说明", state };
    }
    if (Object.keys(state.index).length === 0) {
      return { success: false, output: "没有暂存的变更可提交", feedback: "请先 git add 再 commit", state };
    }

    const parentId = getHeadCommitId(state);
    let parents = parentId ? [parentId] : [];
    // 冲突解决后的提交需要保留 merge 的双父结构
    if (state.merging && parentId) {
      parents = [parentId, state.merging.commitId];
    }

    const commitId = createCommit(state, message, parents);

    return {
      success: true,
      output: `[${state.head.type === "branch" ? state.head.ref : "detached HEAD"} ${commitId}] ${message}`,
      feedback: "提交成功",
      state,
    };
  }

  /** 处理 git branch，列出或创建分支 */
  private handleBranch(state: RepoState, args: string[]): CommandResult {
    if (args.length === 0) {
      const currentBranch = state.head.type === "branch" ? state.head.ref : null;
      const lines = Object.keys(state.branches).map((name) => {
        const marker = name === currentBranch ? "* " : "  ";
        return `${marker}${name}`;
      });
      return { success: true, output: lines.join("\n"), feedback: "已列出分支", state };
    }

    const branchName = args[args.length - 1];
    if (args.includes("-d")) {
      if (!state.branches[branchName]) {
        return { success: false, output: `分支 '${branchName}' 不存在`, feedback: `分支 '${branchName}' 不存在`, state };
      }
      delete state.branches[branchName];
      return { success: true, output: `Deleted branch ${branchName}`, feedback: `已删除分支 '${branchName}'`, state };
    }

    if (state.branches[branchName]) {
      return { success: false, output: `分支 '${branchName}' 已存在`, feedback: `分支 '${branchName}' 已存在`, state };
    }

    const headId = getHeadCommitId(state);
    if (!headId) {
      return { success: false, output: "无法创建分支：HEAD 无效", feedback: "无法创建分支", state };
    }
    state.branches[branchName] = headId;
    return { success: true, output: "", feedback: `已创建分支 '${branchName}'`, state };
  }

  /** 处理 git checkout，切换或 -b 创建分支，合并冲突时支持 --ours/--theirs */
  private handleCheckout(state: RepoState, args: string[]): CommandResult {
    const oursIndex = args.indexOf("--ours");
    const theirsIndex = args.indexOf("--theirs");
    if (oursIndex >= 0 || theirsIndex >= 0) {
      const side = oursIndex >= 0 ? "ours" : "theirs";
      const paths = args.filter((a) => !a.startsWith("-"));
      return this.handleCheckoutConflictSide(state, paths, side);
    }

    const createIndex = args.indexOf("-b");
    if (createIndex >= 0) {
      const branchName = args[createIndex + 1];
      if (!branchName) {
        return { success: false, output: "请指定新分支名", feedback: "请指定新分支名", state };
      }
      if (state.branches[branchName]) {
        return { success: false, output: `分支 '${branchName}' 已存在`, feedback: `分支 '${branchName}' 已存在`, state };
      }
      const headId = getHeadCommitId(state);
      if (!headId) {
        return { success: false, output: "HEAD 无效", feedback: "HEAD 无效", state };
      }
      state.branches[branchName] = headId;
      const msg = checkoutRef(state, branchName);
      return { success: true, output: msg, feedback: `已创建并切换到 '${branchName}'`, state };
    }

    const target = args.find((a) => !a.startsWith("-"));
    if (!target) {
      return { success: false, output: "请指定分支或 commit", feedback: "请指定分支或 commit", state };
    }
    const msg = checkoutRef(state, target);
    return { success: true, output: msg, feedback: `已切换到 '${target}'`, state };
  }

  /** 处理 git switch，切换或 -c 创建分支 */
  private handleSwitch(state: RepoState, args: string[]): CommandResult {
    const createIndex = args.indexOf("-c");
    if (createIndex >= 0) {
      const branchName = args[createIndex + 1];
      if (!branchName) {
        return { success: false, output: "请指定新分支名", feedback: "请指定新分支名", state };
      }
      return this.handleCheckout(state, ["-b", branchName]);
    }

    const target = args.find((a) => !a.startsWith("-"));
    if (!target) {
      return { success: false, output: "请指定分支", feedback: "请指定分支", state };
    }
    const msg = checkoutRef(state, target);
    return { success: true, output: msg, feedback: `已切换到 '${target}'`, state };
  }

  /** 处理 git log */
  private handleLog(state: RepoState): CommandResult {
    const output = formatLog(state);
    return { success: true, output, feedback: "已显示提交历史", state };
  }

  /** 处理 git merge，支持快进和冲突标记 */
  private handleMerge(state: RepoState, args: string[]): CommandResult {
    const branchName = args.find((a) => !a.startsWith("-"));
    if (!branchName) {
      return { success: false, output: "请指定要合并的分支", feedback: "请指定要合并的分支", state };
    }
    if (!state.branches[branchName]) {
      return { success: false, output: `分支 '${branchName}' 不存在`, feedback: `分支 '${branchName}' 不存在`, state };
    }

    const currentId = getHeadCommitId(state);
    const targetId = state.branches[branchName];
    if (!currentId || !targetId) {
      return { success: false, output: "HEAD 或目标分支无效", feedback: "合并失败", state };
    }

    if (currentId === targetId) {
      return { success: true, output: "Already up to date.", feedback: "已经是最新", state };
    }

    if (isAncestor(state, currentId, targetId)) {
      if (state.head.type === "branch") {
        state.branches[state.head.ref] = targetId;
      }
      const files = state.commits[targetId].files;
      state.workingTree = {};
      for (const [path, content] of Object.entries(files)) {
        state.workingTree[path] = { content, status: "unchanged" };
      }
      state.index = {};
      return { success: true, output: "Fast-forward", feedback: `已快进合并 '${branchName}'`, state };
    }

    if (isAncestor(state, targetId, currentId)) {
      return { success: true, output: "Already up to date.", feedback: "已经是最新", state };
    }

    const ours = state.commits[currentId].files;
    const theirs = state.commits[targetId].files;
    const mergeBaseId = findMergeBase(state, currentId, targetId);
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
        mergedFiles[path] = `<<<<<<< HEAD\n${ourContent}\n=======\n${theirContent}\n>>>>>>> ${branchName}`;
      } else if (theirContent !== undefined) {
        mergedFiles[path] = theirContent;
      }
    }

    if (Object.keys(state.conflicts).length > 0) {
      state.merging = { branch: branchName, commitId: targetId };
      state.index = { ...mergedFiles };
      state.workingTree = {};
      for (const [path, content] of Object.entries(mergedFiles)) {
        state.workingTree[path] = { content, status: "modified" };
      }
      return {
        success: false,
        output: "Automatic merge failed; fix conflicts and then commit the result.",
        feedback: "合并产生冲突，请解决后提交",
        state,
      };
    }

    createCommit(state, `Merge branch '${branchName}'`, [currentId, targetId]);
    return { success: true, output: "Merge made by the 'recursive' strategy.", feedback: `已合并 '${branchName}'`, state };
  }

  /** 处理 git reset，支持 soft/mixed/hard */
  private handleReset(state: RepoState, args: string[]): CommandResult {
    let mode: "soft" | "mixed" | "hard" = "mixed";
    const filtered: string[] = [];
    for (const arg of args) {
      if (arg === "--soft") {
        mode = "soft";
      } else if (arg === "--hard") {
        mode = "hard";
      } else if (arg === "--mixed") {
        mode = "mixed";
      } else if (!arg.startsWith("-")) {
        filtered.push(arg);
      }
    }

    const ref = filtered[0] ?? "HEAD";
    const commitId = resolveRef(state, ref);
    if (!commitId) {
      return { success: false, output: `无法解析 ref '${ref}'`, feedback: `无法解析 ref '${ref}'`, state };
    }

    if (state.head.type === "branch") {
      state.branches[state.head.ref] = commitId;
    } else {
      state.head.ref = commitId;
    }
    appendReflog(state, commitId, `reset: moving to ${commitId}`);

    if (mode === "soft") {
      return { success: true, output: "", feedback: "已 soft reset", state };
    }

    state.index = {};
    if (mode === "hard") {
      const files = state.commits[commitId].files;
      state.workingTree = {};
      for (const [path, content] of Object.entries(files)) {
        state.workingTree[path] = { content, status: "unchanged" };
      }
      state.conflicts = {};
      state.merging = undefined;
    }

    return { success: true, output: "", feedback: `已 ${mode} reset 到 ${commitId}`, state };
  }

  /** 处理 git revert，创建反向提交 */
  private handleRevert(state: RepoState, args: string[]): CommandResult {
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) {
      return { success: false, output: "请指定要 revert 的 commit", feedback: "请指定 commit", state };
    }
    const commitId = resolveRef(state, ref);
    if (!commitId) {
      return { success: false, output: `无法解析 commit '${ref}'`, feedback: "commit 不存在", state };
    }

    const targetCommit = state.commits[commitId];
    const headFiles = getHeadFiles(state);
    state.index = {};

    for (const [path, content] of Object.entries(targetCommit.files)) {
      if (headFiles[path] !== undefined && headFiles[path] !== content) {
        state.index[path] = headFiles[path];
      }
    }

    for (const [path] of Object.entries(headFiles)) {
      if (targetCommit.files[path] === undefined) {
        state.index[path] = headFiles[path];
      }
    }

    const parentId = getHeadCommitId(state);
    createCommit(state, `Revert "${targetCommit.message}"`, parentId ? [parentId] : []);
    return { success: true, output: `Revert "${targetCommit.message}"`, feedback: "已 revert 指定提交", state };
  }

  /** 处理 git restore，恢复工作区或暂存区 */
  private handleRestore(state: RepoState, args: string[]): CommandResult {
    const fromIndex = args.includes("--staged");
    const paths = args.filter((a) => !a.startsWith("-") && a !== "--staged" && a !== "--worktree");

    if (paths.length === 0) {
      return { success: false, output: "请指定文件路径", feedback: "请指定文件路径", state };
    }

    const headFiles = getHeadFiles(state);
    for (const path of paths) {
      if (fromIndex) {
        delete state.index[path];
      } else {
        const headContent = headFiles[path];
        if (headContent !== undefined) {
          state.workingTree[path] = { content: headContent, status: "unchanged" };
        } else {
          delete state.workingTree[path];
        }
      }
    }

    return { success: true, output: "", feedback: "已恢复文件", state };
  }

  /**
   * 处理合并冲突时选择 ours/theirs 版本。
   * 功能：用冲突一方的内容覆盖工作区与暂存区，并清除该文件冲突标记。
   * 参数：state - 仓库；paths - 文件路径列表；side - ours 或 theirs。
   * 返回值：CommandResult。
   */
  private handleCheckoutConflictSide(
    state: RepoState,
    paths: string[],
    side: "ours" | "theirs",
  ): CommandResult {
    if (paths.length === 0) {
      return { success: false, output: "请指定冲突文件路径", feedback: "请指定冲突文件路径", state };
    }

    for (const path of paths) {
      const conflict = state.conflicts[path];
      if (!conflict) {
        return {
          success: false,
          output: `文件 '${path}' 当前没有冲突`,
          feedback: `文件 '${path}' 当前没有冲突`,
          state,
        };
      }
      const resolvedContent = side === "ours" ? conflict.ours : conflict.theirs;
      state.workingTree[path] = { content: resolvedContent, status: "modified" };
      state.index[path] = resolvedContent;
      delete state.conflicts[path];
    }

    return {
      success: true,
      output: "",
      feedback: `已采用 ${side === "ours" ? "当前分支" : "合并分支"} 版本解决冲突`,
      state,
    };
  }

  /**
   * 处理 git stash 子命令。
   * 功能：贮藏、恢复、列出本地修改。
   * 参数：state - 仓库；args - stash 子命令及参数。
   * 返回值：CommandResult。
   */
  private handleStash(state: RepoState, args: string[]): CommandResult {
    if (!state.stash) {
      state.stash = [];
    }

    const subCommand = args[0] ?? "push";

    if (subCommand === "push" || subCommand === "save" || subCommand === "-u" || args.length === 0) {
      refreshWorkingTreeStatus(state);
      if (!hasLocalChanges(state)) {
        return { success: false, output: "没有要贮藏的本地修改", feedback: "没有要贮藏的本地修改", state };
      }

      const stashId = `stash@{${state.stash.length}}`;
      const branchName = state.head.type === "branch" ? state.head.ref : "detached";
      const workingTreeCopy = JSON.parse(JSON.stringify(state.workingTree));
      const indexCopy = { ...state.index };

      state.stash.push({
        id: stashId,
        message: `WIP on ${branchName}`,
        workingTree: workingTreeCopy,
        index: indexCopy,
      });

      resetWorkingTreeToHead(state);
      return {
        success: true,
        output: `Saved working directory and index state ${stashId}`,
        feedback: `已贮藏当前修改到 ${stashId}`,
        state,
      };
    }

    if (subCommand === "list") {
      if (state.stash.length === 0) {
        return { success: true, output: "", feedback: "贮藏栈为空", state };
      }
      const lines = state.stash.map((entry, index) => `${entry.id}: ${entry.message}`);
      return { success: true, output: lines.join("\n"), feedback: "已列出贮藏记录", state };
    }

    if (subCommand === "pop" || subCommand === "apply") {
      if (state.stash.length === 0) {
        return { success: false, output: "贮藏栈为空", feedback: "贮藏栈为空", state };
      }

      const entry = state.stash[subCommand === "pop" ? state.stash.length - 1 : state.stash.length - 1];
      state.workingTree = JSON.parse(JSON.stringify(entry.workingTree));
      state.index = { ...entry.index };
      refreshWorkingTreeStatus(state);

      if (subCommand === "pop") {
        state.stash.pop();
      }

      return {
        success: true,
        output: subCommand === "pop" ? `Dropped ${entry.id}` : "",
        feedback: subCommand === "pop" ? `已恢复并移除 ${entry.id}` : `已恢复 ${entry.id}`,
        state,
      };
    }

    return {
      success: false,
      output: `不支持的 stash 子命令: ${subCommand}`,
      feedback: `不支持的 stash 子命令: ${subCommand}`,
      state,
    };
  }

  /**
   * 处理 git cherry-pick，将指定提交应用到当前分支。
   * 功能：复制目标提交相对其父提交的变更并生成新提交。
   * 参数：state - 仓库；args - cherry-pick 参数。
   * 返回值：CommandResult。
   */
  private handleCherryPick(state: RepoState, args: string[]): CommandResult {
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) {
      return { success: false, output: "请指定要 cherry-pick 的 commit", feedback: "请指定 commit", state };
    }

    const commitId = resolveRef(state, ref);
    if (!commitId) {
      return { success: false, output: `无法解析 commit '${ref}'`, feedback: "commit 不存在", state };
    }

    const sourceCommit = state.commits[commitId];
    const parentId = sourceCommit.parents[0];
    const parentFiles = parentId ? state.commits[parentId]?.files ?? {} : {};
    const headFiles = getHeadFiles(state);
    state.index = {};

    for (const [path, content] of Object.entries(sourceCommit.files)) {
      if (parentFiles[path] !== content) {
        state.index[path] = content;
      }
    }
    for (const path of Object.keys(parentFiles)) {
      if (sourceCommit.files[path] === undefined && headFiles[path] !== undefined) {
        state.index[path] = headFiles[path];
      }
    }

    if (Object.keys(state.index).length === 0) {
      return { success: true, output: "为空提交，跳过", feedback: "该提交没有可应用的变更", state };
    }

    const currentHeadId = getHeadCommitId(state);
    createCommit(state, `cherry-pick: ${sourceCommit.message}`, currentHeadId ? [currentHeadId] : []);
    return {
      success: true,
      output: `已 cherry-pick ${commitId}`,
      feedback: `已将提交 ${commitId} 应用到当前分支`,
      state,
    };
  }

  /** 处理 git tag，创建或列出标签 */
  private handleTag(state: RepoState, args: string[]): CommandResult {
    if (!state.tags) {
      state.tags = {};
    }
    if (args.length === 0) {
      const lines = Object.keys(state.tags);
      return { success: true, output: lines.join("\n"), feedback: "已列出标签", state };
    }
    const tagName = args[0];
    const targetRef = args[1];
    const commitId = targetRef ? resolveRef(state, targetRef) : getHeadCommitId(state);
    if (!commitId) {
      return { success: false, output: "无法解析目标提交", feedback: "无法解析目标提交", state };
    }
    state.tags[tagName] = commitId;
    return { success: true, output: "", feedback: `已创建标签 '${tagName}' -> ${commitId}`, state };
  }

  /** 处理 git show，只读展示提交详情 */
  private handleShow(state: RepoState, args: string[]): CommandResult {
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) {
      return { success: false, output: "请指定 commit", feedback: "请指定 commit", state };
    }
    const commitId = resolveRef(state, ref);
    if (!commitId || !state.commits[commitId]) {
      return { success: false, output: `无法解析 commit '${ref}'`, feedback: "commit 不存在", state };
    }
    const node = state.commits[commitId];
    const fileLines = Object.entries(node.files).map(([path, content]) => ` ${path}: ${content}`);
    const output = [`commit ${node.id}`, `    ${node.message}`, "", ...fileLines].join("\n");
    return { success: true, output, feedback: `已显示提交 ${commitId}`, state };
  }

  /** 处理 git reflog，列出 HEAD 操作记录 */
  private handleReflog(state: RepoState): CommandResult {
    const entries = state.reflog ?? [];
    if (entries.length === 0) {
      return { success: true, output: "", feedback: "reflog 为空", state };
    }
    const lines = entries.map((entry, index) => `${entry.commitId} HEAD@{${index}}: ${entry.message}`);
    return { success: true, output: lines.join("\n"), feedback: "已显示 reflog", state };
  }

  /**
   * 处理 git rebase。
   * 功能：将当前分支提交重放到目标基底上，支持 --continue/--abort。
   * 参数：state - 仓库；args - rebase 参数。
   * 返回值：CommandResult。
   */
  private handleRebase(state: RepoState, args: string[]): CommandResult {
    if (args.includes("--abort")) {
      if (!state.rebasing) {
        return { success: false, output: "没有进行中的 rebase", feedback: "没有进行中的 rebase", state };
      }
      const originalTip = state.rebasing.originalTip;
      if (state.head.type === "branch") {
        state.branches[state.head.ref] = originalTip;
      }
      checkoutRef(state, state.rebasing.branch);
      state.rebasing = undefined;
      state.conflicts = {};
      return { success: true, output: "已中止 rebase", feedback: "已中止 rebase", state };
    }

    if (args.includes("--continue")) {
      if (!state.rebasing) {
        return { success: false, output: "没有进行中的 rebase", feedback: "没有进行中的 rebase", state };
      }
      if (Object.keys(state.conflicts).length > 0) {
        return { success: false, output: "仍有未解决冲突", feedback: "请先解决冲突", state };
      }
      if (Object.keys(state.index).length === 0) {
        return { success: false, output: "没有可提交的变更", feedback: "请先 add 解决后的文件", state };
      }
      const headId = getHeadCommitId(state);
      createCommit(state, "rebase continue", headId ? [headId] : []);
      state.rebasing.index += 1;
      return this.replayNextRebaseCommit(state);
    }

    const ontoRef = args.find((a) => !a.startsWith("-"));
    if (!ontoRef) {
      return { success: false, output: "请指定 rebase 目标", feedback: "请指定 rebase 目标", state };
    }
    const ontoId = resolveRef(state, ontoRef);
    if (!ontoId) {
      return { success: false, output: `无法解析 '${ontoRef}'`, feedback: "目标 ref 无效", state };
    }
    const currentBranch = state.head.type === "branch" ? state.head.ref : null;
    const currentTip = getHeadCommitId(state);
    if (!currentBranch || !currentTip) {
      return { success: false, output: "请在分支上执行 rebase", feedback: "请在分支上执行 rebase", state };
    }
    if (isAncestor(state, currentTip, ontoId) || currentTip === ontoId) {
      return { success: true, output: "Current branch is up to date.", feedback: "当前分支已是最新", state };
    }
    const mergeBase = ontoId;
    const replayCommits = collectCommitsAfter(state, mergeBase, currentTip);
    if (replayCommits.length === 0) {
      return { success: true, output: "无需 rebase", feedback: "无需 rebase", state };
    }
    state.rebasing = {
      onto: ontoId,
      commits: replayCommits,
      index: 0,
      branch: currentBranch,
      originalTip: currentTip,
    };
    state.branches[currentBranch] = ontoId;
    checkoutRef(state, currentBranch);
    return this.replayNextRebaseCommit(state);
  }

  /**
   * 重放下一个 rebase 提交。
   * 功能：逐个 replay commit，冲突时暂停等待玩家处理。
   * 参数：state - 仓库状态。
   * 返回值：CommandResult。
   */
  private replayNextRebaseCommit(state: RepoState): CommandResult {
    if (!state.rebasing) {
      return { success: false, output: "rebase 状态无效", feedback: "rebase 状态无效", state };
    }
    const rebasing = state.rebasing;
    if (rebasing.index >= rebasing.commits.length) {
      state.rebasing = undefined;
      return { success: true, output: "Successfully rebased.", feedback: "rebase 完成", state };
    }
    const nextCommitId = rebasing.commits[rebasing.index];
    const sourceCommit = state.commits[nextCommitId];
    const parentId = sourceCommit.parents[0];
    const parentFiles = parentId ? state.commits[parentId]?.files ?? {} : {};
    const headFiles = getHeadFiles(state);
    state.index = {};
    state.conflicts = {};

    for (const [path, content] of Object.entries(sourceCommit.files)) {
      if (parentFiles[path] !== content && headFiles[path] !== content) {
        if (headFiles[path] !== undefined && headFiles[path] !== content) {
          state.conflicts[path] = {
            base: headFiles[path],
            ours: headFiles[path],
            theirs: content,
          };
          state.index[path] = `<<<<<<< HEAD\n${headFiles[path]}\n=======\n${content}\n>>>>>>> rebase`;
        } else {
          state.index[path] = content;
        }
      }
    }

    if (Object.keys(state.conflicts).length > 0) {
      state.workingTree = {};
      for (const [path, content] of Object.entries(state.index)) {
        state.workingTree[path] = { content, status: "modified" };
      }
      return {
        success: false,
        output: "Rebase conflict. Resolve, add, then git rebase --continue",
        feedback: "rebase 产生冲突，请解决后继续",
        state,
      };
    }

    const headId = getHeadCommitId(state);
    createCommit(state, sourceCommit.message, headId ? [headId] : []);
    rebasing.index += 1;
    return this.replayNextRebaseCommit(state);
  }

  /**
   * 处理 git bisect 子命令。
   * 功能：二分查找首个不良提交。
   * 参数：state - 仓库；args - bisect 参数。
   * 返回值：CommandResult。
   */
  private handleBisect(state: RepoState, args: string[]): CommandResult {
    const sub = args[0] ?? "start";

    if (sub === "reset") {
      state.bisect = undefined;
      return { success: true, output: "已退出 bisect", feedback: "已退出 bisect", state };
    }

    if (sub === "start") {
      const refs = args.filter((a) => !a.startsWith("-") && a !== "start");
      const badId = refs[0] ? resolveRef(state, refs[0]) : getHeadCommitId(state);
      const goodId = refs[1] ? resolveRef(state, refs[1]) : null;
      if (!badId || !goodId) {
        return { success: false, output: "用法: git bisect start <bad> <good>", feedback: "请指定 bad 和 good 提交", state };
      }
      const middleId = this.pickBisectMiddle(state, goodId, badId);
      state.bisect = { goodId, badId, currentId: middleId };
      checkoutRef(state, middleId);
      return { success: true, output: `Bisecting: ${middleId}`, feedback: `正在检出中间提交 ${middleId}`, state };
    }

    if (!state.bisect) {
      return { success: false, output: "请先 git bisect start", feedback: "请先开始 bisect", state };
    }

    const currentId = getHeadCommitId(state) ?? state.bisect.currentId;

    if (sub === "good") {
      state.bisect.goodId = currentId;
    } else if (sub === "bad") {
      state.bisect.badId = currentId;
    } else {
      return { success: false, output: `不支持的 bisect 子命令: ${sub}`, feedback: "不支持的子命令", state };
    }

    const { goodId, badId } = state.bisect;
    const candidates = collectCommitsAfter(state, goodId, badId);
    if (candidates.length <= 1) {
      const foundBad = candidates[0] ?? badId;
      state.bisect.foundBadId = foundBad;
      state.bisect.currentId = foundBad;
      return {
        success: true,
        output: `${foundBad} is the first bad commit`,
        feedback: `已定位首个不良提交 ${foundBad}`,
        state,
      };
    }

    const middleId = candidates[Math.floor(candidates.length / 2)];
    state.bisect.currentId = middleId;
    checkoutRef(state, middleId);
    return { success: true, output: `Bisecting: ${middleId}`, feedback: `正在检出 ${middleId}`, state };
  }

  /**
   * 选取 bisect 中间提交。
   * 功能：在 good 与 bad 之间取中点。
   * 参数：state - 仓库；goodId/badId - 两端提交。
   * 返回值：中间 commit id。
   */
  private pickBisectMiddle(state: RepoState, goodId: string, badId: string): string {
    const candidates = collectCommitsAfter(state, goodId, badId);
    if (candidates.length === 0) {
      return badId;
    }
    return candidates[Math.floor(candidates.length / 2)];
  }
}
