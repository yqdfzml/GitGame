import { getApiBaseUrl, submitChallengeAttempt as postChallengeAttempt } from "./apiClient";
import { loadAccessToken } from "./authStorage";
import type { ChallengeAttemptPayload, ChallengeResult, ChallengeSyncStatus } from "./types";

type SyncChallengeAttemptInput = {
  result: ChallengeResult;
  commandLog: string[];
  accessToken?: string | null;
  apiBaseUrl?: string | null;
  challengeVersion?: number;
  durationSeconds?: number;
  fetcher?: typeof fetch;
};

/**
 * 构造后端兼容的通关提交体。
 * 功能：把前端 ChallengeResult 转成 POST /api/player/challenge-attempts 所需字段。
 * 参数：result/commandLog 等通关上下文。
 * 返回值：ChallengeAttemptPayload。
 */
export const createChallengeAttemptPayload = ({
  challengeVersion = 1,
  commandLog,
  durationSeconds,
  result,
}: Omit<SyncChallengeAttemptInput, "accessToken" | "apiBaseUrl" | "fetcher">): ChallengeAttemptPayload => ({
  challengeKey: result.challengeId,
  challengeVersion,
  score: result.score,
  mistakeCount: result.mistakeCount,
  hintCount: result.hintCount,
  inOrder: result.inOrder,
  commandCount: result.commandCount,
  durationSeconds,
  commandLog,
});

/**
 * 同步通关结果到云端。
 * 功能：登录且配置 API 时调用后端结算；否则仅保留本地进度。
 * 参数：input - 通关结果、命令日志、token 等。
 * 返回值：同步状态。
 */
export const syncChallengeAttempt = ({
  accessToken = loadAccessToken(),
  apiBaseUrl,
  challengeVersion = 1,
  commandLog,
  durationSeconds,
  fetcher = fetch,
  result,
}: SyncChallengeAttemptInput): Promise<ChallengeSyncStatus> => {
  const resolvedBaseUrl = apiBaseUrl !== undefined ? apiBaseUrl : getApiBaseUrl();

  if (resolvedBaseUrl === null) {
    return Promise.resolve({ status: "disabled", message: "未配置后端 API，进度已保存在本地。" });
  }

  if (!accessToken) {
    return Promise.resolve({ status: "disabled", message: "尚未登录，通关结果暂存本地。" });
  }

  const payload = createChallengeAttemptPayload({ challengeVersion, commandLog, durationSeconds, result });

  return postChallengeAttempt(accessToken, payload, fetcher, resolvedBaseUrl)
    .then((body) => ({
      status: "synced" as const,
      earnedXp: body.earnedXp ?? result.baseXp + result.bonusXp,
      bestScoreUpdated: body.bestScoreUpdated ?? false,
      unlockedTitles: body.unlockedTitles?.map((title) => title.key) ?? [],
      message: "通关结果已同步到云端。",
    }))
    .catch(() => ({
      status: "failed" as const,
      message: "暂时无法连接后端，本地进度已保留。",
    }));
};
