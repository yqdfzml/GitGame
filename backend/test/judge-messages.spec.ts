import { describe, expect, it } from "vitest";
import {
  formatBranchFileContentGap,
  formatBranchFileTarget,
  formatFileContentGap,
  formatFileContentTarget,
  formatMergeCommitRequiredGap,
  isFilePreseededInWorkingTree,
} from "../src/judge/judge-messages";

describe("judge-messages", () => {
  it("前置工作区文件不写内容字符串", () => {
    const workingTree = {
      "main.txt": { content: "m1", status: "modified" as const },
    };
    expect(isFilePreseededInWorkingTree(workingTree, "main.txt", "m1")).toBe(true);
    expect(formatBranchFileTarget("main", "main.txt", "m1", true)).toBe(
      "分支「main」需提交工作区中的「main.txt」",
    );
    expect(formatFileContentTarget("main.txt", "m1", "main", true)).toBe(
      "分支「main」最终需包含已提交的「main.txt」",
    );
  });

  it("新建文件仍写出内容要求", () => {
    expect(formatBranchFileTarget("feature", "feature.txt", "f1", false)).toContain("f1");
  });

  it("工作区内容正确时只说需要提交", () => {
    const workingTree = {
      "main.txt": { content: "m1", status: "modified" as const },
    };
    expect(formatBranchFileContentGap("main", "main.txt", undefined, "m1", workingTree)).toBe(
      "在分支「main」提交「main.txt」",
    );
    expect(formatBranchFileContentGap("main", "main.txt", "wrong", "m1", workingTree)).toBe(
      "在分支「main」提交「main.txt」",
    );
  });

  it("工作区内容不对时明确指出要改的内容", () => {
    const workingTree = {
      "feature.txt": { content: "", status: "unchanged" as const },
    };
    const message = formatBranchFileContentGap("feature", "feature.txt", "", "feature only", workingTree);
    expect(message).toContain("改为「feature only」");
    expect(message).not.toContain("有误");
  });

  it("版本库不对但工作区正确时同样只说需要提交", () => {
    const workingTree = {
      "main.txt": { content: "m1", status: "modified" as const },
    };
    expect(formatBranchFileContentGap("main", "main.txt", "wrong", "m1", workingTree)).toBe(
      "在分支「main」提交「main.txt」",
    );
  });

  it("HEAD 判定与工作区正确时只说需要提交", () => {
    const workingTree = {
      "main.txt": { content: "main only", status: "untracked" as const },
    };
    expect(formatFileContentGap("main.txt", undefined, "main", "main only", workingTree)).toBe(
      "在分支「main」提交「main.txt」",
    );
  });

  it("merge commit 提示不写出具体命令", () => {
    const message = formatMergeCommitRequiredGap("main");
    expect(message).toContain("main");
    expect(message).not.toContain("git merge");
  });
});
