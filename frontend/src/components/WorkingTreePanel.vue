<script setup lang="ts">
import type { RepoState } from "../types";

defineProps<{
  /** 当前仓库状态 */
  state: RepoState;
}>();
</script>

<template>
  <div>
    <p style="font-size:0.85rem;margin-bottom:8px">
      HEAD:
      <strong>{{ state.head.type === 'branch' ? `分支 ${state.head.ref}` : `游离 ${state.head.ref}` }}</strong>
    </p>
    <ul class="file-list">
      <li v-for="(file, path) in state.workingTree" :key="path" class="file-item">
        <span>{{ path }}</span>
        <span class="file-status">{{ file.status }}</span>
      </li>
    </ul>
    <p v-if="Object.keys(state.index).length > 0" style="margin-top:12px;font-size:0.85rem;color:var(--warn)">
      暂存区: {{ Object.keys(state.index).join(', ') }}
    </p>
    <p v-if="Object.keys(state.conflicts).length > 0" style="margin-top:8px;color:var(--danger);font-size:0.85rem">
      冲突: {{ Object.keys(state.conflicts).join(', ') }}
    </p>
  </div>
</template>
