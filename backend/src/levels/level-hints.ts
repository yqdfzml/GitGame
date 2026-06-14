/**
 * 关卡分层提示结构。
 * 功能：按 GAME_DESIGN 三层提示 + 通关目标 checklist 组织内容。
 */
export interface LevelLearningHints {
  /** 概念层：解释本关涉及的 Git 知识点 */
  concepts: string[];
  /** 方向层：告诉玩家该做哪类操作 */
  directions: string[];
  /** 点拨层：给出命令思路，不直接泄露完整答案 */
  keyPoints: string[];
}

/**
 * 前端展示的完整提示包。
 * 功能：合并教学提示与目标 checklist。
 */
export interface LevelGoalHintsBundle {
  concepts: string[];
  directions: string[];
  keyPoints: string[];
  targets: string[];
}

/** 40 关分层提示，按 sortOrder 索引 */
const LEVEL_HINTS_BY_ORDER: Record<number, LevelLearningHints> = {
  1: {
    concepts: ["Git 仓库分为工作区、暂存区、版本库。未跟踪（untracked）文件尚未被 Git 管理。"],
    directions: ["先用 git status 观察当前状态，不要误把文件加入版本库。"],
    keyPoints: ["welcome.txt 需要保持未跟踪，暂存区保持为空。"],
  },
  2: {
    concepts: ["已跟踪文件被修改后，工作区内容与 HEAD 不一致，status 会显示 modified。"],
    directions: ["用 git status 确认 app.js 的修改，保留这份本地改动即可。"],
    keyPoints: ["本题不要求提交或 restore，只要 app.js 仍为 v2。"],
  },
  3: {
    concepts: ["git add 把选中的修改放入暂存区，是 commit 前的必要步骤。"],
    directions: ["将 notes.md 的修改加入暂存区，但先不要 commit。"],
    keyPoints: ["可尝试 git add notes.md，再用 git status 确认 staged 状态。"],
  },
  4: {
    concepts: ["同一时刻可以并存 staged、modified、untracked 三种状态，add 时要精确指定路径。"],
    directions: ["只暂存 notes.md，不要动 app.js 和 temp.log。"],
    keyPoints: ["用 git add notes.md 精确暂存，避免 git add . 误伤其他文件。"],
  },
  5: {
    concepts: ["working tree clean 表示工作区与 HEAD 一致；git restore 可丢弃已跟踪文件的本地改动。"],
    directions: ["丢弃 app.js 的错误修改，让工作区恢复到上次提交的状态。"],
    keyPoints: ["先 git status 确认脏文件，再 git restore . 或 git restore app.js。"],
  },
  6: {
    concepts: ["commit 会把暂存区快照写入历史，标准流程是 add → commit。"],
    directions: ["将 README.md 的修改加入暂存区并完成提交。"],
    keyPoints: ["git add README.md，再 git commit -m \"说明文字\"。"],
  },
  7: {
    concepts: ["可以只 add 部分文件，未 add 的修改不会进入本次 commit。"],
    directions: ["只提交 app.js，保留 debug.log 的本地修改。"],
    keyPoints: ["git add app.js → git commit -m \"...\"。不要 add debug.log。"],
  },
  8: {
    concepts: ["暂存区已有内容时，commit 只提交已 staged 的部分，其余修改仍留在工作区。"],
    directions: ["直接提交已在暂存区的 app.js，todo.txt 的 WIP 不要提交。"],
    keyPoints: ["git commit -m \"...\" 即可，无需再次 add app.js。"],
  },
  9: {
    concepts: ["误改已跟踪文件时，restore 可从 HEAD 恢复工作区正确内容。"],
    directions: ["用 restore 撤销 config.json 的本地误改，使工作区与 HEAD 一致。"],
    keyPoints: ["git restore config.json 或 git restore ."],
  },
  10: {
    concepts: ["untracked 文件不会被 git add . 以外的误操作自动提交，但要避免 add 未跟踪文件。"],
    directions: ["只把 app.js 提交进历史，junk.txt 不要进入版本库。"],
    keyPoints: ["git add app.js → git commit -m \"...\"。不要 add junk.txt。"],
  },
  11: {
    concepts: ["分支是指向提交的指针；新建分支不会移动其他分支。"],
    directions: ["创建 feature 分支并切换过去，main 保持不动。"],
    keyPoints: ["git checkout -b feature 或 git switch -c feature。"],
  },
  12: {
    concepts: ["HEAD 指向当前分支；切换分支只移动 HEAD，不改变各分支的 commit。"],
    directions: ["从 feature 切换回 main。"],
    keyPoints: ["git checkout main 或 git switch main。"],
  },
  13: {
    concepts: ["各分支独立前进；在 feature 上的 commit 不会自动出现在 main。"],
    directions: ["在 feature 分支提交 app.js 的 v2 修改。"],
    keyPoints: ["确认当前在 feature → git add app.js → git commit -m \"...\""],
  },
  14: {
    concepts: ["在错误分支上的未提交修改，可以随分支切换一起带走。"],
    directions: ["先切到 feature，再完成 app.js 的提交。"],
    keyPoints: ["git checkout feature → git add app.js → git commit -m \"...\""],
  },
  15: {
    concepts: ["不同分支可以各自提交，形成并行开发的历史。"],
    directions: ["先在 main 提交 main.txt，再切到 feature 新建并提交 feature.txt。"],
    keyPoints: ["main 上 commit 后，switch feature，touch/echo 创建 feature.txt → git add → commit。"],
  },
  16: {
    concepts: ["快进合并（fast-forward）发生在 main 无新提交、feature 领先时，main 直接移到 feature。"],
    directions: ["当前在 main，将 feature 合并进来（git merge feature）。"],
    keyPoints: ["git merge feature，合并后 main 包含 feature 的全部改动。"],
  },
  17: {
    concepts: ["两分支各有独立提交时，merge 会产生 merge commit（两个父提交）。"],
    directions: ["当前在 main，执行 git merge feature，保留双方文件改动。"],
    keyPoints: ["git merge feature → 完成 merge commit，main 同时有 main.txt 与 feature.txt。"],
  },
  18: {
    concepts: ["修改不同行时 Git 可自动合并，无需手动解决冲突。"],
    directions: ["当前在 main，git merge feature，自动合并 doc.md。"],
    keyPoints: ["git merge feature，doc.md 应同时包含 LINE1 与 LINE3。"],
  },
  19: {
    concepts: ["同一行冲突时需选择保留哪一方；checkout --theirs 取被合并分支（feature）的版本。"],
    directions: ["当前在 main，git merge feature，冲突时 config.json 取 feature 版本。"],
    keyPoints: ["git merge feature → git checkout --theirs config.json → git add → git commit。"],
  },
  20: {
    concepts: ["部分文件冲突、部分自动合并时，只需解决冲突文件，其余会自动合入。"],
    directions: ["当前在 main，git merge feature，config.json 取 feature 版。"],
    keyPoints: ["merge 后 config.json=feat-v，readme.md 应自动变为 hello。"],
  },
  21: {
    concepts: ["git restore --staged 只取消暂存，不丢弃工作区修改。"],
    directions: ["取消 secret.key 的暂存，但保留工作区里的 new-secret。"],
    keyPoints: ["git restore --staged secret.key，不要用不带 --staged 的 restore。"],
  },
  22: {
    concepts: ["restore 默认恢复工作区，把已跟踪文件还原为 HEAD 内容。"],
    directions: ["丢弃 app.js 的错误修改，恢复为 correct。"],
    keyPoints: ["git restore app.js 或 git restore .。"],
  },
  23: {
    concepts: ["soft reset 只移动分支指针，保留工作区和暂存区，便于重新提交。"],
    directions: ["撤销最新 commit，修改 app.js 为 v2 后重新提交。"],
    keyPoints: ["git reset --soft HEAD~1 → 修改/确认 app.js → git commit -m \"...\""],
  },
  24: {
    concepts: ["revert 通过新提交反向抵消旧改动，适合已共享的历史，不会改写 commit。"],
    directions: ["revert 引入错误的那个 commit，恢复 config.json 为 debug:false。"],
    keyPoints: ["git log 找到 bad change → git revert <commit-id>。"],
  },
  25: {
    concepts: ["hard reset 会移动分支指针并重置工作区；只应重置需要修复的分支。"],
    directions: ["将 main 重置回 g03，保留 topic 分支上的错误提交。"],
    keyPoints: ["git reset --hard g03，不要动 topic 分支。"],
  },
  26: {
    concepts: ["stash 临时保存本地修改，让工作区变 clean，便于切换分支。"],
    directions: ["贮藏 feature 上的 WIP，切换到 hotfix 分支。"],
    keyPoints: ["git stash → git checkout hotfix。"],
  },
  27: {
    concepts: ["stash 与 checkout 配合，可在不打断 WIP 的情况下处理紧急任务。"],
    directions: ["贮藏 WIP → 切 main 提交 hotfix → 切回 feature 恢复 WIP。"],
    keyPoints: ["git stash → checkout main → 改 version.txt → commit → checkout feature → git stash pop。"],
  },
  28: {
    concepts: ["stash 是栈结构，stash@{0} 最新，stash@{1} 更早。"],
    directions: ["从两条贮藏中恢复较早的那条（first-wip）。"],
    keyPoints: ["git stash apply stash@{1} 或 git stash pop stash@{1}。"],
  },
  29: {
    concepts: ["tag 是给某个 commit 起固定名字，常用于标记发布版本。"],
    directions: ["给当前 release 提交打上 v1.0 标签。"],
    keyPoints: ["git tag v1.0 或 git tag v1.0 st3rel。"],
  },
  30: {
    concepts: ["标签可以指向历史中任意 commit，不一定是最新提交。"],
    directions: ["找到 app.js=fixed 的那次提交并打上 release 标签。"],
    keyPoints: ["git log 定位 real fix → git tag release <commit-id>。"],
  },
  31: {
    concepts: ["cherry-pick 把某个 commit 的改动复制到当前分支，不会合并整条分支。"],
    directions: ["在 main 上 cherry-pick feature 分支上的 fix01 提交。"],
    keyPoints: ["git cherry-pick fix01。"],
  },
  32: {
    concepts: ["cherry-pick 只拿指定 commit，不会连带其前后的坏提交。"],
    directions: ["只 cherry-pick fix02，不要把 bad02 也带过来。"],
    keyPoints: ["git cherry-pick fix02，确认 main 上 app.js 为 fixed。"],
  },
  33: {
    concepts: ["rebase 把当前分支的提交挪到目标分支最新提交之后，历史更线性。"],
    directions: ["在 feature 上 rebase 到最新 main。"],
    keyPoints: ["git rebase main，完成后 feature 应基于 rb1main。"],
  },
  34: {
    concepts: ["soft reset 可撤销多个 commit 但保留文件改动，便于 squash 成一次提交。"],
    directions: ["把最近 3 个零散 commit 合并为 1 个语义清晰的提交。"],
    keyPoints: ["git reset --soft HEAD~3 → git commit -m \"合并后的说明\"。"],
  },
  35: {
    concepts: ["rebase 遇到冲突时需解决后继续；checkout --ours/--theirs 可选保留哪边。"],
    directions: ["rebase main 产生冲突后解决并完成 rebase。"],
    keyPoints: ["git rebase main → 解决 app.js 冲突 → git add → git rebase --continue。"],
  },
  36: {
    concepts: ["log/show 可查看历史；revert 适合撤销已定位的问题提交。"],
    directions: ["找到引入 bug 的 commit 并 revert 它。"],
    keyPoints: ["git log 找到 introduce bug → git revert d36b。"],
  },
  37: {
    concepts: ["git bisect 用二分法在历史中定位首个引入问题的 commit。"],
    directions: ["用 bisect 在 good 与 bad 之间找到首个不良提交 d37b。"],
    keyPoints: ["git bisect start → git bisect bad → git bisect good d37g → 继续标记直到定位。"],
  },
  38: {
    concepts: ["reflog 记录 HEAD 移动历史，误 reset 后可通过 reflog 找回正确位置。"],
    directions: ["main 被误 reset 到旧版本，用 reflog 恢复到 d38good。"],
    keyPoints: ["git reflog → git reset --hard d38good。"],
  },
  39: {
    concepts: ["被删除的分支指针可通过 reflog 中的 commit 重新创建。"],
    directions: ["用 reflog 里 feature 的 commit 恢复 feature 分支。"],
    keyPoints: ["git reflog → git branch feature d39feat。"],
  },
  40: {
    concepts: ["综合题：revert 保留历史、merge 合入修复、tag 标记版本。"],
    directions: ["revert 错误提交 → merge hotfix → 给 hotfix 提交打 v2.0 标签。"],
    keyPoints: ["git revert d40bad → git merge hotfix → git tag v2.0 d40fix。"],
  },
};

/**
 * 获取指定关卡的分层教学提示。
 * 功能：按 sortOrder 查找预置提示，找不到时返回空数组。
 * 参数：sortOrder - 关卡排序号。
 * 返回值：三层教学提示。
 */
export const getLevelLearningHints = (sortOrder: number): LevelLearningHints => {
  const hints = LEVEL_HINTS_BY_ORDER[sortOrder];
  if (!hints) {
    return { concepts: [], directions: [], keyPoints: [] };
  }
  return hints;
};
