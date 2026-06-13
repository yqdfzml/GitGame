export type ChallengeKind =
  | "commit"
  | "staging"
  | "branch"
  | "merge"
  | "history"
  | "conflict";

export type PlayerProfile = {
  level: number;
  xp: number;
  totalScore: number;
  activeTitleId: string;
  unlockedTitleIds: string[];
  completedChallengeIds: string[];
  bestScores: Record<string, number>;
};

export type Challenge = {
  id: string;
  chapter: string;
  title: string;
  summary: string;
  objectives: string[];
  hints: string[];
  kind: ChallengeKind;
  difficulty: "入门" | "进阶" | "突破";
  baseXp: number;
  commands: string[];
};

export type ChallengeResult = {
  challengeId: string;
  score: number;
  baseXp: number;
  bonusXp: number;
  mistakeCount: number;
  hintCount: number;
  completedAt: string;
};

export type TitleRule = {
  id: string;
  name: string;
  flavorText: string;
  unlockCondition: (
    profile: PlayerProfile,
    result: ChallengeResult,
    allChallenges: Challenge[],
  ) => boolean;
};

export type LevelInfo = {
  level: number;
  name: string;
};
