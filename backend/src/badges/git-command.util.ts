/**
 * 从 git 命令字符串解析子命令。
 * 功能：提取 git 后的第一个 token 作为子命令。
 * 参数：command - 用户输入的完整命令。
 * 返回值：子命令名，无法解析时返回 null。
 */
export function parseGitSubcommand(command: string): string | null {
  const parts = command.trim().split(/\s+/);
  if (parts.length < 2 || parts[0] !== "git") {
    return null;
  }
  return parts[1].toLowerCase();
}

/**
 * 判断命令列表是否包含指定子命令。
 * 功能：用于命令专精徽章判定。
 * 参数：commands - 命令字符串数组；subcommand - 目标子命令；requireSuccess - 是否要求成功执行。
 * 返回值：是否命中。
 */
export function hasSubcommand(
  commands: Array<{ command: string; success: boolean }>,
  subcommand: string,
  requireSuccess = true,
): boolean {
  return commands.some((item) => {
    const parsed = parseGitSubcommand(item.command);
    if (parsed !== subcommand) {
      return false;
    }
    if (requireSuccess && !item.success) {
      return false;
    }
    return true;
  });
}

/**
 * 统计指定子命令的成功执行次数。
 * 功能：用于累计型命令徽章。
 * 参数：commands - 命令记录；subcommand - 目标子命令。
 * 返回值：成功次数。
 */
export function countSuccessfulSubcommand(
  commands: Array<{ command: string; success: boolean }>,
  subcommand: string,
): number {
  let count = 0;
  for (const item of commands) {
    if (item.success && parseGitSubcommand(item.command) === subcommand) {
      count += 1;
    }
  }
  return count;
}

/**
 * 生成 attempt 命令序列指纹。
 * 功能：比较两次通关是否走了不同命令路径。
 * 参数：commands - 单局命令记录。
 * 返回值：可比较的指纹字符串。
 */
export function buildCommandFingerprint(
  commands: Array<{ command: string; success: boolean }>,
): string {
  return commands.map((item) => `${item.success ? "1" : "0"}:${item.command.trim()}`).join("|");
}

/** 命令记录最小结构，供 stash / rebase 判定复用 */
type CommandRecord = { command: string; success: boolean };

/**
 * 判断是否在通关 attempt 中成功执行 git stash 保存。
 * 功能：排除 pop / apply 等恢复类子命令，只统计贮藏操作。
 * 参数：commands - 单局命令记录。
 * 返回值：是否命中。
 */
export function hasStashSave(commands: CommandRecord[]): boolean {
  return commands.some((item) => {
    if (!item.success) {
      return false;
    }
    const trimmed = item.command.trim().toLowerCase();
    if (!/^git\s+stash(\s|$)/.test(trimmed)) {
      return false;
    }
    if (/^git\s+stash\s+(pop|apply|list|show|drop|clear|branch)\b/.test(trimmed)) {
      return false;
    }
    return true;
  });
}

/**
 * 判断是否在通关 attempt 中成功执行 stash pop 或 stash apply。
 * 功能：用于技法徽章「藏而不失」判定。
 * 参数：commands - 单局命令记录。
 * 返回值：是否命中。
 */
export function hasStashRecover(commands: CommandRecord[]): boolean {
  return commands.some((item) => {
    if (!item.success) {
      return false;
    }
    const trimmed = item.command.trim().toLowerCase();
    return /^git\s+stash\s+(pop|apply)\b/.test(trimmed);
  });
}

/**
 * 判断是否在通关 attempt 中成功执行 git rebase --continue。
 * 功能：用于技法徽章「断劫续脉」判定。
 * 参数：commands - 单局命令记录。
 * 返回值：是否命中。
 */
export function hasRebaseContinue(commands: CommandRecord[]): boolean {
  return commands.some((item) => {
    if (!item.success) {
      return false;
    }
    const trimmed = item.command.trim().toLowerCase();
    return /^git\s+rebase(\s+.*)?\s+--continue\b/.test(trimmed) || /^git\s+rebase\s+--continue\b/.test(trimmed);
  });
}
