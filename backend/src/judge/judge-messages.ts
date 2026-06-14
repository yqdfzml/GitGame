import type { RepoState } from "../git-engine/repo-state.types";

/**
 * 判断开局工作区是否已写好目标文件内容。
 * 功能：用于通关条件文案，前置内容不再重复写出，避免与 commit 备注混淆。
 * 参数：workingTree - 开局工作区；path - 文件路径；expectedContent - 目标内容。
 * 返回值：是否已在工作区写好且待提交/未跟踪。
 */
export const isFilePreseededInWorkingTree = (
  workingTree: RepoState["workingTree"],
  path: string,
  expectedContent: string,
): boolean => {
  const file = workingTree[path];
  if (!file) {
    return false;
  }
  if (file.content !== expectedContent) {
    return false;
  }
  return file.status === "modified" || file.status === "untracked";
};

/**
 * 判断当前工作区是否已有目标文件内容。
 * 功能：判题提示时，若玩家工作区内容已正确，只提示提交步骤。
 * 参数：workingTree - 当前工作区；path - 文件路径；expectedContent - 目标内容。
 * 返回值：工作区内容是否已符合目标。
 */
export const isWorkingTreeContentMatch = (
  workingTree: RepoState["workingTree"],
  path: string,
  expectedContent: string,
): boolean => {
  return workingTree[path]?.content === expectedContent;
};

/**
 * 分支提交文件目标的通关条件文案。
 * 功能：前置内容只写「提交工作区文件」，新建文件才写出内容要求。
 * 参数：branch - 分支名；path - 文件路径；content - 目标内容；preseeded - 开局是否已写好。
 * 返回值：通关条件字符串。
 */
export const formatBranchFileTarget = (
  branch: string,
  path: string,
  content: string,
  preseeded: boolean,
): string => {
  if (preseeded) {
    return `分支「${branch}」需提交工作区中的「${path}」`;
  }
  return `分支「${branch}」需创建并提交「${path}」，内容为「${content}」`;
};

/**
 * 版本库文件目标的通关条件文案。
 * 功能：前置内容不写具体字符串，避免误解为 commit message。
 * 参数：path - 文件路径；content - 目标内容；branch - 目标分支；preseeded - 开局是否已写好。
 * 返回值：通关条件字符串。
 */
export const formatFileContentTarget = (
  path: string,
  content: string,
  branch: string | null,
  preseeded: boolean,
): string => {
  const branchLabel = branch ?? "当前分支";
  if (preseeded) {
    return `分支「${branchLabel}」最终需包含已提交的「${path}」`;
  }
  if (branch) {
    return `分支「${branchLabel}」最终需包含「${path}」，内容为「${content}」`;
  }
  return `「${path}」最终内容应为「${content}」`;
};

/**
 * 工作区保持文件目标的通关条件文案。
 * 功能：内容已在工作区时，不写具体字符串。
 * 参数：path - 文件路径；preseeded - 开局是否已有目标内容。
 * 返回值：通关条件字符串。
 */
export const formatWorkingTreeContentTarget = (path: string, preseeded: boolean): string => {
  if (preseeded) {
    return `工作区「${path}」需保持当前内容（勿提交或丢弃）`;
  }
  return `工作区「${path}」需保持指定内容（勿提交或丢弃）`;
};

/**
 * 生成「需提交 / 需改内容」类判题提示。
 * 功能：工作区已正确则只说需要提交；内容不对则明确写出要改成什么。
 * 参数：branchLabel - 分支名；path - 文件路径；expected - 目标内容；workingTree - 工作区。
 * 返回值：待完成提示文案。
 */
const buildFileCommitGapMessage = (
  branchLabel: string,
  path: string,
  expected: string,
  workingTree: RepoState["workingTree"],
): string => {
  /** 工作区里的文件条目 */
  const wtFile = workingTree[path];
  /** 工作区内容是否已符合目标 */
  const wtMatched = wtFile?.content === expected;
  /** 工作区是否存在该文件 */
  const wtExists = wtFile !== undefined;
  /** 分支位置描述 */
  const branchPart = `分支「${branchLabel}」`;

  // 工作区内容已正确，只差提交
  if (wtMatched) {
    return `在${branchPart}提交「${path}」`;
  }

  // 工作区有文件但内容不对，需先改再提交
  if (wtExists) {
    return `请将「${path}」的内容改为「${expected}」，在${branchPart}提交`;
  }

  // 工作区还没有这份文件，需新建
  return `在${branchPart}创建「${path}」，内容为「${expected}」，然后提交`;
};

/**
 * 分支提交文件内容未达标时的提示。
 * 功能：区分「直接提交工作区」与「先改内容再提交」。
 * 参数：branch - 分支名；path - 文件路径；actual - 分支最新提交中的实际内容；expected - 期望内容；workingTree - 当前工作区。
 * 返回值：待完成提示文案。
 */
export const formatBranchFileContentGap = (
  branch: string,
  path: string,
  actual: string | undefined,
  expected: string,
  workingTree: RepoState["workingTree"],
): string => {
  return buildFileCommitGapMessage(branch, path, expected, workingTree);
};

/**
 * HEAD 提交文件内容未达标时的提示。
 * 功能：区分「直接提交工作区」与「先改内容再提交」。
 * 参数：path - 文件路径；actual - HEAD 提交中的实际内容；targetBranch - 目标分支；expected - 期望内容；workingTree - 当前工作区。
 * 返回值：待完成提示文案。
 */
export const formatFileContentGap = (
  path: string,
  actual: string | undefined,
  targetBranch: string | null,
  expected: string,
  workingTree: RepoState["workingTree"],
): string => {
  const branchLabel = targetBranch ?? "当前分支";
  return buildFileCommitGapMessage(branchLabel, path, expected, workingTree);
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
