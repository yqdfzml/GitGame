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

/** 每条提交在图谱中的展示数据 */
type GraphRow = {
  /** commit id */
  id: string;
  /** 提交说明 */
  message: string;
  /** 是否为 HEAD 指向的提交 */
  isHead: boolean;
  /** 指向该提交的分支名，当前分支排在最前 */
  branchTags: string[];
};

/**
 * 收集所有分支 tip 可达的 commit id。
 * 功能：避免只从 HEAD 遍历导致 feature 等分叉提交被漏掉。
 * 参数：state - 仓库快照。
 * 返回值：可达 commit id 集合。
 */
const collectReachableCommits = (state: RepoState): Set<string> => {
  const reachable = new Set<string>();
  const stack = Object.values(state.branches).filter(Boolean);

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
 * 功能：当前所在分支排在最前，便于识别。
 * 参数：branchTags - 指向同一 commit 的分支名；state - 仓库快照。
 * 返回值：排序后的分支名列表。
 */
const sortBranchTags = (branchTags: string[], state: RepoState): string[] => {
  const currentBranch = getHeadBranchName(state);
  return [...branchTags].sort((left, right) => {
    if (left === currentBranch) return -1;
    if (right === currentBranch) return 1;
    if (left === "main") return -1;
    if (right === "main") return 1;
    return left.localeCompare(right);
  });
};

/**
 * 构建提交图谱行数据。
 * 功能：汇总所有分支上的 commit，按时间从新到旧排列。
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
    const branchTags = Object.entries(branches)
      .filter(([, tip]) => tip === commitId)
      .map(([branchName]) => branchName);

    return {
      id: commitId,
      message: node.message,
      isHead: commitId === headId,
      branchTags: sortBranchTags(branchTags, state),
    };
  });
};

/** 图谱行列表 */
const graphRows = computed(() => buildGraphRows(props.state));

/** 分支名到颜色的映射 */
const branchColorMap = computed(() => buildBranchColorMap(Object.keys(props.state.branches)));
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
        v-for="branchName in row.branchTags"
        :key="`${row.id}-${branchName}`"
        class="commit-branch"
        :class="{ 'is-current': isCurrentBranch(branchName, state) }"
        :style="{ '--branch-color': getBranchColor(branchName, branchColorMap) }"
      >
        {{ branchName }}
      </span>
      <span v-if="row.isHead" class="commit-head-tag">HEAD</span>
    </div>
  </div>
</template>
