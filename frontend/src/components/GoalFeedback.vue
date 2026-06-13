<script setup lang="ts">
import type { JudgeResult } from "../types";

defineProps<{
  /** 判题结果 */
  judge: JudgeResult;
  /** 目标提示列表 */
  goalHints: string[];
  /** 完成进度百分比 */
  progressPct: number;
}>();
</script>

<template>
  <div>
    <div class="goal-progress">
      <div class="progress-ring" :style="{ '--pct': progressPct }">
        <div class="progress-ring-inner">{{ progressPct }}%</div>
      </div>
      <div class="goal-progress-text">
        <strong>{{ judge.passed ? '目标已达成' : '距离通关' }}</strong>
        已满足 {{ judge.satisfied.length }} 项，剩余 {{ judge.gaps.length }} 项
      </div>
    </div>

    <p class="panel-title">目标提示</p>
    <ul class="hint-list">
      <li v-for="(hint, i) in goalHints" :key="i">{{ hint }}</li>
      <li v-if="goalHints.length === 0" class="empty-hint">暂无提示</li>
    </ul>

    <p class="panel-title">已达成</p>
    <ul class="satisfied-list">
      <li v-for="item in judge.satisfied" :key="item" class="satisfied-item">{{ item }}</li>
      <li v-if="judge.satisfied.length === 0" class="empty-hint">暂无</li>
    </ul>

    <p class="panel-title">差距</p>
    <ul class="gap-list">
      <li v-for="gap in judge.gaps" :key="gap.key + gap.message" class="gap-item">{{ gap.message }}</li>
      <li v-if="judge.gaps.length === 0" class="empty-hint" style="color:var(--accent-2)">全部达成！</li>
    </ul>
  </div>
</template>
