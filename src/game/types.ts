import type { UnlockRule } from "./unlockRule";

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
  version?: number;
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

export type PublicTitle = {
  id: string;
  name: string;
  flavorText: string;
  rarity: string;
  unlockRule: UnlockRule;
};

export type PublicLevel = {
  level: number;
  name: string;
};

export type PublicGameConfig = {
  xpPerLevel: number;
  defaultTitleKey: string;
};

export type ContentBootstrap = {
  challenges: Challenge[];
  titles: PublicTitle[];
  levels: PublicLevel[];
  config: PublicGameConfig;
  totalChallenges: number;
  totalTitles: number;
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

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type BackendPlayerProfile = {
  level: number;
  totalXp: number;
  currentTitle: { key: string; name: string };
  completedChallengeCount: number;
  perfectChallengeCount: number;
};

export type BackendChallengeProgress = {
  challengeKey: string;
  challengeVersion: number;
  status: "started" | "completed";
  bestScore: number;
  bestMistakeCount: number;
  bestHintCount: number;
  inOrder: boolean;
  completedCount: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
};

export type BackendTitle = {
  key: string;
  name: string;
  unlockedAt: string;
};

export type ChallengeAttemptResult = {
  earnedXp: number;
  levelBefore: number;
  levelAfter: number;
  bestScoreUpdated: boolean;
  unlockedTitles: { key: string; name: string }[];
};

export type ChallengeCatalogResponse = {
  challenges: Challenge[];
  total: number;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
};
