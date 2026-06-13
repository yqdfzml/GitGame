import type { ChallengeAttemptPayload, ChallengeResult, ChallengeSyncStatus } from "./types";

type SyncChallengeAttemptInput = {
  result: ChallengeResult;
  commandLog: string[];
  accessToken?: string | null;
  apiBaseUrl?: string;
  challengeVersion?: number;
  durationSeconds?: number;
  fetcher?: typeof fetch;
};

const getConfiguredBaseUrl = () => {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return meta.env?.VITE_API_BASE_URL;
};

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

export const syncChallengeAttempt = async ({
  accessToken,
  apiBaseUrl = getConfiguredBaseUrl(),
  challengeVersion = 1,
  commandLog,
  durationSeconds,
  fetcher = fetch,
  result,
}: SyncChallengeAttemptInput): Promise<ChallengeSyncStatus> => {
  if (!apiBaseUrl) {
    return { status: "disabled", message: "未配置后端 API，进度已保存在本地。" };
  }

  if (!accessToken) {
    return { status: "disabled", message: "尚未登录，通关结果暂存本地。" };
  }

  const payload = createChallengeAttemptPayload({ challengeVersion, commandLog, durationSeconds, result });

  try {
    const response = await fetcher(`${apiBaseUrl.replace(/\/$/, "")}/api/player/challenge-attempts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { status: "failed", message: "云端同步失败，本地进度不受影响。" };
    }

    const body = (await response.json()) as {
      data?: { earnedXp?: number; bestScoreUpdated?: boolean; unlockedTitles?: { key: string }[] };
    };

    return {
      status: "synced",
      earnedXp: body.data?.earnedXp ?? result.baseXp + result.bonusXp,
      bestScoreUpdated: body.data?.bestScoreUpdated ?? false,
      unlockedTitles: body.data?.unlockedTitles?.map((title) => title.key) ?? [],
      message: "通关结果已同步到云端。",
    };
  } catch {
    return { status: "failed", message: "暂时无法连接后端，本地进度已保留。" };
  }
};
