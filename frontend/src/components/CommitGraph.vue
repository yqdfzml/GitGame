<script setup lang="ts">
import { computed } from "vue";
import type { RepoState } from "../types";
import {
  buildBranchColorMap,
  getBranchColor,
  getHeadBranchName,
  isCurrentBranch,
} from "../utils/branchColors";

const props = defineProps<{
  /** 当前仓库状态 */
  state: RepoState;
}>();

/** 提交图谱上的分支标签 */
type BranchTag = {
  /** 分支或远程跟踪引用名，如 main、origin/main */
  name: string;
  /** 是否为远程跟踪引用（origin/*） */
  isRemoteTracking: boolean;
  /** 是否表示远端领先、本地跟踪尚未更新的位置 */
  isRemoteAhead: boolean;
};

/** 每条提交在图谱中的展示数据 */
type GraphRow = {
  /** commit id */
  id: string;
  /** 提交说明 */
  message: string;
  /** 是否为 HEAD 指向的提交 */
  isHead: boolean;
  /** 指向该提交的分支与远程引用标签 */
  branchTags: BranchTag[];
};

/**
 * 收集图谱需要展示的 commit id。
 * 功能：从本地分支、远程跟踪分支与远端分支 tip 出发遍历，避免漏掉 fetch 前的远端提交。
 * 参数：state - 仓库快照。
 * 返回值：可达 commit id 集合。
 */
const collectReachableCommits = (state: RepoState): Set<string> => {
  /** 待遍历的 commit id 栈 */
  const stack: string[] = [];
  /** 已收集的 commit id */
  const reachable = new Set<string>();

  // 1. 本地分支 tip
  for (const commitId of Object.values(state.branches)) {
    if (commitId) {
      stack.push(commitId);
    }
  }

  // 2. 远程跟踪分支 tip（如 origin/main）
  for (const commitId of Object.values(state.remoteTracking ?? {})) {
    if (commitId) {
      stack.push(commitId);
    }
  }

  // 3. 远端仓库分支 tip（fetch 前远端领先时，提交可能只在这里可达）
  for (const remote of Object.values(state.remotes ?? {})) {
    for (const commitId of Object.values(remote.branches)) {
      if (commitId) {
        stack.push(commitId);
      }
    }
  }

  while (stack.length > 0) {
    const commitId = stack.pop();
    if (!commitId || reachable.has(commitId)) {
      continue;
    }
    reachable.add(commitId);
    const parents = state.commits[commitId]?.parents ?? [];
    for (const parentId of parents) {
      stack.push(parentId);
    }
  }

  return reachable;
};

/**
 * 整理分支标签顺序。
 * 功能：当前所在分支排在最前，main 次之，其余按字母序。
 * 参数：branchTags - 指向同一 commit 的标签；state - 仓库快照。
 * 返回值：排序后的标签列表。
 */
const sortBranchTags = (branchTags: BranchTag[], state: RepoState): BranchTag[] => {
  const currentBranch = getHeadBranchName(state);
  return [...branchTags].sort((left, right) => {
    if (left.name === currentBranch) return -1;
    if (right.name === currentBranch) return 1;
    if (left.name === "main") return -1;
    if (right.name === "main") return 1;
    return left.name.localeCompare(right.name);
  });
};

/**
 * 收集某条提交上的分支与远程引用标签。
 * 功能：合并本地分支、远程跟踪分支，以及 fetch 前远端领先位置。
 * 参数：commitId - 提交 id；state - 仓库快照。
 * 返回值：该提交上的标签列表。
 */
