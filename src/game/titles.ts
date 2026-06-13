import type { TitleRule } from "./types";

export const TITLE_RULES: TitleRule[] = [
  {
    id: "initiate",
    name: "初入仓门",
    flavorText: "推开版本之门，尚未落下第一枚道印。",
    unlockCondition: () => true,
  },
  {
    id: "first-commit",
    name: "一念成 Commit",
    flavorText: "以一枚提交立道心，从此代码有迹可循。",
    unlockCondition: (_profile, result) => result.challengeId === "first-commit",
  },
  {
    id: "steady-cultivator",
    name: "稳态修士",
    flavorText: "连续破三关，心法渐稳，工作区不乱。",
    unlockCondition: (profile) => profile.completedChallengeIds.length >= 3,
  },
  {
    id: "flawless-mind",
    name: "无瑕剑心",
    flavorText: "单关满分，命令如剑，不偏不倚。",
    unlockCondition: (_profile, result) => result.score === 100,
  },
  {
    id: "staging-mage",
    name: "暂存术士",
    flavorText: "深知取舍之道，只把该提交的送入暂存。",
    unlockCondition: (_profile, result) => result.challengeId === "staging-focus",
  },
  {
    id: "branch-walker",
    name: "分支行者",
    flavorText: "一念开新路，主线与支线皆在掌中。",
    unlockCondition: (_profile, result) => result.challengeId === "branch-sword",
  },
  {
    id: "merge-adept",
    name: "合流真人",
    flavorText: "令分歧归一，让提交之河重新合流。",
    unlockCondition: (_profile, result) => result.challengeId === "merge-river",
  },
  {
    id: "timeline-hermit",
    name: "回溯道人",
    flavorText: "看得清 HEAD 来路，也懂退一步的分寸。",
    unlockCondition: (_profile, result) => result.challengeId === "reset-path",
  },
  {
    id: "conflict-lord",
    name: "冲突调停真君",
    flavorText: "面对冲突不慌不乱，于标记之间定乾坤。",
    unlockCondition: (_profile, result) => result.challengeId === "conflict-calm",
  },
  {
    id: "git-daojun",
    name: "Git 道君",
    flavorText: "全关皆破，仓中万法已然贯通。",
    unlockCondition: (profile, _result, allChallenges) =>
      allChallenges.every((challenge) => profile.completedChallengeIds.includes(challenge.id)),
  },
];

export const getTitleById = (titleId: string) =>
  TITLE_RULES.find((title) => title.id === titleId) ?? TITLE_RULES[0];
