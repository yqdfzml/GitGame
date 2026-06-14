<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { attemptsApi } from "../api/client";
import type { CommandEntry, RepoState } from "../types";
import {
  buildReplaySummary,
  buildReplayTimeline,
  type ReplayTimelineStep,
} from "../utils/replayTimeline";

const route = useRoute();
/** 当前复盘 attempt id */
const attemptId = route.params.attemptId as string;

/** 练习状态 */
const attemptStatus = ref("");
/** 命令历史 */
const commands = ref<CommandEntry[]>([]);
/** 状态快照 */
const snapshots = ref<Array<{ stepIndex: number; state: RepoState }>>([]);
/** 当前视图：timeline 或 log */
const viewMode = ref<"timeline" | "log">("timeline");
/** 加载中 */
const loading = ref(true);
/** 错误信息 */
const error = ref("");

onMounted(() => {
  attemptsApi
    .replay(attemptId)
    .then((data) => {
      attemptStatus.value = data.status;
      commands.value = data.commands;
      snapshots.value = data.snapshots;
    })
    .catch((err: Error) => {
      error.value = err.message;
    })
    .finally(() => {
      loading.value = false;
    });
});

/** 时间线步骤 */
const timelineSteps = computed<ReplayTimelineStep[]>(() => {
  return buildReplayTimeline(commands.value, snapshots.value);
});

/** 复盘摘要 */
const replaySummary = computed(() => buildReplaySummary(timelineSteps.value));

/**
 * 切换复盘视图模式。
 * 功能：默认时间线，可切换到详细日志表格。
 * 参数：mode - 目标视图。
 * 返回值：无。
 */
const switchViewMode = (mode: "timeline" | "log") => {
  viewMode.value = mode;
};
</script>

<template>
  <section class="page-stack replay-page">
    <header class="page-header">
      <h1 class="page-title">通关复盘</h1>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" />
      <span>加载中...</span>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <template v-if="!loading && !error">
      <section class="replay-summary card">
        <div class="replay-summary-main">
          <div class="replay-summary-stats">
            <span>{{ timelineSteps.length }} 步</span>
            <span class="replay-stat-ok">{{ replaySummary.successCount }} 成功</span>
            <span v-if="replaySummary.failCount > 0" class="replay-stat-fail">{{ replaySummary.failCount }} 失败</span>
          </div>
          <p v-if="attemptStatus" class="replay-summary-status">{{ attemptStatus }}</p>
        </div>

        <div class="replay-view-toggle">
          <button
            class="replay-toggle-btn"
            :class="{ active: viewMode === 'timeline' }"
            @click="switchViewMode('timeline')"
          >
            时间线
          </button>
          <button
            class="replay-toggle-btn"
            :class="{ active: viewMode === 'log' }"
            @click="switchViewMode('log')"
          >
            详细日志
          </button>
        </div>
      </section>

      <section v-if="viewMode === 'timeline'" class="replay-timeline card">
        <article
          v-for="step in timelineSteps"
          :key="step.stepIndex"
          class="replay-timeline-item"
          :class="step.success ? 'ok' : 'fail'"
        >
          <div class="replay-timeline-marker">
            <span>{{ step.stepIndex }}</span>
          </div>

          <div class="replay-timeline-body">
            <div class="replay-timeline-head">
              <code class="replay-cmd">{{ step.command }}</code>
              <span class="result-tag" :class="step.success ? 'ok' : 'fail'">
                {{ step.success ? "成功" : "失败" }}
              </span>
            </div>

            <p v-if="step.feedback" class="replay-timeline-feedback">{{ step.feedback }}</p>
            <p v-if="step.output" class="replay-timeline-output">{{ step.output }}</p>

            <div class="replay-timeline-state">
              <span class="replay-timeline-label">状态</span>
              <p>{{ step.stateSummary }}</p>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>步骤</th>
                <th>命令</th>
                <th>结果</th>
                <th>反馈</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cmd in commands" :key="cmd.stepIndex">
                <td class="mono">{{ cmd.stepIndex }}</td>
                <td class="replay-cmd">{{ cmd.command }}</td>
                <td>
                  <span class="result-tag" :class="cmd.success ? 'ok' : 'fail'">
                    {{ cmd.success ? "成功" : "失败" }}
                  </span>
                </td>
                <td>{{ cmd.feedback }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="replay-footer">
        <RouterLink to="/levels" class="btn-ghost">返回学习地图</RouterLink>
      </div>
    </template>
  </section>
</template>
