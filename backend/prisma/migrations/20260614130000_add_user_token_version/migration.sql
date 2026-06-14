-- 用户 token 版本号：禁用/降权/撤销会话时递增，使旧 access token 立即失效
ALTER TABLE `users` ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;
