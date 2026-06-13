import { describe, expect, it } from "vitest";
import { createInitialProfile } from "./growth";
import { mergeProfilesPreferHigher } from "./profileSync";

describe("profile sync", () => {
  it("merges local and cloud profiles by keeping higher progress", () => {
    const localProfile = {
      ...createInitialProfile(),
      xp: 120,
      completedChallengeIds: ["first-commit"],
      bestScores: { "first-commit": 90 },
      unlockedTitleIds: ["initiate", "first-commit"],
      activeTitleId: "first-commit",
    };

    const cloudProfile = {
      ...createInitialProfile(),
      xp: 80,
      completedChallengeIds: ["staging-focus"],
      bestScores: { "staging-focus": 88, "first-commit": 95 },
      unlockedTitleIds: ["initiate", "staging-mage"],
      activeTitleId: "staging-mage",
    };

    const merged = mergeProfilesPreferHigher(localProfile, cloudProfile);

    expect(merged.xp).toBe(120);
    expect(merged.completedChallengeIds).toEqual(expect.arrayContaining(["first-commit", "staging-focus"]));
    expect(merged.bestScores["first-commit"]).toBe(95);
    expect(merged.unlockedTitleIds).toEqual(
      expect.arrayContaining(["initiate", "first-commit", "staging-mage"]),
    );
  });
});
