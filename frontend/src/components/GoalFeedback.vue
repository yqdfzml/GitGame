<script setup lang="ts">
import { computed } from "vue";
import type { JudgeResult } from "../types";

const props = defineProps<{
  /** 判题结果 */
  judge: JudgeResult;
  /** 目标提示列表 */
  goalHints: string[];
  /** 完成进度百分比 */
  progressPct: number;
  /** 开局时的差距项数量，用于展示从 0 开始的完成数 */
  initialGapCount?: number;
  /** 开局时已满足的条件 key，不在「已达成」中重复展示 */
  initialSatisfiedKeys?: string[];
}>();

/** 本轮已消除的差距项数量 */
const resolvedCount = computed(() => {
  if (props.judge.passed) {
    return props.initialGapCount ?? props.judge.satisfied.length;
  }
  if (props.initialGapCount !== undefined) {
    return props.initialGapCount - props.judge.gaps.length;
  }
  return props.judge.satisfied.length;
});

/** 本轮玩家新达成的条件 */
const visibleSatisfied = computed(() => {
  const baseline = props.initialSatisfiedKeys ?? [];
  return props.judge.satisfied.filter((item) => !baseline.includes(item));
});

/** 本轮需要玩家完成的目标项总数 */
const targetCount = computed(() => {
  if (props.initialGapCount !== undefined) {
    return props.initialGapCount;
  }
  return props.judge.satisfied.length + props.judge.gaps.length;
});
</script>

<template>
  <div class="goal-feedback">
    <div class="goal-progress">
      <div class="progress-ring" :style="{ '--pct': progressPct }">
        <div class="progress-ring-inner">{{ progressPct }}%</div>
      </div>
      <div class="goal-progress-text">
        <strong>{{ judge.passed ? '目标已达成' : '距离通关' }}</strong>
        已完成 {{ resolvedCount }}/{{ targetCount }} 项，剩余 {{ judge.gaps.length }} 项
      </div>
    </div>

    <p class="panel-title">目标提示</p>
    <ul class="hint-list">
      <li v-for="(hint, i) in goalHints" :key="i">{{ hint }}</li>
      <li v-if="goalHints.length === 0" class="empty-hint">暂无提示</li>
    </ul>

    <p v-if="visibleSatisfied.length > 0" class="panel-title">已达成</p>
    <ul v-if="visibleSatisfied.length > 0" class="satisfied-list">
      <li v-for="item in visibleSatisfied" :key="item" class="satisfied-item">{{ item }}</li>
    </ul>

    <p class="panel-title">差距</p>
    <ul class="gap-list">
      <li v-for="gap in judge.gaps" :key="gap.key + gap.message" class="gap-item">{{ gap.message }}</li>
      <li v-if="judge.gaps.length === 0" class="empty-hint" style="color:var(--accent-2)">全部达成！</li>
    </ul>
  </div>
</template>
