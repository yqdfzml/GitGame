# 后端服务规范设计说明书（MySQL）

## 1. 设计目标

当前项目是一个前端本地存档的 Git 学习游戏，玩家进度、XP、称号、通关记录等数据主要保存在浏览器本地。后续如果要支持账号体系、多设备同步、排行榜、教学班级、每日挑战和运营数据分析，就需要引入后端服务和 MySQL 数据库。

本规范的目标是定义一套适合当前项目演进的后端服务标准：

- 支持玩家账号、存档同步、关卡进度、成长系统和称号系统。
- 使用 MySQL 作为核心业务数据库。
- 保持前端游戏体验轻量，不让后端复杂度影响 MVP 迭代。
- 明确 API、数据模型、事务、安全、错误码和部署规范。
- 为后续接入班级、排行榜、每日挑战、错题复盘等功能预留合理扩展点。

## 2. 后端服务边界

### 2.1 后端负责什么

后端服务负责：

- 用户注册、登录和身份认证。
- 玩家档案保存与同步。
- 关卡完成记录保存。
- XP、等级、最佳成绩、称号解锁结果保存。
- 游戏配置与关卡数据下发。
- 排行榜、成就墙、学习报告等跨用户功能。
- 管理端或运营端的数据查询能力。

### 2.2 前端继续负责什么

前端继续负责：

- 游戏 UI 渲染。
- 命令输入交互。
- 当前关卡内的即时反馈。
- 本地临时状态。
- 离线或弱网情况下的临时存档。
- 调用后端同步最终通关结果。

### 2.3 不建议后端负责什么

不建议后端在第一阶段负责每一次命令输入校验。原因：

- 命令反馈需要即时响应，放在前端更流畅。
- 当前关卡逻辑已经在前端存在，迁移成本较高。
- 后端只需要接收关卡完成后的结果，并进行必要的可信校验。

后续如果需要防作弊排行榜，可以再增加服务端关卡判定或命令回放校验。

## 3. 推荐技术架构

### 3.1 服务形态

推荐第一阶段使用单体 API 服务：

```text
React/Vite Frontend
        |
        | HTTPS JSON API
        v
Backend API Service
        |
        | Connection Pool
        v
MySQL 8.x
```

单体服务足够支撑当前业务复杂度，避免过早拆分微服务。

### 3.2 推荐后端能力

无论选择 Node.js、NestJS、Express、Fastify 或其他框架，都应具备：

- 路由分层。
- 参数校验。
- 统一错误响应。
- 认证中间件。
- 数据库连接池。
- SQL 参数化查询或 ORM 查询绑定。
- 事务封装。
- 日志与请求追踪。
- 健康检查接口。

### 3.3 MySQL 基础要求

- MySQL 版本建议使用 8.0+。
- 表默认使用 `InnoDB`。
- 字符集使用 `utf8mb4`。
- 排序规则使用 `utf8mb4_unicode_ci` 或团队统一的 `utf8mb4_0900_ai_ci`。
- 所有业务表包含 `created_at`、`updated_at`。
- 重要业务表使用软删除字段 `deleted_at`，除非数据天然不可恢复。
- 所有 SQL 使用参数化查询，禁止字符串拼接用户输入。

## 4. 领域模型

### 4.1 核心实体

```text
User 用户
  └── PlayerProfile 玩家档案
        ├── PlayerChallengeProgress 关卡进度
        ├── PlayerTitleUnlock 称号解锁
        ├── PlayerAchievementUnlock 成就解锁
        └── PlayerActivityLog 玩家行为日志

Challenge 关卡
  ├── ChallengeStep 关卡步骤
  └── ChallengeVersion 关卡版本

Title 称号
Achievement 成就
Leaderboard 排行榜视图或聚合表
```

### 4.2 当前 MVP 对应关系

- 前端 `PlayerProfile` 可映射到后端 `player_profiles`。
- 前端关卡完成记录可映射到 `player_challenge_progress`。
- 前端 XP 和等级可存入 `player_profiles`。
- 前端称号解锁可映射到 `player_title_unlocks`。
- 前端 `challenges.ts` 中的关卡数据未来可迁移到 `challenges` 和 `challenge_steps`。

## 5. 数据库设计规范

### 5.1 命名规范

- 表名使用小写复数蛇形命名：`users`、`player_profiles`。
- 字段名使用小写蛇形命名：`user_id`、`total_xp`。
- 主键统一使用 `id`。
- 外键字段使用 `{entity}_id`。
- 唯一索引用 `uk_表名_字段`。
- 普通索引用 `idx_表名_字段`。
- 外键约束用 `fk_来源表_目标表`。

