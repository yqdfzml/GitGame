<script setup lang="ts">
import type { RepoState } from "../types";

const props = defineProps<{
  /** 当前仓库状态 */
  state: RepoState;
}>();

/**
 * 构建 commit graph 展示列表。
 * 功能：从 HEAD 向前遍历，标记当前 HEAD 所在 commit。
 * 参数：无（读取 props.state）。
 * 返回值：commit 展示数组。
 */
const buildGraph = () => {
  const headId =
    props.state.head.type === "branch"
      ? props.state.branches[props.state.head.ref]
      : props.state.head.ref;

  if (!headId) {
    return [];
  }

  const result: Array<{ id: string; message: string; isHead: boolean; branch?: string }> = [];
  const visited = new Set<string>();
  const stack = [headId];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = props.state.commits[id];
    if (!node) continue;

    const branch = Object.entries(props.state.branches).find(([, tip]) => tip === id)?.[0];
    result.push({ id, message: node.message, isHead: id === headId, branch });
    for (const parent of node.parents) {
      stack.push(parent);
    }
  }
  return result;
};
</script>

<template>
  <div class="commit-graph">
    <div
      v-for="node in buildGraph()"
      :key="node.id"
      class="commit-node"
      :class="{ 'is-head': node.isHead }"
    >
      <span class="commit-dot" :class="{ head: node.isHead }" />
      <span class="commit-id">{{ node.id.slice(0, 7) }}</span>
      <span class="commit-msg">{{ node.message }}</span>
      <span v-if="node.branch" class="commit-branch">{{ node.branch }}</span>
    </div>
    <p v-if="buildGraph().length === 0" class="empty-hint">暂无提交</p>
  </div>
</template>
