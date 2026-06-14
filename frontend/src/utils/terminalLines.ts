import type { CommandEntry } from "../types";

/** 终端单行输出 */
export interface TerminalLine {
  text: string;
  type: string;
}

/** 从命令记录还原终端时的选项 */
export interface RestoreTerminalOptions {
  /** 是否为恢复上次进度（有历史命令） */
  resumed: boolean;
  /** 是否已通关 */
  completed: boolean;
  /** 通关得分，仅 completed 时使用 */
  score?: number;
}

/**
 * 把单条命令的执行结果追加到终端行列表。
 * 功能：output 与 feedback 文案相同时只输出一行，避免重复报错。
 * 参数：lines - 目标行列表；command - 命令记录。
 * 返回值：无。
 */
export const appendCommandEntryLines = (lines: TerminalLine[], command: CommandEntry): void => {
  const outputText = (command.output ?? "").trim();
  const feedbackText = (command.feedback ?? "").trim();
  const resultType = command.success ? (outputText ? "output" : "success") : "error";

  if (outputText) {
    lines.push({ text: command.output ?? "", type: resultType });
  }

  if (feedbackText && feedbackText !== outputText) {
    lines.push({
      text: command.feedback,
      type: command.success ? "success" : "error",
    });
  } else if (!outputText && feedbackText) {
    lines.push({
      text: command.feedback,
      type: command.success ? "success" : "error",
    });
  }
};

/**
 * 根据命令历史重建终端输出。
 * 功能：刷新页面后恢复终端滚动区内容。
 * 参数：commands - 本会话命令历史；options - 恢复场景选项。
 * 返回值：终端行数组。
 */
export const buildTerminalLinesFromCommands = (
  commands: CommandEntry[],
  options: RestoreTerminalOptions,
): TerminalLine[] => {
  const lines: TerminalLine[] = [];

  if (options.resumed) {
    lines.push({ text: "已恢复上次练习进度。", type: "success" });
  } else {
    lines.push({ text: "练习已开始。输入 git 命令并按 Enter 执行。", type: "success" });
  }

  for (const command of commands) {
    lines.push({ text: `$ ${command.command}`, type: "output" });
    appendCommandEntryLines(lines, command);
  }

  if (options.completed && options.score !== undefined) {
    lines.push({ text: `通关！得分: ${options.score}`, type: "success" });
  }

  return lines;
};

/**
 * 从命令历史提取输入补全用的命令列表。
 * 功能：刷新后恢复历史幽灵建议数据源。
 * 参数：commands - 本会话命令历史。
 * 返回值：按执行顺序排列的命令字符串数组。
 */
export const extractCommandHistory = (commands: CommandEntry[]): string[] => {
  return commands.map((command) => command.command);
};