### 5.2 通用字段

业务表推荐包含：

```sql
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
deleted_at TIMESTAMP NULL DEFAULT NULL,
PRIMARY KEY (id)
```

小型项目也可以使用 `INT UNSIGNED`，但考虑到长期用户行为日志和进度记录会增长，核心业务表推荐 `BIGINT UNSIGNED`。

### 5.3 用户表

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

说明：

- `email` 用于登录，必须唯一。
- `password_hash` 只保存哈希结果，不保存明文密码。
- 如后续接入第三方登录，可新增 `user_identities` 表。

### 5.4 玩家档案表

```sql
CREATE TABLE player_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    total_xp INT UNSIGNED NOT NULL DEFAULT 0,
    current_title_id BIGINT UNSIGNED NULL DEFAULT NULL,
    completed_challenge_count INT UNSIGNED NOT NULL DEFAULT 0,
    perfect_challenge_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_player_profiles_user_id (user_id),
    KEY idx_player_profiles_level_xp (level, total_xp),
    CONSTRAINT fk_player_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

说明：

- `total_xp` 是等级计算的核心依据。
- `level` 可作为冗余字段保存，读取快；写入时必须由服务端统一计算。
- `current_title_id` 指向当前展示称号。

### 5.5 关卡表

```sql
CREATE TABLE challenges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    challenge_key VARCHAR(64) NOT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    chapter VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    summary VARCHAR(255) NOT NULL,
    difficulty ENUM('easy', 'normal', 'hard', 'expert') NOT NULL DEFAULT 'easy',
    base_xp INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_challenges_key_version (challenge_key, version),
    KEY idx_challenges_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

说明：

- `challenge_key` 是稳定业务标识，避免前端依赖自增 ID。
- `version` 用于关卡内容迭代，避免老通关记录失去语义。
- 第一阶段也可以继续把关卡写在前端，后端只保存 `challenge_key`。

### 5.6 关卡步骤表

