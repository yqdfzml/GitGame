<script setup lang="ts">
import { computed } from "vue";
import type { RepoState, StashEntry } from "../types";
import { fileStatusLabel } from "../utils/fileStatusLabel";

const props = defineProps<{
  /** 当前仓库状态 */
  state: RepoState;
}>();

/** 贮藏栈列表，无数据时为空数组 */
const stashList = computed(() => props.state.stash ?? []);

/**
 * 汇总单条贮藏内的文件路径。
 * 功能：合并贮藏快照中的工作区与暂存区文件，去重后供展示。
 * 参数：entry - 单条贮藏记录。
 * 返回值：文件路径数组。
 */
const stashFilePaths = (entry: StashEntry) => {
  /** 工作区文件路径 */
  const workingPaths = entry.workingTree ? Object.keys(entry.workingTree) : [];
  /** 暂存区文件路径 */
  const indexPaths = entry.index ? Object.keys(entry.index) : [];
  /** 去重后的路径集合 */
  const pathSet = new Set([...workingPaths, ...indexPaths]);
  return Array.from(pathSet);
};
</script>

<template>
  <div class="working-tree-panel">
    <div class="head-badge working-tree-head">
      HEAD →
      <strong>{{ state.head.type === 'branch' ? state.head.ref : state.head.ref.slice(0, 7) }}</strong>
      <span v-if="state.head.type === 'detached'" class="working-tree-detached">（分离 HEAD）</span>
    </div>

    <div class="working-tree-scroll dark-scroll">
      <ul class="file-list">
        <li v-for="(file, path) in state.workingTree" :key="path" class="file-item">
          <span class="file-path">{{ path }}</span>
          <span class="file-status" :class="file.status">{{ fileStatusLabel(file.status) }}</span>
        </li>
      </ul>
      <p v-if="Object.keys(state.workingTree).length === 0 && stashList.length === 0" class="empty-hint">工作区为空</p>

      <div v-if="stashList.length > 0" class="working-tree-stash">
        <p class="working-tree-section-title">储藏区</p>
        <ul class="stash-list">
          <li v-for="entry in stashList" :key="entry.id" class="stash-item">
            <div class="stash-item-head">
              <span class="stash-id">{{ entry.id }}</span>
              <span v-if="entry.message" class="stash-message">{{ entry.message }}</span>
            </div>
            <ul v-if="stashFilePaths(entry).length > 0" class="stash-file-list">
              <li v-for="path in stashFilePaths(entry)" :key="`${entry.id}-${path}`" class="stash-file-item">
                {{ path }}
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="Object.keys(state.index).length > 0" class="staging-banner working-tree-footer">
      暂存区：{{ Object.keys(state.index).join('、') }}
    </div>
    <div v-if="Object.keys(state.conflicts).length > 0" class="conflict-banner working-tree-footer">
      冲突：{{ Object.keys(state.conflicts).join('、') }}
    </div>
  </div>
</template>
