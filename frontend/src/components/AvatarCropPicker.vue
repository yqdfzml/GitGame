<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import {
  NButton,
  NModal,
  NSlider,
  NSpace,
  NText,
} from "naive-ui";

const emit = defineEmits<{
  /** 用户确认裁剪后通知父组件 */
  change: [file: File | null];
}>();

/** 隐藏的文件选择 input */
const fileInputRef = ref<HTMLInputElement | null>(null);
/** 裁剪弹窗是否打开 */
const modalOpen = ref(false);
/** 弹窗内原图地址 */
const sourceUrl = ref("");
/** 弹窗内裁剪预览地址 */
const draftPreviewUrl = ref("");
/** 已确认的头像预览地址 */
const confirmedPreviewUrl = ref("");
/** 缩放倍数 */
const zoom = ref(1);
/** 原图是否加载完成 */
const imageReady = ref(false);
/** 当前原图元素 */
const imageEl = ref<HTMLImageElement | null>(null);
/** 弹窗内待确认的裁剪文件 */
const draftFile = ref<File | null>(null);

/**
 * 打开文件选择器。
 * 功能：挑选头像原图后进入裁剪弹窗。
 * 参数：无。
 * 返回值：无。
 */
const pickImage = () => {
  fileInputRef.value?.click();
};

/**
 * 处理原图选择。
 * 功能：加载图片并打开裁剪弹窗。
 * 参数：event - input change 事件。
 * 返回值：无。
 */
const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value);
  }
  if (draftPreviewUrl.value) {
    URL.revokeObjectURL(draftPreviewUrl.value);
  }

  sourceUrl.value = URL.createObjectURL(file);
  draftPreviewUrl.value = "";
  draftFile.value = null;
  zoom.value = 1;
  imageReady.value = false;
  imageEl.value = null;
  modalOpen.value = true;
  input.value = "";
};

/**
 * 原图加载完成后生成裁剪预览。
 * 功能：记录图片尺寸并导出草稿头像。
 * 参数：event - img load 事件。
 * 返回值：无。
 */
const handleImageLoad = (event: Event) => {
  imageEl.value = event.target as HTMLImageElement;
  imageReady.value = true;
  exportDraftAvatar();
};

/**
 * 导出弹窗内的裁剪头像草稿。
 * 功能：按当前缩放裁切为 256x256 JPEG。
 * 参数：无。
 * 返回值：Promise<File | null> 裁剪文件。
 */
const exportDraftAvatar = (): Promise<File | null> => {
  const img = imageEl.value;
  if (!img || !imageReady.value) {
    draftFile.value = null;
    return Promise.resolve(null);
  }

  const outputSize = 256;
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    draftFile.value = null;
    return Promise.resolve(null);
  }

  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const cropSize = minSide / zoom.value;
  const sx = (img.naturalWidth - cropSize) / 2;
  const sy = (img.naturalHeight - cropSize) / 2;

  ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        draftFile.value = null;
        resolve(null);
        return;
      }

      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      if (draftPreviewUrl.value) {
        URL.revokeObjectURL(draftPreviewUrl.value);
      }
      draftPreviewUrl.value = URL.createObjectURL(file);
      draftFile.value = file;
      resolve(file);
    }, "image/jpeg", 0.9);
  });
};

/**
 * 确认使用当前裁剪结果。
 * 功能：关闭弹窗并通知父组件。
 * 参数：无。
 * 返回值：无。
 */
const confirmCrop = () => {
  if (!draftFile.value) {
    return;
  }

  if (confirmedPreviewUrl.value) {
    URL.revokeObjectURL(confirmedPreviewUrl.value);
  }
  confirmedPreviewUrl.value = draftPreviewUrl.value;
  draftPreviewUrl.value = "";
  emit("change", draftFile.value);
  modalOpen.value = false;
};

/**
 * 取消裁剪弹窗。
 * 功能：关闭弹窗并丢弃未确认的草稿。
 * 参数：无。
 * 返回值：无。
 */
const cancelCrop = () => {
  modalOpen.value = false;
  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value);
    sourceUrl.value = "";
  }
  if (draftPreviewUrl.value) {
    URL.revokeObjectURL(draftPreviewUrl.value);
    draftPreviewUrl.value = "";
  }
  draftFile.value = null;
  imageReady.value = false;
  imageEl.value = null;
};

watch(zoom, () => {
  exportDraftAvatar();
});

onBeforeUnmount(() => {
  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value);
  }
  if (draftPreviewUrl.value) {
    URL.revokeObjectURL(draftPreviewUrl.value);
  }
  if (confirmedPreviewUrl.value) {
    URL.revokeObjectURL(confirmedPreviewUrl.value);
  }
});
</script>

<template>
  <div class="avatar-picker-root">
    <div class="avatar-picker-trigger">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="avatar-crop-input"
      @change="handleFileChange"
    />

    <button type="button" class="avatar-picker-preview" @click="pickImage">
      <img v-if="confirmedPreviewUrl" :src="confirmedPreviewUrl" alt="头像预览" />
      <span v-else class="avatar-picker-placeholder">+</span>
    </button>

    <div class="avatar-picker-meta">
      <NButton secondary size="small" @click="pickImage">
        {{ confirmedPreviewUrl ? "重新裁剪头像" : "选择并裁剪头像" }}
      </NButton>
      <NText depth="3" class="avatar-picker-hint">点击头像或按钮，在弹窗中完成裁剪</NText>
    </div>
  </div>

  <NModal
    v-model:show="modalOpen"
    preset="card"
    title="裁剪头像"
    :style="{ width: '420px', maxWidth: '92vw' }"
    :mask-closable="false"
    @close="cancelCrop"
  >
    <div class="avatar-crop-modal">
      <div class="avatar-crop-stage">
        <img
          v-if="sourceUrl"
          :src="sourceUrl"
          alt="头像原图"
          class="avatar-crop-source"
          @load="handleImageLoad"
        />
        <span v-if="sourceUrl" class="avatar-crop-mask" />
      </div>

      <div class="avatar-crop-controls">
        <NText depth="3">缩放</NText>
        <NSlider v-model:value="zoom" :min="1" :max="2.5" :step="0.05" />
      </div>

      <div class="avatar-crop-modal-preview">
        <NText depth="3">预览</NText>
        <div class="avatar-crop-preview-wrap">
          <img v-if="draftPreviewUrl" :src="draftPreviewUrl" alt="裁剪预览" class="avatar-crop-preview" />
          <span v-else class="avatar-crop-preview-empty">调整缩放后预览</span>
        </div>
      </div>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="cancelCrop">取消</NButton>
        <NButton type="primary" :disabled="!draftFile" @click="confirmCrop">确认使用</NButton>
      </NSpace>
    </template>
  </NModal>
  </div>
</template>
