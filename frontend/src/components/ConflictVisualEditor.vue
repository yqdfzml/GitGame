<script setup lang="ts">
import { ref, watch } from "vue";
import type { ConflictFile } from "../types";

/**
 * 可视化冲突文件编辑器。
 * 功能：高亮冲突区域，支持手改或一键取我方/对方版本。
 */

const props = defineProps<{
  /** 是否显示编辑器 */
  show: boolean;
  /** 正在编辑的文件路径 */
  path: string;
  /** 工作区中的冲突标记全文 */
  content: string;
  /** 冲突元信息，含 base/ours/theirs */
  conflict: ConflictFile | null;
}>();

const emit = defineEmits<{
  /** 更新显示状态 */
  "update:show": [value: boolean];
  /** 保存解决后的内容 */
  save: [content: string];
}>();

/** 编辑器中的草稿内容 */
const draftContent = ref("");
/** 保存前的校验提示 */
const saveError = ref("");

/**
 * 弹窗打开时同步工作区内容到草稿。
 * 功能：每次 show 变为 true 时重置编辑区。
 * 参数：无（监听 props.show）。
 * 返回值：无。
 */
watch(
  () => props.show,
  (visible) => {
    if (!visible) {
      return;
    }
    draftContent.value = props.content;
    saveError.value = "";
  },
);

/**
 * 关闭编辑器且不保存。
 * 功能：隐藏弹窗并清空错误提示。
 * 参数：无。
 * 返回值：无。
 */
const closeEditor = () => {
  saveError.value = "";
  emit("update:show", false);
};

/**
 * 判断文本是否仍含冲突标记。
 * 功能：保存前在前端做一次快速校验。
 * 参数：text - 待保存全文。
 * 返回值：true 表示仍有未清理的标记。
 */
const stillHasMarkers = (text: string): boolean => {
  return text.includes("<<<<<<<")
    || text.includes("=======")
    || text.includes(">>>>>>>");
};

/**
 * 将草稿替换为当前分支（HEAD）版本。
 * 功能：一键采用 ours 侧内容。
 * 参数：无。
 * 返回值：无。
 */
const applyOurs = () => {
  if (!props.conflict) {
    return;
  }
  draftContent.value = props.conflict.ours;
  saveError.value = "";
};

/**
 * 将草稿替换为合并分支版本。
 * 功能：一键采用 theirs 侧内容。
 * 参数：无。
 * 返回值：无。
 */
const applyTheirs = () => {
  if (!props.conflict) {
    return;
  }
  draftContent.value = props.conflict.theirs;
  saveError.value = "";
};

/**
 * 提交解决后的文件内容。
 * 功能：校验无冲突标记后通知父组件保存。
 * 参数：无。
 * 返回值：无。
 */
const submitSave = () => {
  if (stillHasMarkers(draftContent.value)) {
    saveError.value = "请删除所有冲突标记（<<<<<<< / ======= / >>>>>>>）后再保存";
    return;
  }
  saveError.value = "";
  emit("save", draftContent.value);
};
</script>

<template>
  <div v-if="show" class="conflict-editor-overlay" @click.self="closeEditor">
    <div class="conflict-editor card">
      <div class="conflict-editor-head">
        <h2 class="conflict-editor-title">编辑冲突文件</h2>
        <span class="conflict-editor-path">{{ path }}</span>
      </div>

      <div v-if="conflict" class="conflict-editor-legend">
        <span class="conflict-legend-item ours">当前分支 (HEAD)</span>
        <span class="conflict-legend-item theirs">合并分支</span>
      </div>

      <textarea
        v-model="draftContent"
        class="conflict-editor-textarea dark-scroll"
        spellcheck="false"
      />

      <p v-if="saveError" class="conflict-editor-error">{{ saveError }}</p>

      <div class="conflict-editor-actions">
        <button type="button" class="btn-ghost" @click="applyOurs">取当前分支</button>
        <button type="button" class="btn-ghost" @click="applyTheirs">取合并分支</button>
        <span class="conflict-editor-actions-spacer" />
        <button type="button" class="btn-ghost" @click="closeEditor">取消</button>
        <button type="button" class="btn-primary" @click="submitSave">保存</button>
      </div>
    </div>
  </div>
</template>
