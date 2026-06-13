import { describe, expect, it } from "vitest";
import { CHALLENGES } from "./challenges";
import { evaluateCommand, getLayeredHint, normalizeCommand } from "./commandEngine";

const firstChallenge = CHALLENGES[0];

describe("command engine", () => {
  it("normalizes quotes and whitespace", () => {
    expect(normalizeCommand(' git   commit -m "init" ')).toBe("git commit -m init");
  });

  it("accepts the expected next command", () => {
    const evaluation = evaluateCommand(firstChallenge, [], "git init");

    expect(evaluation.status).toBe("accepted");
    expect(evaluation.completedCommands).toEqual(["git init"]);
    expect(evaluation.mistakeDelta).toBe(0);
  });

  it("records a valid command that is out of order", () => {
    const evaluation = evaluateCommand(firstChallenge, [], "git add README.md");

    expect(evaluation.status).toBe("out-of-order");
    expect(evaluation.completedCommands).toEqual(["git add README.md"]);
    expect(evaluation.keepsOrder).toBe(false);
  });

  it("counts duplicates as mistakes without changing completed commands", () => {
    const evaluation = evaluateCommand(firstChallenge, ["git init"], "git init");

    expect(evaluation.status).toBe("duplicate");
    expect(evaluation.completedCommands).toEqual(["git init"]);
    expect(evaluation.mistakeDelta).toBe(1);
  });

  it("rejects commands that do not belong to the challenge", () => {
    const evaluation = evaluateCommand(firstChallenge, [], "git push origin main");

    expect(evaluation.status).toBe("invalid");
    expect(evaluation.completedCommands).toEqual([]);
    expect(evaluation.mistakeDelta).toBe(1);
  });

  it("returns layered hints and caps at the final level", () => {
    expect(getLayeredHint(firstChallenge, 0)).toMatchObject({ level: 1 });
    expect(getLayeredHint(firstChallenge, 9)).toMatchObject({ level: 3 });
  });
});
