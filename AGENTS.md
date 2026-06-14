不跑构建，使用中文Git提交信息
每次做完一个新功能或者关键节点记得自动进行git提交
不需要改动完UI进行浏览器测试，我会手动测试
做完后自动提交git
数据库变更 自动进行迁移
## 开发命令

- 根目录 `pnpm dev` — 同时启动前后端
- `pnpm dev:backend` — NestJS API (port 3000)
- `pnpm dev:frontend` — Vue3 Vite (port 5173)
- `pnpm db:migrate` / `pnpm db:seed` — 数据库迁移与种子
- Docker: `docker compose up -d`

## 演示账号

- 用户: demo@gitgame.local / demo123
- 管理员: admin@gitgame.local / admin123
