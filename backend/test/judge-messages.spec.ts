import { describe, expect, it } from "vitest";
import {
  formatBranchFileContentGap,
  formatFileContentGap,
  formatMergeCommitRequiredGap,
} from "../src/judge/judge-messages";

describe("judge-messages", () => {
  it("分支文件缺失时应提示创建并提交", () => {
    const message = formatBranchFileContentGap("feature", "feature.txt", undefined, "feature only");
    expect(message).toContain("feature only");
    expect(message).toContain("feature.txt");
  });

  it("HEAD 文件缺失时应指明目标分支与内容", () => {
    const message = formatFileContentGap("main.txt", undefined, "main", "main only");
    expect(message).toContain("main only");
    expect(message).toContain("main.txt");
  });

  it("merge commit 提示应包含 merge 操作说明", () => {
    const message = formatMergeCommitRequiredGap("main");
    expect(message).toContain("git merge");
    expect(message).toContain("main");
  });
});
