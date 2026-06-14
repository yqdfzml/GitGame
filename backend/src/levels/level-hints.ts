/**
 * 关卡分层提示结构。
 * 功能：按「先观察、再操作」组织三层提示与通关 checklist。
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

/** 49 关分层提示，按 sortOrder 索引 */
const LEVEL_HINTS_BY_ORDER: Record<number, LevelLearningHints> = {
  1: {
    concepts: ["每次 commit 会记录 user.name 与 user.email，这是作者身份。"],
    directions: ["先 git config --list 看当前配置，再设置本关要求的姓名与邮箱。"],
    keyPoints: ["git config user.name \"...\" 与 git config user.email \"...\"，不要改仓库文件。"],
  },
  2: {
    concepts: ["git init 会在当前目录创建空仓库，并默认建立 main 分支。"],
    directions: ["目录尚未初始化，执行 git init 后观察 status。"],
    keyPoints: ["git init 即可；init 后 main 存在但尚无提交。"],
  },
  3: {
    concepts: ["Git 仓库分为工作区、暂存区、版本库。未跟踪与已修改是两种不同状态。"],
    directions: ["先用 git status 观察 welcome.txt 与 app.js，确认状态后再决定下一步。"],
    keyPoints: ["本关只要求辨认状态：welcome.txt 未跟踪，app.js 已修改，暂存区为空。"],
  },
  4: {
    concepts: ["git add 把选中的修改放入暂存区，是 commit 前的必要步骤。"],
    directions: ["status 确认 app.js 为 modified 后，再把它加入暂存区。"],
    keyPoints: ["git add app.js，用 status 确认已进入 staged。"],
  },
  5: {
    concepts: ["add 时要指定路径；未跟踪文件不会因 add 其他文件而自动纳入版本库。"],
    directions: ["status 看清 notes.md 与 draft.txt 的状态，只暂存 notes.md。"],
    keyPoints: ["git add notes.md，不要用 git add . 误把 draft.txt 加进去。"],
  },
  6: {
    concepts: ["同一时刻可以并存 staged、modified、untracked 三种状态。"],
    directions: ["先 status 列出三份文件，再只暂存 notes.md。"],
    keyPoints: ["精确 git add notes.md，app.js 保持 modified，temp.log 保持 untracked。"],
  },
  7: {
    concepts: ["working tree clean 表示工作区与 HEAD 一致；restore 可丢弃已跟踪文件的本地改动。"],
    directions: ["status 确认 app.js 被改脏，再决定如何恢复。"],
    keyPoints: ["git restore app.js 或 git restore .，恢复后 status 应 clean。"],
  },
  8: {
    concepts: ["git diff 展示工作区相对 HEAD 的改动，add 前应先看清改了什么。"],
    directions: ["先 git diff 比较 app.js 与 notes.txt，再只暂存 app.js。"],
    keyPoints: ["git diff → git add app.js，notes.txt 不要进暂存区。"],
  },
  9: {
    concepts: ["commit 会把暂存区快照写入历史，标准流程是 add → commit。"],
    directions: ["status 确认 README.md 已修改，再 add 并 commit。"],
    keyPoints: ["git add README.md → git commit -m \"说明文字\"。"],
  },
  10: {
    concepts: ["可以只 add 部分文件，未 add 的修改不会进入本次 commit。"],
    directions: ["diff 或 status 看清两个文件的改动，只提交 app.js。"],
    keyPoints: ["git add app.js → git commit，debug.log 保留本地修改。"],
  },
  11: {
    concepts: ["暂存区已有内容时，commit 只提交 staged 部分。"],
    directions: ["status 看 app.js 已在暂存区，todo.txt 仍在工作区，直接 commit staged。"],
    keyPoints: ["git commit -m \"...\"，无需再次 add app.js。"],
  },
  12: {
    concepts: ["误改已跟踪文件时，restore 可从 HEAD 恢复工作区。"],
    directions: ["status 确认 config.json 被改错，再 restore。"],
    keyPoints: ["git restore config.json，使工作区回到 HEAD。"],
  },
  13: {
    concepts: ["untracked 文件不会被误 commit，但要避免 git add . 把垃圾文件加进去。"],
    directions: ["status 区分 app.js 与 junk.txt，只提交 app.js。"],
    keyPoints: ["git add app.js → git commit，junk.txt 不要 add。"],
  },
  14: {
    concepts: ["git log 按时间列出提交；git show 查看某次提交的详情。"],
    directions: ["用 log 找到 message 为 feature api 的提交，再用 show 阅读，不要改仓库。"],
    keyPoints: ["git log → git show <commit-id>，本关是观察练习。"],
  },
  15: {
    concepts: ["分支是指向提交的指针；新建分支不会移动其他分支。"],
    directions: ["status 确认干净后，创建 feature 并切换过去。"],
    keyPoints: ["git switch -c feature 或 git checkout -b feature。"],
  },
  16: {
    concepts: ["HEAD 指向当前分支；切换分支只移动 HEAD。"],
    directions: ["先确认当前在 feature，再切回 main。"],
    keyPoints: ["git switch main。"],
  },
  17: {
    concepts: ["各分支独立前进；在 feature 上的 commit 不会自动出现在 main。"],
    directions: ["status 确认在 feature 且 app.js 已修改，再 add 并 commit。"],
    keyPoints: ["git add app.js → git commit -m \"...\""],
  },
  18: {
    concepts: ["在错误分支上的未提交修改，可以随分支切换一起带走。"],
    directions: ["先切到 feature，再完成 app.js 提交。"],
    keyPoints: ["git switch feature → git add app.js → git commit。"],
  },
  19: {
    concepts: ["不同分支可以各自提交，形成并行开发的历史。"],
    directions: ["先在 main 提交 main.txt，再切 feature 新建 feature.txt 并提交。"],
    keyPoints: ["main 上 commit main.txt → switch feature → 新建 feature.txt → add → commit。"],
  },
  20: {
    concepts: ["快进合并发生在 main 无新提交、feature 领先时。"],
    directions: ["log 看清两分支位置，在 main 上 merge feature。"],
    keyPoints: ["git merge feature，合并后 app.js 应为 feature 内容。"],
  },
  21: {
    concepts: ["两分支各有独立提交时，merge 会产生 merge commit。"],
    directions: ["先在 main 提交 main.txt，再到 feature 新建 feature.txt 并提交，最后回 main merge。"],
    keyPoints: ["分步 commit 后 git merge feature，两文件均保留。"],
  },
  22: {
    concepts: ["修改不同行时 Git 可自动合并。"],
    directions: ["log 看分支差异，在 main 上 merge feature。"],
    keyPoints: ["git merge feature，doc.md 应同时包含 LINE1 与 LINE3。"],
  },
  23: {
    concepts: ["同一文件冲突时需选择保留哪一方。"],
    directions: ["merge 后 status 看冲突文件，config.json 取 feature 版。"],
    keyPoints: ["git merge feature → checkout --theirs config.json → add → commit。"],
  },
  24: {
    concepts: ["部分文件冲突、部分自动合并时，只需解决冲突文件。"],
    directions: ["merge 后观察哪些文件自动合并、哪些需要手动处理。"],
    keyPoints: ["config.json 取 feature 版，readme.md 应自动变为 hello。"],
  },
  25: {
    concepts: ["git clone 把远程仓库复制到本地，并自动添加 origin 远程。"],
    directions: ["当前目录未初始化，用 clone 拉取 demo 仓库。"],
    keyPoints: ["git clone https://gitgame.local/demo.git ."],
  },
  26: {
    concepts: ["git remote -v 列出远程名称与 URL。"],
    directions: ["本地已有 origin，用 remote -v 确认地址，本关只观察。"],
    keyPoints: ["git remote -v，不要改动分支或文件。"],
  },
  27: {
    concepts: ["git fetch 只更新远程跟踪分支，不会修改本地工作区与当前分支。"],
    directions: ["status 看本地仍在 v1，fetch 后 remote 跟踪分支应指向 v2。"],
    keyPoints: ["git fetch origin，fetch 后 main 仍停在原提交，origin/main 更新。"],
  },
  28: {
    concepts: ["git pull 等价于 fetch + merge，会把远端更新合入当前分支。"],
    directions: ["确认本地落后 origin/main 后，在 main 上 pull。"],
    keyPoints: ["git pull origin main，完成后 app.js 应为 v2。"],
  },
  29: {
    concepts: ["push 被拒绝说明远端有本地没有的提交，需先 pull 整合再 push。"],
    directions: ["先尝试 push 看拒绝信息，再 pull 合并，最后 push。"],
    keyPoints: ["git push → git pull origin main → git push origin main。"],
  },
  30: {
    concepts: ["git restore --staged 只取消暂存，不丢弃工作区修改。"],
    directions: ["status 看 secret.key 已在暂存区，再取消 staged。"],
    keyPoints: ["git restore --staged secret.key。"],
  },
  31: {
    concepts: ["restore 默认恢复工作区，把已跟踪文件还原为 HEAD 内容。"],
    directions: ["status 确认 app.js 被改错，再 restore。"],
    keyPoints: ["git restore app.js。"],
  },
  32: {
    concepts: ["soft reset 只移动分支指针，保留工作区和暂存区。"],
    directions: ["log 看最新提交，reset 后修改 app.js 为 v2 再 commit。"],
    keyPoints: ["git reset --soft HEAD~1 → 改 app.js → git commit。"],
  },
  33: {
    concepts: ["revert 通过新提交反向抵消旧改动，适合已共享的历史。"],
    directions: ["log 找到 bad change，revert 它而不是 reset。"],
    keyPoints: ["git revert <bad-commit-id>。"],
  },
  34: {
    concepts: ["hard reset 会移动分支指针并重置工作区；只应重置需要修复的分支。"],
    directions: ["log 确认 g03 与 bad3 位置，只 reset main。"],
    keyPoints: ["git reset --hard g03，不要动 topic 分支。"],
  },
  35: {
    concepts: ["stash 临时保存本地修改，让工作区变 clean。"],
    directions: ["status 看 WIP 改动，stash 后切 hotfix。"],
    keyPoints: ["git stash → git switch hotfix。"],
  },
  36: {
    concepts: ["stash 与 switch 配合，可在不打断 WIP 的情况下处理紧急任务。"],
    directions: ["stash WIP → 切 main 提交 hotfix → 回 feature 恢复 WIP。"],
    keyPoints: ["git stash → switch main → 改 version.txt → commit → switch feature → stash pop。"],
  },
  37: {
    concepts: ["stash 是栈结构，stash@{0} 最新，stash@{1} 更早。"],
    directions: ["stash list 看两条贮藏，恢复较早那条。"],
    keyPoints: ["git stash apply stash@{1}。"],
  },
  38: {
    concepts: ["tag 是给某个 commit 起固定名字，常用于标记发布版本。"],
    directions: ["log 确认 release 提交位置，再打 v1.0 标签。"],
    keyPoints: ["git tag v1.0。"],
  },
  39: {
    concepts: ["标签可以指向历史中任意 commit，不一定是最新提交。"],
    directions: ["log 找到 app.js=fixed 的 real fix 提交，再 tag。"],
    keyPoints: ["git log → git tag release <commit-id>。"],
  },
  40: {
    concepts: ["cherry-pick 把某个 commit 的改动复制到当前分支。"],
    directions: ["log 看 feature 上的 fix01，在 main 上 cherry-pick。"],
    keyPoints: ["git cherry-pick fix01。"],
  },
  41: {
    concepts: ["cherry-pick 只拿指定 commit，不会连带其前后的坏提交。"],
    directions: ["log 区分 bad02 与 fix02，只 pick fix02。"],
    keyPoints: ["git cherry-pick fix02。"],
  },
  42: {
    concepts: ["rebase 把当前分支的提交挪到目标分支最新提交之后。"],
    directions: ["log 看 feature 落后 main，在 feature 上 rebase main。"],
    keyPoints: ["git rebase main。"],
  },
  43: {
    concepts: ["soft reset 可撤销多个 commit 但保留文件改动，便于 squash。"],
    directions: ["log 看最近三个 wip 提交，reset 后合成一条 commit。"],
    keyPoints: ["git reset --soft HEAD~3 → git commit -m \"合并说明\"。"],
  },
  44: {
    concepts: ["rebase 遇到冲突时需解决后继续。"],
    directions: ["rebase main 后 status 看冲突，解决并 continue。"],
    keyPoints: ["git rebase main → 解决 app.js → add → git rebase --continue。"],
  },
  45: {
    concepts: ["log/show 可查看历史；revert 适合撤销已定位的问题提交。"],
    directions: ["log 找到 introduce bug，revert 它。"],
    keyPoints: ["git log → git revert d36b。"],
  },
  46: {
    concepts: ["git bisect 用二分法定位首个引入问题的 commit。"],
    directions: ["bisect start 后按 good/bad 标记，直到定位 d37b。"],
    keyPoints: ["git bisect start → git bisect bad → git bisect good d37g → 继续。"],
  },
  47: {
    concepts: ["reflog 记录 HEAD 移动历史，误 reset 后可通过 reflog 找回。"],
    directions: ["reflog 看 reset 前的 good 位置，再 reset 回去。"],
    keyPoints: ["git reflog → git reset --hard d38good。"],
  },
  48: {
    concepts: ["被删除的分支指针可通过 reflog 中的 commit 重新创建。"],
    directions: ["reflog 找 feature 的 commit，再 branch 恢复。"],
    keyPoints: ["git reflog → git branch feature d39feat。"],
  },
  49: {
    concepts: ["综合题：revert 保留历史、merge 合入修复、tag 标记版本。"],
    directions: ["按顺序：revert bad → merge hotfix → tag v2.0。"],
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
