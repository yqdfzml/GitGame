-- CreateTable
CREATE TABLE `user_badges` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `badge_id` VARCHAR(64) NOT NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_badges_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_badges_user_id_badge_id_key`(`user_id`, `badge_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_badges` ADD CONSTRAINT `user_badges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
