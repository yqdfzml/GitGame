import { beforeEach, describe, expect, it } from "vitest";
import { createInitialProfile } from "./growth";
import { clearProfile, loadProfile, saveProfile } from "./storage";

describe("profile storage", () => {
  beforeEach(() => {
    clearProfile();
  });

  it("persists profile progress in localStorage", () => {
    const profile = {
      ...createInitialProfile(),
      xp: 130,
      totalScore: 96,
      activeTitleId: "first-commit",
      unlockedTitleIds: ["initiate", "first-commit"],
      completedChallengeIds: ["first-commit"],
      bestScores: { "first-commit": 96 },
    };

    saveProfile(profile);

    expect(loadProfile()).toMatchObject({
      level: 2,
      xp: 130,
      activeTitleId: "first-commit",
      completedChallengeIds: ["first-commit"],
      bestScores: { "first-commit": 96 },
    });
  });
});
