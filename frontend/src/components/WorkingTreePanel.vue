<script setup lang="ts">
import { computed, ref } from "vue";
import type { RepoState, StashEntry } from "../types";
import { buildBranchColorMap, getBranchColor, getHeadBranchName } from "../utils/branchColors";
import { fileStatusLabel } from "../utils/fileStatusLabel";

const props = defineProps<{
  /** 当前仓库状态 */
  state: RepoState;
}>();

const emit = defineEmits<{
  /** 点击冲突文件，请求打开编辑器 */
  "edit-conflict": [path: string];
}>();

/** 贮藏栈列表，无数据时为空数组 */
const stashList = computed(() => props.state.stash ?? []);

/** 分支名到颜色的映射 */
const branchColorMap = computed(() => buildBranchColorMap(Object.keys(props.state.branches)));

/** HEAD 当前所在分支名 */
const headBranchName = computed(() => getHeadBranchName(props.state));

/** 当前分支在 HEAD 行使用的颜色 */
const headBranchColor = computed(() => {
  if (!headBranchName.value) {
    return "var(--accent)";
  }
  return getBranchColor(headBranchName.value, branchColorMap.value);
});

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

/** 当前处于冲突状态的文件路径集合 */
const conflictPathSet = computed(() => new Set(Object.keys(props.state.conflicts)));

/**
 * 判断文件是否处于冲突状态。
 * 功能：为冲突文件行添加可点击样式。
 * 参数：path - 文件路径。
 * 返回值：true 表示该文件有未解决冲突。
 */
const isConflictFile = (path: string): boolean => {
  return conflictPathSet.value.has(path);
};

/**
 * 点击冲突文件时通知父组件打开编辑器。
 * 功能：仅冲突文件响应点击。
 * 参数：path - 被点击的文件路径。
 * 返回值：无。
 */
const handleFileClick = (path: string) => {
  if (!isConflictFile(path)) {
    return;
  }
  emit("edit-conflict", path);
};
</script>

<template>
  <div class="working-tree-panel">
    <div class="head-badge working-tree-head">
      HEAD →
      <strong
        class="working-tree-head-branch"
        :style="{ '--branch-color': headBranchColor }"
      >{{ state.head.type === 'branch' ? state.head.ref : state.head.ref.slice(0, 7) }}</strong>
      <span v-if="state.head.type === 'detached'" class="working-tree-detached">（分离 HEAD）</span>
    </div>

    <div class="working-tree-scroll dark-scroll">
      <ul class="file-list">
        <li
          v-for="(file, path) in state.workingTree"
          :key="path"
          class="file-item"
          :class="{ 'file-item-conflict': isConflictFile(path) }"
          @click="handleFileClick(path)"
        >
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
      冲突：{{ Object.keys(state.conflicts).join('、') }}（点击文件可编辑）
    </div>
  </div>
</template>
