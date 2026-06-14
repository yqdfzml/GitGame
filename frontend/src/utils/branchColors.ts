import type { RepoState } from "../types";

/** 分支调色板，按固定顺序分配给各分支 */
export const BRANCH_COLOR_LIST = ["#2fb388", "#f2bd4b", "#5eb8d4", "#e8705a", "#a78bfa"];

/**
 * 构建分支名到颜色的稳定映射。
 * 功能：main 优先，其余按字母序，保证提交图谱与工作区颜色一致。
 * 参数：branchNames - 分支名列表。
 * 返回值：分支名 -> 颜色。
 */
export function buildBranchColorMap(branchNames: string[]): Map<string, string> {
  const sortedNames = [...branchNames].sort((left, right) => {
    if (left === "main") return -1;
    if (right === "main") return 1;
    return left.localeCompare(right);
  });
  const colorMap = new Map<string, string>();
  sortedNames.forEach((branchName, index) => {
    colorMap.set(branchName, BRANCH_COLOR_LIST[index % BRANCH_COLOR_LIST.length]);
  });
  return colorMap;
}

/**
 * 获取 HEAD 所在分支名。
 * 功能：分离 HEAD 时返回 null。
 * 参数：state - 仓库快照。
 * 返回值：当前分支名或 null。
 */
export function getHeadBranchName(state: RepoState): string | null {
  if (state.head.type === "branch") {
    return state.head.ref;
  }
  return null;
}

/**
 * 判断某分支是否为 HEAD 当前所在分支。
 * 功能：用于高亮当前分支标签。
 * 参数：branchName - 分支名；state - 仓库快照。
 * 返回值：是否为当前分支。
 */
export function isCurrentBranch(branchName: string, state: RepoState): boolean {
  return getHeadBranchName(state) === branchName;
}

/**
 * 获取分支对应颜色。
 * 功能：从颜色映射中读取分支色，找不到时用第一个默认色。
 * 参数：branchName - 分支名；colorMap - 分支颜色映射。
 * 返回值：十六进制颜色。
 */
export function getBranchColor(branchName: string, colorMap: Map<string, string>): string {
  return colorMap.get(branchName) ?? BRANCH_COLOR_LIST[0];
}
