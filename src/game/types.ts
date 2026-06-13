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
  skill: string;
  concept: string;
  repositoryStates: string[];
  objectives: string[];
  hints: string[];
  hintLevels: string[];
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
  inOrder: boolean;
  commandCount: number;
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

export type CommandEvaluationStatus =
  | "accepted"
  | "out-of-order"
  | "duplicate"
  | "invalid";

export type CommandEvaluation = {
  status: CommandEvaluationStatus;
  completedCommands: string[];
  feedbackKind: "success" | "warn";
  feedback: string;
  mistakeDelta: number;
  keepsOrder: boolean;
  acceptedCommand?: string;
  expectedCommand?: string;
};

export type ChallengeAttemptPayload = {
  challengeKey: string;
  challengeVersion: number;
  score: number;
  mistakeCount: number;
  hintCount: number;
  inOrder: boolean;
  commandCount: number;
  durationSeconds?: number;
  commandLog: string[];
};

export type ChallengeSyncStatus =
  | { status: "disabled"; message: string }
  | { status: "synced"; earnedXp: number; bestScoreUpdated: boolean; unlockedTitles: string[]; message: string }
  | { status: "failed"; message: string };
