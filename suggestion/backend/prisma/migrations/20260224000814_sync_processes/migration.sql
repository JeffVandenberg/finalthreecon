-- CreateTable
CREATE TABLE `sync_jobs` (
    `id` VARCHAR(36) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NULL,
    `record_count` INTEGER NULL,
    `error` TEXT NULL,
    `metadata` JSON NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `user_id` VARCHAR(36) NOT NULL,

    INDEX `sync_jobs_user_id_idx`(`user_id`),
    INDEX `sync_jobs_type_idx`(`type`),
    INDEX `sync_jobs_status_idx`(`status`),
    INDEX `sync_jobs_started_at_idx`(`started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sync_jobs` ADD CONSTRAINT `sync_jobs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
