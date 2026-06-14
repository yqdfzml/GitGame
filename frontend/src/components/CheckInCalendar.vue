<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { pointsApi } from "../api/client";
import type { CheckInCalendarResponse } from "../types";
import {
  buildCheckInCalendarGrid,
  formatCheckInCellTitle,
  type CheckInCalendarCell,
} from "../utils/checkInCalendar";

/** 日历 API 原始数据 */
const calendarData = ref<CheckInCalendarResponse | null>(null);
/** 是否正在加载 */
const loading = ref(true);
/** 加载失败时的错误信息 */
const error = ref("");

/**
 * 拉取签到日历数据。
 * 功能：从后端获取近一年签到记录并渲染热力图。
 * 参数：无。
 * 返回值：Promise<CheckInCalendarResponse | null>。
 */
const loadCalendar = () => {
  loading.value = true;
  error.value = "";

  return pointsApi
    .checkInCalendar()
    .then((data) => {
      calendarData.value = data;
      return data;
    })
    .catch((err: Error) => {
      calendarData.value = null;
      error.value = err.message;
      return null;
    })
    .finally(() => {
      loading.value = false;
    });
};

onMounted(loadCalendar);

defineExpose({
  loadCalendar,
});

/** 构建后的网格数据 */
const calendarGrid = computed(() => {
  if (!calendarData.value) {
    return null;
  }
  return buildCheckInCalendarGrid(calendarData.value);
});

/** 热力图图例等级 */
const legendLevels = [0, 1, 2, 3, 4];

/**
 * 获取日历格 CSS 等级类名。
 * 功能：映射到不同深度的绿色。
 * 参数：cell - 日历格数据。
 * 返回值：CSS class 字符串。
 */
const cellClass = (cell: CheckInCalendarCell) => {
  if (!cell.date) {
    return "check-in-cell check-in-cell--empty";
  }
  return `check-in-cell check-in-cell--${cell.level}`;
};
</script>

<template>
  <section class="check-in-calendar card">
    <div class="check-in-calendar-head">
      <span class="check-in-calendar-title">签到记录</span>
      <span v-if="calendarGrid" class="check-in-calendar-count">近一年 {{ calendarGrid.totalCheckIns }} 天</span>
    </div>

    <div v-if="loading" class="check-in-calendar-loading">加载签到记录...</div>
    <p v-else-if="error" class="error-msg check-in-calendar-error">{{ error }}</p>

    <template v-else-if="calendarGrid">
      <div class="check-in-calendar-body">
        <div class="check-in-calendar-months" aria-hidden="true">
          <span
            v-for="item in calendarGrid.monthLabels"
            :key="`${item.weekIndex}-${item.label}`"
            class="check-in-calendar-month"
            :style="{ left: `${item.weekIndex * 14}px` }"
          >
            {{ item.label }}
          </span>
        </div>

        <div class="check-in-calendar-grid-wrap">
          <div class="check-in-calendar-weekdays" aria-hidden="true">
            <span>一</span>
            <span>三</span>
            <span>五</span>
          </div>

          <div class="check-in-calendar-grid">
            <div
              v-for="(weekColumn, weekIndex) in calendarGrid.weekColumns"
              :key="weekIndex"
              class="check-in-calendar-week"
            >
              <span
                v-for="(cell, dayIndex) in weekColumn"
                :key="`${weekIndex}-${dayIndex}`"
                :class="cellClass(cell)"
                :title="formatCheckInCellTitle(cell)"
              />
            </div>
          </div>
        </div>

        <div class="check-in-calendar-legend" aria-hidden="true">
          <span>少</span>
          <span
            v-for="level in legendLevels"
            :key="level"
            :class="`check-in-cell check-in-cell--${level}`"
          />
          <span>多</span>
        </div>
      </div>
    </template>
  </section>
</template>
