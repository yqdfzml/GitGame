<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

const emit = defineEmits<{
  /** 裁剪完成或清空时通知父组件 */
  change: [file: File | null];
}>();

/** 隐藏的文件选择 input */
const fileInputRef = ref<HTMLInputElement | null>(null);
/** 原图预览地址 */
const sourceUrl = ref("");
/** 裁剪预览地址 */
const previewUrl = ref("");
/** 缩放倍数，1 为默认居中裁剪 */
const zoom = ref(1);
/** 是否已加载原图 */
const imageReady = ref(false);
/** 当前加载的原图元素 */
const imageEl = ref<HTMLImageElement | null>(null);

/**
 * 打开系统文件选择器。
 * 功能：让用户挑选头像原图。
 * 参数：无。
 * 返回值：无。
 */
const pickImage = () => {
  fileInputRef.value?.click();
};

/**
 * 处理原图选择。
 * 功能：读取文件并展示裁剪区域。
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
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }

  sourceUrl.value = URL.createObjectURL(file);
  previewUrl.value = "";
  zoom.value = 1;
  imageReady.value = false;
  imageEl.value = null;
  emit("change", null);
};

/**
 * 原图加载完成后记录尺寸并生成预览。
 * 功能：后续缩放与导出都依赖 naturalWidth/Height。
 * 参数：event - img load 事件。
 * 返回值：无。
 */
const handleImageLoad = (event: Event) => {
  imageEl.value = event.target as HTMLImageElement;
  imageReady.value = true;
  exportCroppedAvatar();
};

/**
 * 导出圆形裁剪头像。
 * 功能：按当前缩放从原图中心裁切为 256x256 JPEG。
 * 参数：无。
 * 返回值：Promise<File | null> 裁剪文件。
 */
const exportCroppedAvatar = (): Promise<File | null> => {
  const img = imageEl.value;
  if (!img || !imageReady.value) {
    emit("change", null);
    return Promise.resolve(null);
  }

  const outputSize = 256;
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    emit("change", null);
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
        emit("change", null);
        resolve(null);
        return;
      }

      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value);
      }
      previewUrl.value = URL.createObjectURL(file);
      emit("change", file);
      resolve(file);
    }, "image/jpeg", 0.9);
  });
};

watch(zoom, () => {
  exportCroppedAvatar();
});

onBeforeUnmount(() => {
  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value);
  }
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<template>
  <div class="avatar-crop-picker">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="avatar-crop-input"
      @change="handleFileChange"
    />

    <div class="avatar-crop-main">
      <div class="avatar-crop-stage" :class="{ empty: !sourceUrl }">
        <img
          v-if="sourceUrl"
          :src="sourceUrl"
          alt="头像原图"
          class="avatar-crop-source"
          @load="handleImageLoad"
        />
        <button v-else type="button" class="avatar-crop-placeholder" @click="pickImage">
          选择头像图片
        </button>
        <span v-if="sourceUrl" class="avatar-crop-mask" />
      </div>

      <div class="avatar-crop-side">
        <span class="avatar-crop-label">预览</span>
        <div class="avatar-crop-preview-wrap">
          <img v-if="previewUrl" :src="previewUrl" alt="头像预览" class="avatar-crop-preview" />
          <span v-else class="avatar-crop-preview-empty">未选择</span>
        </div>

        <label v-if="sourceUrl" class="avatar-crop-zoom">
          <span>缩放</span>
          <input v-model.number="zoom" type="range" min="1" max="2.5" step="0.05" />
        </label>

        <button v-if="sourceUrl" type="button" class="btn-ghost avatar-crop-repick" @click="pickImage">
          重新选择
        </button>
      </div>
    </div>
  </div>
</template>
