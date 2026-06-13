import { describe, expect, it } from "vitest";
import { CHALLENGES } from "./challenges";
import {
  applyChallengeResult,
  calculateScore,
  createChallengeResult,
  createInitialProfile,
  getLevelFromXp,
} from "./growth";
import { getTitleById } from "./titles";

const challenge = (id: string) => {
  const item = CHALLENGES.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing challenge ${id}`);
  return item;
};

describe("growth system", () => {
  it("upgrades one level per 100 XP and caps level names at 10", () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(100)).toBe(2);
    expect(getLevelFromXp(450)).toBe(5);
    expect(getLevelFromXp(9999)).toBe(10);
  });

  it("uses encouragement-first scoring with light penalties", () => {
    expect(calculateScore(0, 0, true)).toBe(100);
    expect(calculateScore(1, 1, true)).toBe(90);
    expect(calculateScore(3, 2, false)).toBe(70);
  });

  it("unlocks first commit and flawless titles after a perfect first challenge", () => {
    const profile = createInitialProfile();
    const result = createChallengeResult({
      profile,
      challenge: challenge("first-commit"),
      mistakeCount: 0,
      hintCount: 0,
      inOrder: true,
    });
    const applied = applyChallengeResult(profile, result);

    expect(applied.profile.unlockedTitleIds).toContain("first-commit");
    expect(applied.profile.unlockedTitleIds).toContain("flawless-mind");
    expect(getTitleById(applied.profile.activeTitleId).name).toBe("无瑕剑心");
  });

  it("unlocks steady cultivator after three completed challenges", () => {
    let profile = createInitialProfile();

    for (const id of ["first-commit", "staging-focus", "branch-sword"]) {
      const result = createChallengeResult({
        profile,
        challenge: challenge(id),
        mistakeCount: 1,
        hintCount: 1,
        inOrder: true,
      });
      profile = applyChallengeResult(profile, result).profile;
    }

    expect(profile.completedChallengeIds).toHaveLength(3);
    expect(profile.unlockedTitleIds).toContain("steady-cultivator");
  });

  it("does not grant repeat XP unless the player improves the best score", () => {
    const profile = createInitialProfile();
    const first = createChallengeResult({
      profile,
      challenge: challenge("first-commit"),
      mistakeCount: 0,
      hintCount: 0,
      inOrder: true,
    });
    const afterFirst = applyChallengeResult(profile, first).profile;

    const repeat = createChallengeResult({
      profile: afterFirst,
      challenge: challenge("first-commit"),
      mistakeCount: 2,
      hintCount: 1,
      inOrder: false,
    });
    const afterRepeat = applyChallengeResult(afterFirst, repeat).profile;

    expect(afterRepeat.xp).toBe(afterFirst.xp);
    expect(afterRepeat.bestScores["first-commit"]).toBe(100);
  });

  it("unlocks Git Daojun after all challenges are completed", () => {
    let profile = createInitialProfile();

    for (const item of CHALLENGES) {
      const result = createChallengeResult({
        profile,
        challenge: item,
        mistakeCount: 1,
        hintCount: 1,
        inOrder: true,
      });
      profile = applyChallengeResult(profile, result).profile;
    }

    expect(profile.unlockedTitleIds).toContain("git-daojun");
  });
});
