-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(512) NULL;

-- CreateTable
CREATE TABLE `hero_invites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `note` VARCHAR(128) NULL,
    `used_by_id` BIGINT NULL,
    `used_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `hero_invites_code_key`(`code`),
    UNIQUE INDEX `hero_invites_used_by_id_key`(`used_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hero_invites` ADD CONSTRAINT `hero_invites_used_by_id_fkey` FOREIGN KEY (`used_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
