import type { Challenge, CommandEvaluation } from "./types";

export const normalizeCommand = (value: string) =>
  value.trim().replaceAll('"', "").replaceAll("'", "").replace(/\s+/g, " ");

const feedbackByStatus = {
  accepted: "成功。仓库状态沿推荐路径推进，下一步继续观察目标需要的状态变化。",
  "out-of-order": "命令本身有效，但现在不是最合适的时机。Git 工作流通常需要先完成前置状态，再执行后续操作。",
  duplicate: "这一步已经完成。重复执行不会推进当前目标，请判断下一条会改变状态的命令。",
  invalid: "这条命令暂时没有推进当前关卡目标。先看当前仓库状态，再选择能改变状态的 Git 命令。",
};

export const evaluateCommand = (
  challenge: Challenge,
  completedCommands: string[],
  rawValue: string,
): CommandEvaluation => {
  const command = normalizeCommand(rawValue);
  const expectedCommand = challenge.commands.find((item) => !completedCommands.includes(item));
  const commandIndex = challenge.commands.findIndex((item) => normalizeCommand(item) === command);
  const acceptedCommand = commandIndex >= 0 ? challenge.commands[commandIndex] : undefined;

  if (acceptedCommand && normalizeCommand(expectedCommand ?? "") === command) {
    return {
      status: "accepted",
      completedCommands: [...completedCommands, acceptedCommand],
      feedbackKind: "success",
      feedback: feedbackByStatus.accepted,
      mistakeDelta: 0,
      keepsOrder: true,
      acceptedCommand,
      expectedCommand,
    };
  }

  if (acceptedCommand && completedCommands.includes(acceptedCommand)) {
    return {
      status: "duplicate",
      completedCommands,
      feedbackKind: "warn",
      feedback: feedbackByStatus.duplicate,
      mistakeDelta: 1,
      keepsOrder: true,
      acceptedCommand,
      expectedCommand,
    };
  }

  if (acceptedCommand) {
    return {
      status: "out-of-order",
      completedCommands: [...completedCommands, acceptedCommand],
      feedbackKind: "warn",
      feedback: feedbackByStatus["out-of-order"],
      mistakeDelta: 0,
      keepsOrder: false,
      acceptedCommand,
      expectedCommand,
    };
  }

  return {
    status: "invalid",
    completedCommands,
    feedbackKind: "warn",
    feedback: feedbackByStatus.invalid,
    mistakeDelta: 1,
    keepsOrder: true,
    expectedCommand,
  };
};

export const getLayeredHint = (challenge: Challenge, hintCount: number) => {
  const index = Math.min(Math.max(0, hintCount), challenge.hintLevels.length - 1);
  return {
    level: index + 1,
    text: challenge.hintLevels[index] ?? challenge.hints.at(-1) ?? "先观察当前 Git 状态，再决定下一步。",
  };
};
