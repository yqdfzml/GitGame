/**
 * 从历史命令中查找自动建议。
 * 功能：返回最近一条以当前输入开头的历史命令，模拟 zsh-autosuggestions。
 * 参数：input - 当前输入；history - 历史命令列表（旧到新）。
 * 返回值：匹配到的完整命令；没有匹配时返回 null。
 */
export const findHistorySuggestion = (input: string, history: string[]): string | null => {
  if (input.length === 0) {
    return null;
  }

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const command = history[i];
    if (command.startsWith(input) && command !== input) {
      return command;
    }
  }

  return null;
};

/**
 * 将命令写入历史记录。
 * 功能：相邻重复命令不重复写入，保持历史列表精简。
 * 参数：history - 原历史；command - 新执行的命令。
 * 返回值：更新后的历史数组。
 */
export const pushCommandHistory = (history: string[], command: string): string[] => {
  const trimmed = command.trim();
  if (trimmed.length === 0) {
    return history;
  }
  if (history[history.length - 1] === trimmed) {
    return history;
  }
  return [...history, trimmed];
};

/**
 * 计算历史建议的剩余后缀。
 * 功能：把完整建议拆成用户已输入部分之后的灰色幽灵文本。
 * 参数：input - 当前输入；suggestion - 匹配到的完整历史命令。
 * 返回值：需要灰色展示的后缀字符串。
 */
export const buildHistorySuggestionSuffix = (input: string, suggestion: string | null): string => {
  if (!suggestion) {
    return "";
  }
  if (!suggestion.startsWith(input)) {
    return "";
  }
  return suggestion.slice(input.length);
};
