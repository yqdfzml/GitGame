import { describe, expect, it, vi } from "vitest";
import { createChallengeAttemptPayload, syncChallengeAttempt } from "./cloudSync";
import type { ChallengeResult } from "./types";

const result: ChallengeResult = {
  challengeId: "first-commit",
  score: 96,
  baseXp: 40,
  bonusXp: 12,
  mistakeCount: 1,
  hintCount: 0,
  inOrder: true,
  commandCount: 4,
  completedAt: "2026-06-13T00:00:00.000Z",
};

describe("cloud sync", () => {
  it("creates backend-compatible attempt payloads", () => {
    expect(createChallengeAttemptPayload({ result, commandLog: ["git init"], durationSeconds: 30 })).toEqual({
      challengeKey: "first-commit",
      challengeVersion: 1,
      score: 96,
      mistakeCount: 1,
      hintCount: 0,
      inOrder: true,
      commandCount: 4,
      durationSeconds: 30,
      commandLog: ["git init"],
    });
  });

  it("does not call the network when API is not configured", async () => {
    const fetcher = vi.fn();
    const status = await syncChallengeAttempt({ result, commandLog: [], apiBaseUrl: "", fetcher });

    expect(status.status).toBe("disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not call the network when the player has no token", async () => {
    const fetcher = vi.fn();
    const status = await syncChallengeAttempt({ result, commandLog: [], apiBaseUrl: "https://api.example.com", fetcher });

    expect(status.status).toBe("disabled");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("syncs completed attempts to the backend endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { earnedXp: 52, bestScoreUpdated: true, unlockedTitles: [{ key: "first-commit" }] } }),
    });

    const status = await syncChallengeAttempt({
      result,
      commandLog: ["git init"],
      accessToken: "token",
      apiBaseUrl: "https://api.example.com/",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/api/player/challenge-attempts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
    expect(status).toMatchObject({ status: "synced", earnedXp: 52, bestScoreUpdated: true });
  });
});
