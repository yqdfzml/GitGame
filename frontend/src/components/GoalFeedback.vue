<script setup lang="ts">
import { computed } from "vue";
import type { JudgeResult } from "../types";
import { calcResolvedCount } from "../utils/challengeProgress";

const props = defineProps<{
  /** 判题结果 */
  judge: JudgeResult;
  /** 关卡任务说明 */
  taskDescription: string;
  /** 完成进度百分比 */
  progressPct: number;
  /** 开局时的差距项数量，进度从 0 起算 */
  initialGapCount?: number;
  /** 开局时已满足的条件 key，用于「已达成」展示 */
  initialSatisfiedKeys?: string[];
}>();

/** 玩家本轮需消除的差距项总数（等于开局差距项数） */
const targetCount = computed(() => props.initialGapCount ?? 0);

/** 玩家本轮已消除的差距项数量 */
const resolvedCount = computed(() => {
  if (props.initialGapCount === undefined) {
    return props.judge.satisfied.length;
  }
  return calcResolvedCount(props.judge, props.initialGapCount);
});

/** 本轮玩家新达成的条件 */
const visibleSatisfied = computed(() => {
  const baseline = props.initialSatisfiedKeys ?? [];
  return props.judge.satisfied.filter((item) => !baseline.includes(item));
});

/** 顶部状态文案 */
const statusLabel = computed(() => {
  if (props.judge.passed) {
    return "目标已达成";
  }
  const hasOnlyMinStepsGap =
    props.judge.gaps.length === 1 && props.judge.gaps[0]?.key === "minSteps";
  if (hasOnlyMinStepsGap && props.judge.satisfied.length > 0) {
    return "状态已符合";
  }
  return "距离通关";
});
</script>

<template>
  <div class="goal-feedback">
    <div class="goal-progress">
      <div class="progress-ring" :style="{ '--pct': progressPct }">
        <div class="progress-ring-inner">{{ progressPct }}%</div>
      </div>
      <div class="goal-progress-text">
        <strong>{{ statusLabel }}</strong>
        已完成 {{ resolvedCount }}/{{ targetCount }} 项，剩余 {{ judge.gaps.length }} 项
      </div>
    </div>

    <p class="panel-title">关卡目标</p>
    <p class="task-desc">{{ taskDescription }}</p>

    <p v-if="visibleSatisfied.length > 0" class="panel-title">已达成</p>
    <ul v-if="visibleSatisfied.length > 0" class="satisfied-list">
      <li v-for="item in visibleSatisfied" :key="item" class="satisfied-item">{{ item }}</li>
    </ul>

    <p class="panel-title">待完成</p>
    <ul class="gap-list">
      <li v-for="gap in judge.gaps" :key="gap.key + gap.message" class="gap-item">{{ gap.message }}</li>
      <li v-if="judge.gaps.length === 0" class="empty-hint" style="color:var(--accent-2)">全部达成！</li>
    </ul>
  </div>
</template>
