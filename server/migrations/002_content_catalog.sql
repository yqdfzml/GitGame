-- 关卡与章节内容表：后续新增关卡只需写入数据库，无需改前端代码

CREATE TABLE IF NOT EXISTS challenge_chapters (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    chapter_key VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'hidden') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_chapter_key (chapter_key),
    KEY idx_chapter_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS challenges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    challenge_key VARCHAR(64) NOT NULL,
    chapter_key VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    base_xp INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'hidden', 'archived') NOT NULL DEFAULT 'active',
    content JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_challenge_key (challenge_key),
    KEY idx_challenge_chapter_sort (chapter_key, sort_order),
    KEY idx_challenge_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