```sql
CREATE TABLE challenge_steps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    challenge_id BIGINT UNSIGNED NOT NULL,
    step_order INT UNSIGNED NOT NULL,
    objective VARCHAR(255) NOT NULL,
    accepted_commands JSON NOT NULL,
    hint_level_1 VARCHAR(255) NULL DEFAULT NULL,
    hint_level_2 VARCHAR(255) NULL DEFAULT NULL,
    hint_level_3 VARCHAR(255) NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_challenge_steps_order (challenge_id, step_order),
    CONSTRAINT fk_challenge_steps_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

说明：

- `accepted_commands` 使用 JSON 保存可接受命令列表或匹配规则。
- 如果未来命令匹配规则变复杂，应迁移为独立规则表或 DSL 配置。
- 高频查询 JSON 内字段时，应使用生成列和索引。

### 5.7 玩家关卡进度表

```sql
CREATE TABLE player_challenge_progress (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    challenge_key VARCHAR(64) NOT NULL,
    challenge_version INT UNSIGNED NOT NULL DEFAULT 1,
    status ENUM('started', 'completed') NOT NULL DEFAULT 'started',
    best_score TINYINT UNSIGNED NOT NULL DEFAULT 0,
    best_mistake_count INT UNSIGNED NOT NULL DEFAULT 0,
    best_hint_count INT UNSIGNED NOT NULL DEFAULT 0,
    best_in_order TINYINT(1) NOT NULL DEFAULT 1,
    completed_count INT UNSIGNED NOT NULL DEFAULT 0,
    first_completed_at TIMESTAMP NULL DEFAULT NULL,
    last_completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_progress_user_challenge (user_id, challenge_key),
    KEY idx_progress_user_status (user_id, status),
    KEY idx_progress_challenge_score (challenge_key, best_score),
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

说明：

- 每个玩家每个关卡只有一条聚合进度。
- `best_score` 保存最佳成绩。
- `completed_count` 用于统计重复挑战。
- 详细每次通关记录放入 `player_challenge_attempts`。

### 5.8 玩家挑战记录表

```sql
CREATE TABLE player_challenge_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    challenge_key VARCHAR(64) NOT NULL,
    challenge_version INT UNSIGNED NOT NULL DEFAULT 1,
    score TINYINT UNSIGNED NOT NULL,
    earned_xp INT UNSIGNED NOT NULL DEFAULT 0,
    mistake_count INT UNSIGNED NOT NULL DEFAULT 0,
    hint_count INT UNSIGNED NOT NULL DEFAULT 0,
    in_order TINYINT(1) NOT NULL DEFAULT 1,
    command_count INT UNSIGNED NOT NULL DEFAULT 0,
    duration_seconds INT UNSIGNED NULL DEFAULT NULL,
    command_log JSON NULL DEFAULT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_attempts_user_completed (user_id, completed_at),
    KEY idx_attempts_challenge_score (challenge_key, score),
    CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

说明：

- `command_log` 可用于复盘，但可能包含用户输入，应避免记录敏感信息。
- 如果未来数据量增长很快，可按时间或用户分区归档。

### 5.9 称号表

```sql
CREATE TABLE titles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title_key VARCHAR(64) NOT NULL,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
    unlock_rule JSON NOT NULL,
    status ENUM('active', 'hidden', 'archived') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_titles_key (title_key),
    KEY idx_titles_status_rarity (status, rarity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.10 玩家称号解锁表

```sql
CREATE TABLE player_title_unlocks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title_key VARCHAR(64) NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_title_unlocks_user_title (user_id, title_key),
    KEY idx_title_unlocks_user (user_id),
    CONSTRAINT fk_title_unlocks_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 6. API 设计规范

### 6.1 通用约定

- API 使用 JSON。
- 路径使用 REST 风格。
- 时间字段使用 ISO 8601 字符串。
- 金额类字段如未来出现必须使用字符串或整数分单位，不使用浮点数。
- 所有需要登录的接口通过 `Authorization: Bearer <token>` 认证。
- 所有写接口都要做参数校验和权限校验。

### 6.2 响应结构

成功响应：

```json
{
  "data": {},
  "requestId": "req_abc123"
}
```

失败响应：

```json
{
  "error": {
    "code": "CHALLENGE_NOT_FOUND",
    "message": "关卡不存在或未发布",
    "details": {}
  },
  "requestId": "req_abc123"
}
```

### 6.3 认证接口

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

注册请求：

```json
{
  "email": "player@example.com",
  "password": "password",
  "displayName": "Git 少侠"
}
```

登录成功响应：

```json
{
  "data": {
    "accessToken": "...",
    "user": {
      "id": "1",
      "email": "player@example.com",
      "displayName": "Git 少侠"
    }
  },
  "requestId": "req_abc123"
}
```

### 6.4 玩家档案接口

```http
GET   /api/player/profile
PATCH /api/player/profile
GET   /api/player/titles
PATCH /api/player/current-title
```

`GET /api/player/profile` 响应示例：

```json
{
  "data": {
    "level": 3,
    "totalXp": 240,
    "currentTitle": {
      "key": "branch_walker",
      "name": "分支行者"
    },
    "completedChallengeCount": 5,
    "perfectChallengeCount": 2
  },
  "requestId": "req_abc123"
}
```

### 6.5 关卡接口

```http
GET /api/challenges
GET /api/challenges/:challengeKey
GET /api/player/challenge-progress
POST /api/player/challenge-attempts
```

`POST /api/player/challenge-attempts` 请求示例：

```json
{
  "challengeKey": "first_commit",
  "challengeVersion": 1,
  "score": 95,
  "mistakeCount": 1,
  "hintCount": 0,
  "inOrder": true,
  "commandCount": 4,
  "durationSeconds": 180,
  "commandLog": [
    "git init",
    "git add .",
    "git commit -m \"first commit\""
  ]
}
```

响应示例：

```json
{
  "data": {
    "earnedXp": 35,
    "levelBefore": 2,
    "levelAfter": 3,
    "bestScoreUpdated": true,
    "unlockedTitles": [
      {
        "key": "first_commit",
        "name": "初入仓库"
      }
    ]
  },
  "requestId": "req_abc123"
}
```

### 6.6 排行榜接口

```http
GET /api/leaderboards/xp
GET /api/leaderboards/challenges/:challengeKey
```

排行榜第一阶段可以直接查询聚合字段；当数据量变大后，改为定时聚合表。

## 7. 核心业务流程

### 7.1 注册流程

1. 校验邮箱、密码、昵称。
2. 检查邮箱是否已存在。
3. 写入 `users`。
4. 初始化 `player_profiles`。
5. 解锁默认称号。
6. 返回登录 token 和玩家档案。

注册需要事务包裹，避免用户创建成功但档案初始化失败。

### 7.2 关卡完成流程

1. 前端提交关卡完成结果。
2. 后端验证用户身份。
3. 后端验证关卡是否存在、是否发布、版本是否可接受。
4. 后端计算本次 XP，而不是完全信任前端传入的 `earnedXp`。
5. 后端读取当前进度。
6. 如果首次完成或刷新最佳成绩，更新聚合进度。
7. 更新玩家总 XP 和等级。
8. 计算并写入新解锁称号。
9. 写入本次挑战记录。
10. 返回结算结果。

这个流程必须使用数据库事务。

### 7.3 称号解锁流程

称号解锁可以在关卡完成事务中同步计算。

设计原则：

- 称号解锁必须幂等。
- 使用 `UNIQUE KEY (user_id, title_key)` 防止重复写入。
- 解锁规则可以先写在代码中，未来再配置化到 `titles.unlock_rule`。

## 8. 事务规范

### 8.1 需要事务的场景

- 注册并初始化玩家档案。
- 关卡完成结算。
- 修改玩家当前称号并校验拥有关系。
- 批量发放活动奖励。
- 后台修改关卡版本并发布。

### 8.2 事务原则

- 使用 InnoDB。
- 事务要短，不在事务内做外部网络请求。
- 先读后写的关键数据需要加锁或使用原子更新。
- 对死锁进行有限重试。
- 所有事务失败必须回滚。

### 8.3 关卡结算事务示例

```sql
START TRANSACTION;

SELECT id, total_xp, level
FROM player_profiles
WHERE user_id = ?
FOR UPDATE;

SELECT id, best_score, completed_count
FROM player_challenge_progress
WHERE user_id = ? AND challenge_key = ?
FOR UPDATE;

-- 根据服务端规则计算 XP、等级和称号。
-- 写入 attempts、更新 progress、更新 profile、插入 title unlocks。

COMMIT;
```

## 9. 索引规范

### 9.1 必须索引的字段

- 外键字段：`user_id`、`challenge_id`。
- 登录查询字段：`email`。
- 稳定业务标识：`challenge_key`、`title_key`。
- 排序和筛选字段：`created_at`、`completed_at`、`status`。
- 排行榜字段：`level`、`total_xp`、`best_score`。

### 9.2 联合索引原则

- 按查询模式建索引，不按字段感觉建索引。
- 联合索引遵循最左前缀。
- 高选择性字段优先。
- 避免给低基数字段单独建索引，例如单独的 `status` 通常价值有限。

### 9.3 查询规范

- 生产代码禁止 `SELECT *`。
- 分页优先使用 keyset pagination。
- 避免在索引列上套函数。
- 避免隐式类型转换。
- 复杂查询上线前使用 `EXPLAIN` 检查执行计划。

## 10. 安全规范

### 10.1 认证与密码

- 密码必须使用 bcrypt、argon2 等安全算法哈希。
- 不保存明文密码。
- 登录失败需要限流。
- token 设置合理过期时间。
- 刷新 token 如需支持，应单独存储和撤销。

### 10.2 SQL 安全

- 所有 SQL 使用参数化查询。
- 禁止拼接用户输入生成 SQL。
- 数据库账号遵循最小权限原则。
- 应用账号只授予需要的 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 权限。
- 迁移账号和应用账号分离。

### 10.3 数据安全

- 不记录密码、token、密钥到日志。
- `command_log` 可能包含玩家输入，展示前需要转义。
- 所有用户可见文本防止 XSS。
- 管理端接口必须有额外权限校验。

### 10.4 MySQL 连接安全

- 生产环境使用 TLS 连接 MySQL。
- 数据库密码通过环境变量或密钥系统注入。
- 不把 `.env`、数据库密码、连接串提交到仓库。

## 11. 错误码规范

错误码使用大写蛇形命名。

| HTTP 状态 | 错误码 | 含义 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 请求参数不合法 |
| 401 | UNAUTHORIZED | 未登录或 token 无效 |
| 403 | FORBIDDEN | 无权限访问 |
| 404 | CHALLENGE_NOT_FOUND | 关卡不存在或未发布 |
| 404 | TITLE_NOT_FOUND | 称号不存在 |
| 409 | EMAIL_ALREADY_EXISTS | 邮箱已注册 |
| 409 | CHALLENGE_VERSION_CONFLICT | 关卡版本不兼容 |
| 429 | RATE_LIMITED | 请求过于频繁 |
| 500 | INTERNAL_ERROR | 服务内部错误 |

错误响应中的 `message` 面向用户或前端，`details` 只放可安全暴露的信息。

## 12. 配置规范

推荐环境变量：

```text
APP_ENV=development
APP_PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=git_game
DATABASE_USER=git_game_app
DATABASE_PASSWORD=******
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
JWT_SECRET=******
JWT_EXPIRES_IN=3600
CORS_ORIGIN=http://localhost:5173
```

规范：

- 本地可以使用 `.env.local`，但不得提交真实密钥。
- 生产配置由部署平台或密钥系统注入。
- 不同环境使用不同数据库账号。

## 13. 日志与监控

### 13.1 应用日志

每个请求记录：

- `requestId`。
- HTTP method。
- path。
- userId。
- status code。
- duration。
- error code。

禁止记录：

- 密码。
- token。
- 数据库密码。
- 用户隐私敏感内容。

### 13.2 数据库监控

需要关注：

- 慢查询。
- 连接池耗尽。
- 死锁次数。
- 表大小增长。
- 索引命中率。
- 主从复制延迟，如果后续使用读副本。

### 13.3 健康检查

推荐接口：

```http
GET /healthz
GET /readyz
```

- `/healthz`：服务进程是否存活。
- `/readyz`：数据库连接是否可用，服务是否可以接收流量。

## 14. 数据迁移规范

### 14.1 迁移原则

- 所有 schema 变更必须通过 migration 文件。
- migration 文件进入版本控制。
- 禁止手动在线上数据库直接改表后不记录。
- 大表变更需要评估锁表风险。
- 回滚脚本或回滚方案必须明确。

### 14.2 命名规范

```text
YYYYMMDDHHMMSS_create_users_table.sql
YYYYMMDDHHMMSS_create_player_profiles_table.sql
YYYYMMDDHHMMSS_add_challenge_version_to_attempts.sql
```

### 14.3 种子数据

关卡、称号、成就属于配置型业务数据，可以通过 seed 脚本写入。

种子数据要求：

- 幂等。
- 使用稳定 key 更新，而不是依赖自增 ID。
- 支持重复执行。

## 15. 部署规范

### 15.1 推荐环境

- `development`：本地开发。
- `staging`：测试环境。
- `production`：生产环境。

### 15.2 发布流程

1. 执行数据库 migration。
2. 部署后端服务。
3. 执行健康检查。
4. 验证关键 API。
5. 发布前端配置。

### 15.3 回滚原则

- 后端代码可回滚。
- 数据库 migration 尽量向前兼容。
- 删除字段、改字段含义、重命名字段必须拆成多阶段发布。

## 16. 与当前前端的集成策略

### 16.1 第一阶段：本地优先，同步结果

前端仍然可以使用本地状态完成关卡体验。玩家登录后，在关卡结算时调用后端同步结果。

优点：

- 改动小。
- 游戏体验不依赖网络实时性。
- 后端只接收完成结果，服务边界清晰。

### 16.2 第二阶段：服务端下发关卡配置

后端提供关卡列表和关卡详情接口，前端从 API 加载关卡数据。

优点：

- 不发版也能调整关卡文案。
- 可以灰度发布新关卡。
- 可以按用户群体开放不同章节。

### 16.3 第三阶段：服务端校验命令回放

如果需要排行榜防作弊，可以让前端提交命令回放，由后端重放校验。

优点：

- 排行榜更可信。
- 可以分析常见错误路径。
- 支持学习报告和错题复盘。

## 17. MVP 后端里程碑

### Phase 1：账号与云存档

- 用户注册登录。
- 玩家档案。
- 关卡完成记录。
- XP、等级和称号同步。

### Phase 2：关卡配置服务化

- 关卡表。
- 关卡步骤表。
- 关卡版本。
- 发布状态。

### Phase 3：成长与成就增强

- 成就系统。
- 称号配置化。
- 学习报告。
- 错题复盘。

### Phase 4：社交与教学场景

- 排行榜。
- 班级或队伍。
- 教师查看学员进度。
- 每日挑战。

## 18. 关键设计原则

后端服务设计应始终遵循以下原则：

1. **前端体验优先**：命令输入和即时反馈不能因为后端请求变慢。
2. **服务端结果可信**：XP、等级、称号等最终成长结果由服务端计算或校验。
3. **数据结构可演进**：关卡和称号使用稳定 key，避免强依赖自增 ID。
4. **事务保证一致性**：通关结算必须保证进度、XP、等级、称号一起成功或一起失败。
5. **MySQL 查询可控**：高频查询有索引，复杂查询上线前使用 `EXPLAIN`。
6. **安全默认开启**：参数化 SQL、最小权限、密码哈希、敏感信息不进日志。

## 19. 推荐第一步落地范围

如果当前项目准备真正接入后端，建议先只实现最小闭环：

- `users`
- `player_profiles`
- `player_challenge_progress`
- `player_challenge_attempts`
- `titles`
- `player_title_unlocks`
- 注册登录 API
- 获取玩家档案 API
- 提交关卡结果 API

不要第一阶段就实现完整管理端、排行榜、班级系统和每日挑战。先保证“登录后多设备同步玩家成长”这个核心价值跑通，再扩展其他能力。
