-- 等级定义与全局游戏配置，由后端统一管理

CREATE TABLE IF NOT EXISTS level_definitions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    level SMALLINT UNSIGNED NOT NULL,
    name VARCHAR(64) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('active', 'hidden') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_level_definitions_level (level),
    KEY idx_level_definitions_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_config (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    config_key VARCHAR(64) NOT NULL,
    config_value JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_game_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
