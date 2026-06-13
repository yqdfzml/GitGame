-- GitGame 重构初始表结构

CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(64) NOT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `levels` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `course_id` VARCHAR(64) NOT NULL,
    `chapter_id` VARCHAR(64) NULL,
    `title` VARCHAR(128) NOT NULL,
    `description` TEXT NOT NULL,
    `difficulty` ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED') NOT NULL DEFAULT 'BEGINNER',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `initial_state` JSON NOT NULL,
    `goal` JSON NOT NULL,
    `constraints` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `published_at` DATETIME(3) NULL,
    INDEX `levels_course_id_idx`(`course_id`),
    INDEX `levels_difficulty_idx`(`difficulty`),
    INDEX `levels_status_idx`(`status`),
    INDEX `levels_sort_order_idx`(`sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attempts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `level_id` BIGINT NOT NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'IN_PROGRESS',
    `current_state` JSON NOT NULL,
    `step_count` INTEGER NOT NULL DEFAULT 0,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    INDEX `attempts_user_id_idx`(`user_id`),
    INDEX `attempts_level_id_idx`(`level_id`),
    INDEX `attempts_status_idx`(`status`),
    INDEX `attempts_started_at_idx`(`started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attempt_commands` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `attempt_id` BIGINT NOT NULL,
    `step_index` INTEGER NOT NULL,
    `command` VARCHAR(512) NOT NULL,
    `feedback` TEXT NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `output` MEDIUMTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `attempt_commands_attempt_id_idx`(`attempt_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attempt_snapshots` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `attempt_id` BIGINT NOT NULL,
    `step_index` INTEGER NOT NULL,
    `state` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `attempt_snapshots_attempt_id_idx`(`attempt_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `level_results` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `level_id` BIGINT NOT NULL,
    `attempt_id` BIGINT NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `duration_seconds` INTEGER NOT NULL,
    `command_count` INTEGER NOT NULL,
    `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `level_results_user_id_level_id_key`(`user_id`, `level_id`),
    INDEX `level_results_level_id_score_idx`(`level_id`, `score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `leaderboard_entries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `level_id` BIGINT NOT NULL,
    `score` INTEGER NOT NULL,
    `duration_seconds` INTEGER NOT NULL,
    `display_name` VARCHAR(64) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `leaderboard_entries_user_id_level_id_key`(`user_id`, `level_id`),
    INDEX `leaderboard_entries_level_id_score_duration_seconds_idx`(`level_id`, `score`, `duration_seconds`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `attempts` ADD CONSTRAINT `attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `attempt_commands` ADD CONSTRAINT `attempt_commands_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `attempt_snapshots` ADD CONSTRAINT `attempt_snapshots_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `level_results` ADD CONSTRAINT `level_results_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `level_results` ADD CONSTRAINT `level_results_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `leaderboard_entries` ADD CONSTRAINT `leaderboard_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
