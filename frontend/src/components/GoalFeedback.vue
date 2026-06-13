<script setup lang="ts">
import type { JudgeResult } from "../types";

defineProps<{
  /** 判题结果 */
  judge: JudgeResult;
  /** 目标提示列表 */
  goalHints: string[];
}>();
</script>

<template>
  <div>
    <div v-if="judge.passed" class="success-msg" style="margin-bottom:12px">
      恭喜通关！得分: {{ judge.score }}
    </div>

    <p class="panel-title">目标提示</p>
    <ul style="margin-bottom:16px;padding-left:16px;color:var(--text-muted);font-size:0.9rem">
      <li v-for="(hint, i) in goalHints" :key="i">{{ hint }}</li>
    </ul>

    <p class="panel-title">已达成</p>
    <ul class="satisfied-list">
      <li v-for="item in judge.satisfied" :key="item" class="satisfied-item">{{ item }}</li>
      <li v-if="judge.satisfied.length === 0" style="color:var(--text-muted);font-size:0.85rem">暂无</li>
    </ul>

    <p class="panel-title" style="margin-top:16px">差距</p>
    <ul class="gap-list">
      <li v-for="gap in judge.gaps" :key="gap.key + gap.message" class="gap-item">{{ gap.message }}</li>
      <li v-if="judge.gaps.length === 0" style="color:var(--accent-2);font-size:0.85rem">全部达成！</li>
    </ul>
  </div>
</template>
