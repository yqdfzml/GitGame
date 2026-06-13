<script setup lang="ts">
import type { RepoState } from "../types";

defineProps<{
  /** 当前仓库状态 */
  state: RepoState;
}>();
</script>

<template>
  <div>
    <div class="head-badge">
      HEAD →
      <strong>{{ state.head.type === 'branch' ? state.head.ref : state.head.ref.slice(0, 7) }}</strong>
      <span v-if="state.head.type === 'detached'" style="color:var(--text-faint)"> (detached)</span>
    </div>
    <ul class="file-list">
      <li v-for="(file, path) in state.workingTree" :key="path" class="file-item">
        <span>{{ path }}</span>
        <span class="file-status" :class="file.status">{{ file.status }}</span>
      </li>
    </ul>
    <p v-if="Object.keys(state.workingTree).length === 0" class="empty-hint">工作区为空</p>
    <div v-if="Object.keys(state.index).length > 0" class="staging-banner">
      暂存区: {{ Object.keys(state.index).join(', ') }}
    </div>
    <div v-if="Object.keys(state.conflicts).length > 0" class="conflict-banner">
      冲突: {{ Object.keys(state.conflicts).join(', ') }}
    </div>
  </div>
</template>
