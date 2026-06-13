<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import type { LevelSummary } from "../types";
import { difficultyLabel, getLevelPresentation, kindIconMap } from "../utils/levelPresentation";

const props = defineProps<{
  /** 关卡数据 */
  level: LevelSummary;
  /** 在章节内的序号，从 1 开始 */
  index: number;
  /** 是否已通关 */
  completed?: boolean;
}>();

/** 当前关卡的展示元数据 */
const presentation = getLevelPresentation(props.level.chapterId);
/** 对应技能图标组件 */
const KindIcon = kindIconMap[presentation.kind];
/** 卡片状态：open=可挑战，done=已完成 */
const statusClass = props.completed ? "done" : "open";
/** 状态徽章文案 */
const statusLabel = props.completed ? "已完成" : "可挑战";
</script>

<template>
  <RouterLink :to="`/practice/${level.id}`" class="challenge-card" :class="statusClass">
    <span class="challenge-index">{{ String(index).padStart(2, "0") }}</span>
    <div class="challenge-icon-wrap">
      <KindIcon aria-hidden="true" />
    </div>
    <span class="challenge-body">
      <span class="challenge-head">
        <strong>{{ level.title }}</strong>
        <span class="challenge-badge" :class="statusClass">{{ statusLabel }}</span>
      </span>
      <small>{{ presentation.skillLabel }}</small>
      <small>{{ difficultyLabel(level.difficulty) }} · {{ level.description }}</small>
    </span>
    <ChevronRight class="challenge-arrow" aria-hidden="true" />
  </RouterLink>
</template>