const collectBranchTagsForCommit = (commitId: string, state: RepoState): BranchTag[] => {
  /** 已添加的引用名，避免重复 */
  const addedNames = new Set<string>();
  /** 当前提交上的标签 */
  const branchTags: BranchTag[] = [];

  // 1. 本地分支
  for (const [branchName, tip] of Object.entries(state.branches)) {
    if (tip !== commitId || addedNames.has(branchName)) {
      continue;
    }
    addedNames.add(branchName);
    branchTags.push({ name: branchName, isRemoteTracking: false, isRemoteAhead: false });
  }

  // 2. 远程跟踪分支（如 origin/main）
  for (const [refName, tip] of Object.entries(state.remoteTracking ?? {})) {
    if (tip !== commitId || addedNames.has(refName)) {
      continue;
    }
    addedNames.add(refName);
    branchTags.push({ name: refName, isRemoteTracking: true, isRemoteAhead: false });
  }

  // 3. 远端领先：远端 tip 与本地跟踪不一致时，在远端 tip 上额外标注
  for (const [remoteName, remote] of Object.entries(state.remotes ?? {})) {
    for (const [branchName, tip] of Object.entries(remote.branches)) {
      const refName = `${remoteName}/${branchName}`;
      const trackingTip = state.remoteTracking?.[refName];
      if (tip !== commitId || trackingTip === tip || addedNames.has(refName)) {
        continue;
      }
      addedNames.add(refName);
      branchTags.push({ name: refName, isRemoteTracking: true, isRemoteAhead: true });
    }
  }

  return branchTags;
};

/**
 * 构建提交图谱行数据。
 * 功能：汇总所有分支与远程引用上的 commit，按时间从新到旧排列。
 * 参数：state - 仓库快照。
 * 返回值：提交展示行列表。
 */
const buildGraphRows = (state: RepoState): GraphRow[] => {
  const { commits, branches, head } = state;
  if (Object.keys(commits).length === 0) {
    return [];
  }

  const headId = head.type === "branch" ? branches[head.ref] : head.ref;
  const reachable = collectReachableCommits(state);
  if (reachable.size === 0) {
    return [];
  }

  const sortedDesc = [...reachable].sort(
    (left, right) => (commits[right]?.timestamp ?? 0) - (commits[left]?.timestamp ?? 0),
  );

  return sortedDesc.map((commitId) => {
    const node = commits[commitId]!;
    return {
      id: commitId,
      message: node.message,
      isHead: commitId === headId,
      branchTags: sortBranchTags(collectBranchTagsForCommit(commitId, state), state),
    };
  });
};

/** 图谱行列表 */
const graphRows = computed(() => buildGraphRows(props.state));

/**
 * 收集图谱配色所需的分支名。
 * 功能：本地分支与远程跟踪引用共用一套颜色映射。
 * 参数：state - 仓库快照。
 * 返回值：分支名列表。
 */
const collectColorBranchNames = (state: RepoState): string[] => {
  /** 去重后的分支名集合 */
  const nameSet = new Set(Object.keys(state.branches));
  for (const refName of Object.keys(state.remoteTracking ?? {})) {
    nameSet.add(refName);
  }
  for (const [remoteName, remote] of Object.entries(state.remotes ?? {})) {
    for (const branchName of Object.keys(remote.branches)) {
      nameSet.add(`${remoteName}/${branchName}`);
    }
  }
  return [...nameSet];
};

/** 分支名到颜色的映射 */
const branchColorMap = computed(() => buildBranchColorMap(collectColorBranchNames(props.state)));
</script>

<template>
  <div class="commit-graph dark-scroll">
    <p v-if="graphRows.length === 0" class="empty-hint">暂无提交</p>

    <div
      v-for="row in graphRows"
      :key="row.id"
      class="commit-node"
      :class="{ 'is-head': row.isHead }"
    >
      <span class="commit-id">{{ row.id.slice(0, 7) }}</span>
      <span class="commit-msg">{{ row.message }}</span>
      <span
        v-for="tag in row.branchTags"
        :key="`${row.id}-${tag.name}`"
        class="commit-branch"
        :class="{
          'is-current': isCurrentBranch(tag.name, state),
          'is-remote-tracking': tag.isRemoteTracking,
          'is-remote-ahead': tag.isRemoteAhead,
        }"
        :style="{ '--branch-color': getBranchColor(tag.name, branchColorMap) }"
      >
        {{ tag.name }}
      </span>
      <span v-if="row.isHead" class="commit-head-tag">HEAD</span>
    </div>
  </div>
</template>
