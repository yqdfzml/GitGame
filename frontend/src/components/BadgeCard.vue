<script setup lang="ts">
import type { BadgeItem } from "../types";

defineProps<{
  /** 徽章数据 */
  badge: BadgeItem;
}>();

/**
 * 根据视觉档位返回边框样式 class。
 * 功能：1-3 朴素，4-6 能量，7-8 空间，9-10 法相。
 * 参数：visualTier - 视觉档位。
 * 返回值：CSS class 名。
 */
const tierClass = (visualTier: number) => {
  if (visualTier >= 4) return "badge-tier-legend";
  if (visualTier >= 3) return "badge-tier-cosmic";
  if (visualTier >= 2) return "badge-tier-energy";
  return "badge-tier-wood";
};

/**
 * 根据 iconKey 返回徽章中心符号。
 * 功能：第一版用 Git 图谱符号代替完整插画。
 * 参数：iconKey - 图标 key。
 * 返回值：展示字符。
 */
const iconSymbol = (iconKey: string) => {
  const map: Record<string, string> = {
    "wood-token": "◎",
    "spirit-stone": "●",
    "bamboo-scroll": "▭",
    "golden-core": "◉",
    "merge-rivers": "⎇",
    "time-wheel": "↺",
    "star-pick": "✦",
    "fate-disk": "☉",
    "full-graph": "⋗",
    "immortal-seal": "✧",
    "eye-status": "👁",
    "commit-seal": "●",
    "branch-split": "⎇",
    "merge-flow": "⧉",
    "jade-mend": "◆",
    "hourglass-head": "⏳",
    "star-hand": "✦",
    "fate-reset": "↺",
    "stash-bag": "▣",
    "clean-mirror": "○",
    "dual-path": "⎔",
    "rejoin-branch": "↩",
    "straight-line": "→",
    "steady-mountain": "▲",
    "blank-scroll": "▯",
    "stash-pocket": "▣",
    "tag-monument": "⚑",
    "cherry-star": "✦",
    "rebase-vein": "↯",
    "debug-trail": "◎",
    "all-veins": "⎔",
    "stash-save": "▣",
    "stash-recover": "↩",
    "tag-mark": "⚑",
    "cherry-seal": "✧",
    "rebase-order": "↯",
    "rebase-continue": "⟳",
    "reflog-light": "☀",
    "bisect-half": "½",
    "clean-five": "○",
    "low-steps": "→",
    "score-300": "100",
    "score-600": "200",
    "no-fail-five": "▲",
    "recovery-three": "↩",
    "multi-path-three": "⎔",
    "full-clear-plus": "✧",
  };
  return map[iconKey] ?? "◈";
};
</script>

<template>
  <div
    class="badge-card"
    :class="[tierClass(badge.visualTier), badge.unlocked ? 'unlocked' : 'locked']"
    :style="{ '--badge-color': badge.color }"
  >
    <div class="badge-icon-ring">
      <div class="badge-icon-inner">{{ iconSymbol(badge.iconKey) }}</div>
    </div>
    <div class="badge-body">
      <div class="badge-head">
        <strong>{{ badge.name }}</strong>
        <span v-if="badge.titleLevel" class="badge-level">Lv.{{ badge.titleLevel }}</span>
      </div>
      <p class="badge-desc">{{ badge.description }}</p>
      <p class="badge-ability">{{ badge.ability }}</p>
    </div>
    <span v-if="badge.unlocked" class="badge-status unlocked">已解锁</span>
    <span v-else class="badge-status locked">未解锁</span>
  </div>
</template>
