<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { adminAttemptsApi } from "../api/client";
import AdminListState from "../components/admin/AdminListState.vue";
import AdminPageHeader from "../components/admin/AdminPageHeader.vue";
import type { AdminAttemptDetail } from "../types/admin";
import { difficultyLabel, getChapterLabel } from "@shared/utils/levelPresentation";

const route = useRoute();
const router = useRouter();

/** attempt id??????? */
const attemptId = String(route.params.id);
/** attempt ?? */
const attemptDetail = ref<AdminAttemptDetail | null>(null);
/** ????? */
const detailLoading = ref(true);
/** ???? */
const detailError = ref("");
/** ????? */
const playerBaseUrl = import.meta.env.VITE_PLAYER_URL ?? "http://localhost:5173";

/**
 * ?? attempt ???
 * ???????????????
 * ?????
 * ??????
 */
const loadAttemptDetail = () => {
  detailLoading.value = true;
  detailError.value = "";

  adminAttemptsApi
    .getAttempt(attemptId)
    .then((detail) => {
      attemptDetail.value = detail;
    })
    .catch((err: Error) => {
      detailError.value = err.message;
    })
    .finally(() => {
      detailLoading.value = false;
    });
};

/**
 * ????????
 * ???? ISO ????????????
 * ???value - ?????? null?
 * ?????????
 */
const formatDateTime = (value: string | null) => {
  if (!value) {
    return "?";
  }
  return new Date(value).toLocaleString("zh-CN");
};

/**
 * ?????????
 * ????????????????
 * ?????
 * ??????
 */
const goToReplay = () => {
  window.open(`${playerBaseUrl}/replay/${attemptId}`, "_blank");
};

/**
 * ????????
 * ???? attempt ??????????
 * ?????
 * ??????
 */
const goToUser = () => {
  if (!attemptDetail.value) {
    return;
  }
  router.push({ name: "user-detail", params: { id: attemptDetail.value.user.id } });
};

/**
 * ?? attempt ???
 * ??????????
 * ?????
 * ??????
 */
const backToList = () => {
  router.push({ name: "attempts" });
};

/** ?????? */
const statusLabelMap: Record<string, string> = {
  IN_PROGRESS: "???",
  COMPLETED: "???",
  ABANDONED: "???",
};

onMounted(() => {
  loadAttemptDetail();
});
</script>

<template>
  <section class="admin-attempt-detail-page">
    <AdminPageHeader title="Attempt ??" description="??????????????????">
      <template #actions>
        <button class="btn-ghost" @click="backToList">????</button>
        <button class="btn-primary" :disabled="!attemptDetail" @click="goToReplay">????</button>
      </template>
    </AdminPageHeader>

    <AdminListState
      :loading="detailLoading"
      :error="detailError"
      :empty="!attemptDetail && !detailLoading && !detailError"
      empty-text="???????"
    >
      <template v-if="attemptDetail">
        <div class="admin-attempt-detail-grid">
          <section class="card admin-user-stats-panel">
            <h3>????</h3>
            <p><strong>{{ attemptDetail.user.displayName }}</strong></p>
            <p>{{ attemptDetail.user.email }}</p>
            <button class="btn-ghost admin-table-btn" @click="goToUser">????</button>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>????</h3>
            <p><strong>{{ attemptDetail.level.title }}</strong></p>
            <p>
              {{ getChapterLabel(attemptDetail.level.chapterId) }}
              · {{ difficultyLabel(attemptDetail.level.difficulty) }}
            </p>
            <p>?? ID {{ attemptDetail.level.id }}</p>
          </section>

          <section class="card admin-user-stats-panel">
            <h3>????</h3>
            <p>???{{ statusLabelMap[attemptDetail.status] ?? attemptDetail.status }}</p>
            <p>???{{ attemptDetail.stepCount }}</p>
            <p>???{{ formatDateTime(attemptDetail.startedAt) }}</p>
            <p>???{{ formatDateTime(attemptDetail.completedAt) }}</p>
          </section>
        </div>

        <section class="card admin-user-attempts">
          <h3>????</h3>
          <template v-if="attemptDetail.commands.length > 0">
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>??</th>
                    <th>??</th>
                    <th>??</th>
                    <th>??</th>
                    <th>??</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="command in attemptDetail.commands" :key="command.stepIndex">
                    <td>{{ command.stepIndex }}</td>
                    <td class="mono">{{ command.command }}</td>
                    <td>
                      <span class="result-tag" :class="command.success ? 'ok' : 'fail'">
                        {{ command.success ? "??" : "??" }}
                      </span>
                    </td>
                    <td>{{ command.feedback ?? "?" }}</td>
                    <td>{{ formatDateTime(command.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <p v-else class="admin-user-empty-hint">??????</p>
        </section>
      </template>
    </AdminListState>
  </section>
</template>
