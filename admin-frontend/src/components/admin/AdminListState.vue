<script setup lang="ts">
/**
 * 管理后台列表状态容器。
 * 功能：统一 loading / error / empty 三种列表态展示。
 * 参数：loading - 是否加载中；error - 错误文案；empty - 是否无数据；emptyText - 空态提示。
 * 返回值：通过默认插槽渲染列表内容。
 */
defineProps<{
  loading: boolean;
  error: string;
  empty: boolean;
  emptyText?: string;
}>();
</script>

<template>
  <div class="admin-list-state">
    <div v-if="loading" class="loading-state admin-list-state-loading">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="admin-list-state-error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="empty" class="admin-list-state-empty">
      <p>{{ emptyText ?? "暂无数据" }}</p>
    </div>

    <slot v-else />
  </div>
</template>
