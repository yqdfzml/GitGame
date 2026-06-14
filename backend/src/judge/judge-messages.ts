/**
 * 生成判题差距项的可读提示。
 * 功能：把「内容不符合目标」类模糊文案改成可操作的步骤描述。
 * 参数：见各函数。
 * 返回值：展示给玩家的中文提示。
 */

/**
 * 分支提交文件内容未达标时的提示。
 * 功能：区分「文件未提交」与「已提交但内容不对」两种情况。
 * 参数：branch - 分支名；path - 文件路径；actual - 该分支最新提交中的实际内容，undefined 表示文件不存在。
 * 返回值：待完成提示文案。
 */
export const formatBranchFileContentGap = (
  branch: string,
  path: string,
  actual: string | undefined,
  expected: string,
): string => {
  if (actual === undefined) {
    return `请在分支「${branch}」创建「${path}」并提交，内容为「${expected}」`;
  }
  return `分支「${branch}」上「${path}」提交内容应为「${expected}」`;
};

/**
 * HEAD 提交文件内容未达标时的提示。
 * 功能：指明应在哪条分支的最新提交中包含该文件及目标内容。
 * 参数：path - 文件路径；actual - 当前 HEAD 提交中的实际内容；targetBranch - 目标分支名；expected - 期望内容。
 * 返回值：待完成提示文案。
 */
export const formatFileContentGap = (
  path: string,
  actual: string | undefined,
  targetBranch: string | null,
  expected: string,
): string => {
  /** 文案里使用的分支名，没有指定时用「当前分支」 */
  const branchLabel = targetBranch ?? "当前分支";
  if (actual === undefined) {
    return `分支「${branchLabel}」最新提交需包含「${path}」，内容为「${expected}」`;
  }
  return `分支「${branchLabel}」上「${path}」提交内容应为「${expected}」`;
};

/**
 * 工作区文件内容未达标时的提示。
 * 功能：说明工作区里哪份文件需要保持或改成目标状态。
 * 参数：path - 文件路径。
 * 返回值：待完成提示文案。
 */
export const formatWorkingTreeContentGap = (path: string): string => {
  return `工作区文件「${path}」需保持目标内容（勿提交或丢弃）`;
};

/**
 * 暂存区文件内容未达标时的提示。
 * 功能：说明哪份文件应暂存为目标内容。
 * 参数：path - 文件路径。
 * 返回值：待完成提示文案。
 */
export const formatIndexContentGap = (path: string): string => {
  return `暂存区文件「${path}」需 add 为目标内容后再 commit`;
};

/**
 * 需要 merge commit 但未满足时的提示。
 * 功能：提示玩家先在各分支提交，再执行 merge。
 * 参数：targetBranch - 执行合并的目标分支，一般为 main。
 * 返回值：待完成提示文案。
 */
export const formatMergeCommitRequiredGap = (targetBranch: string | null): string => {
  const branchLabel = targetBranch ?? "目标分支";
  return `两分支各自提交后，在「${branchLabel}」执行 git merge 以产生合并提交`;
};

/**
 * 当前分支不对时的提示。
 * 功能：告诉玩家应切回哪条分支继续操作。
 * 参数：expected - 目标分支；actual - 实际所在分支或 detached。
 * 返回值：待完成提示文案。
 */
export const formatCurrentBranchGap = (expected: string, actual: string): string => {
  return `请切换到分支「${expected}」（当前在「${actual}」）`;
};

/**
 * 分支尚未合并时的提示。
 * 功能：明确合并方向。
 * 参数：source - 被合并分支；target - 接收合并的分支。
 * 返回值：待完成提示文案。
 */
export const formatBranchMergedGap = (source: string, target: string): string => {
  return `请在「${target}」上执行 git merge ${source}`;
};
