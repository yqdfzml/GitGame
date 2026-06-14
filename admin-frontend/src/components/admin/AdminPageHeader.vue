<script setup lang="ts">
/**
 * 管理后台页面标题区。
 * 功能：展示模块标题与描述，右侧放主操作按钮。
 * 参数：title - 页面标题；description - 可选说明文案。
 * 返回值：通过 actions 插槽渲染操作按钮。
 */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="admin-page-header">
    <div class="admin-page-header-text">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>
