<script setup lang="ts">
import { computed } from "vue";
import type { LevelSummary } from "../types";
import type { LevelPresentation } from "../utils/levelPresentation";
import { kindIconMap } from "../utils/levelPresentation";

const props = defineProps<{
  /** 主题展示元数据 */
  presentation: LevelPresentation;
  /** 该主题下首关，无则视为未开放 */
  level?: LevelSummary;
  /** 主题内已通关数 */
  completedCount: number;
  /** 主题内关卡总数 */
  totalCount: number;
}>();

/** 对应技能图标组件 */
const KindIcon = kindIconMap[props.presentation.kind];

/** 是否已全部通关，需用 computed 响应异步加载的通关数据 */
const isDone = computed(() => props.totalCount > 0 && props.completedCount >= props.totalCount);

/** 进度文案，如 0/1 或 1/1 */
const progressLabel = computed(() => `${props.completedCount}/${props.totalCount}`);

/** 卡片简短说明：开放关卡用主题描述，未开放用轻提示 */
const cardHint = computed(() =>
  props.level ? props.presentation.topicDesc : props.presentation.lockedHint,
);
</script>

<template>
  <RouterLink
    v-if="level"
    :to="`/practice/${level.id}`"
    class="topic-card"
    :class="{ done: isDone, open: !isDone }"
  >
    <span v-if="isDone" class="topic-status-badge done">已完成</span>
    <span class="topic-icon-box">
      <KindIcon aria-hidden="true" />
    </span>
    <span class="topic-label">{{ presentation.topicLabel }}</span>
    <span class="topic-desc">{{ cardHint }}</span>
    <span class="topic-progress">{{ progressLabel }}</span>
  </RouterLink>
  <div v-else class="topic-card locked" aria-disabled="true">
    <span class="topic-status-badge locked">开发中</span>
    <span class="topic-icon-box">
      <KindIcon aria-hidden="true" />
    </span>
    <span class="topic-label">{{ presentation.topicLabel }}</span>
    <span class="topic-desc">{{ cardHint }}</span>
    <span class="topic-progress">{{ progressLabel }}</span>
  </div>
</template>
