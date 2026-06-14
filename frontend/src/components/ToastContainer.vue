<script setup lang="ts">
import { Check, Info, X } from "lucide-vue-next";
import { useToastStore } from "../stores/toast";

/** Toast Store，驱动弹窗列表 */
const toastStore = useToastStore();

/**
 * 关闭指定 Toast。
 * 功能：用户点击关闭按钮时立即移除。
 * 参数：id - Toast id。
 * 返回值：无。
 */
const closeToast = (id: number) => {
  toastStore.dismiss(id);
};
</script>

<template>
  <div class="toast-container" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast-slide">
      <div
        v-for="item in toastStore.toasts"
        :key="item.id"
        class="toast-item"
        :class="`toast-item--${item.kind}`"
        role="status"
      >
        <span
          class="toast-icon"
          :class="{ 'toast-icon--emoji': item.emoji }"
          aria-hidden="true"
        >
          <span v-if="item.emoji" class="toast-emoji">{{ item.emoji }}</span>
          <Check v-else-if="item.kind === 'success'" />
          <Info v-else />
        </span>
        <p class="toast-message">{{ item.message }}</p>
        <button
          type="button"
          class="toast-close"
          aria-label="关闭提示"
          @click="closeToast(item.id)"
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
