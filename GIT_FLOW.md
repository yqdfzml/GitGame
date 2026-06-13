# Git Flow 工作流规范

## 分支模型

- `main`：稳定主线，只接收已经验证通过的 MVP 或发布提交。
- `develop`：日常集成分支；多人协作时从 `develop` 拉功能分支，当前单人 MVP 可直接在短生命周期功能分支完成后合并回 `main`。
- `feature/<scope>`：功能开发分支，例如 `feature/frontend-mvp`。
- `fix/<scope>`：缺陷修复分支，例如 `fix/challenge-scoring`。
- `release/<version>`：发布整理分支，只做版本号、文案、构建修复和验收问题。
- `hotfix/<scope>`：线上紧急修复分支，从 `main` 拉出，完成后回合到 `main` 和 `develop`。

## 开发流程

1. 从最新主线创建任务分支。
2. 每次提交只包含一个清晰目的，避免混入依赖目录、构建产物和临时文件。
3. 提交前必须运行项目既有验证命令；纯前端任务至少运行测试和构建。
4. UI 变更需要启动本地应用，在浏览器中走通核心路径。
5. 合并前检查 `git status`，确认只包含本次任务相关文件。

## 提交规范

提交信息使用简洁动词短语，优先描述用户价值或工程目的：

- `Add frontend MVP for GitGame`
- `Fix challenge completion scoring`
- `Update Git workflow guide`

本项目提交时排除：

- `node_modules/`
- `dist/`
- `*.tsbuildinfo`
- 本地工具缓存目录，如 `.codegraph/`、`.playwright-mcp/`、`.reasonix/`

## Pull Request 规范

PR 描述包含：

- Summary：本次改动要点。
- Test plan：实际执行的测试、构建和浏览器验证。
- Risk：仍需关注的风险或未覆盖场景。

## 本次 MVP 验收线

- 首页能解释 GitGame 的目标并进入关卡。
- 关卡页能展示章节、锁定规则和进度。
- 练习页能输入 Git 命令、给出反馈、完成挑战并结算 XP/称号。
- 个人中心能展示等级、称号墙，并支持重置本地进度。
- 用户进度保存到浏览器本地存储。
- `pnpm test` 通过。
