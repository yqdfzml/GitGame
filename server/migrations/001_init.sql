-- GitGame MVP 后端初始表结构
-- 执行前请先创建数据库：CREATE DATABASE git_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS player_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    total_xp INT UNSIGNED NOT NULL DEFAULT 0,
    current_title_key VARCHAR(64) NULL DEFAULT NULL,
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

CREATE TABLE IF NOT EXISTS player_challenge_progress (
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

CREATE TABLE IF NOT EXISTS player_challenge_attempts (
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

CREATE TABLE IF NOT EXISTS titles (
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

CREATE TABLE IF NOT EXISTS player_title_unlocks (
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
