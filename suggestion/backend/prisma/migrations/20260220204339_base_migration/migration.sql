-- CreateTable
CREATE TABLE `badge_types` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `max_quantity` INTEGER NOT NULL,
    `available_quantity` INTEGER NOT NULL,
    `sellable` BOOLEAN NOT NULL DEFAULT true,
    `private` BOOLEAN NOT NULL DEFAULT false,
    `custom_fields` JSON NOT NULL,
    `early_access_date` DATETIME(3) NULL,
    `allow_event_submissions` BOOLEAN NOT NULL DEFAULT true,
    `ticket_purchases_allowed` BOOLEAN NOT NULL DEFAULT true,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `badges` (
    `id` VARCHAR(36) NOT NULL,
    `badgetype_id` VARCHAR(36) NOT NULL,
    `badge_number` INTEGER NOT NULL,
    `shortname` VARCHAR(100) NULL,
    `name` VARCHAR(255) NOT NULL,
    `badge_display_name` VARCHAR(255) NULL,
    `pronouns` VARCHAR(50) NULL,
    `discord_name` VARCHAR(100) NULL,
    `custom_fields` JSON NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `checked_in` BOOLEAN NOT NULL DEFAULT false,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    INDEX `badges_badgetype_id_idx`(`badgetype_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `badge_logs` (
    `id` VARCHAR(36) NOT NULL,
    `badge_id` VARCHAR(36) NOT NULL,
    `commenter_name` VARCHAR(100) NOT NULL,
    `comment` VARCHAR(255) NOT NULL,
    `type` VARCHAR(25) NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    INDEX `badge_logs_badge_id_idx`(`badge_id`),
    FULLTEXT INDEX `badge_logs_comment_idx`(`comment`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spaces` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` VARCHAR(36) NOT NULL,
    `space_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `capacity` INTEGER NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    INDEX `rooms_space_id_idx`(`space_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_types` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_eventtypes` (
    `id` VARCHAR(36) NOT NULL,
    `room_id` VARCHAR(36) NOT NULL,
    `event_type_id` VARCHAR(36) NOT NULL,

    INDEX `room_eventtypes_room_id_idx`(`room_id`),
    INDEX `room_eventtypes_event_type_id_idx`(`event_type_id`),
    UNIQUE INDEX `room_eventtypes_room_id_event_type_id_key`(`room_id`, `event_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dayparts` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `day_name` VARCHAR(50) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_dayparts` (
    `id` VARCHAR(36) NOT NULL,
    `room_id` VARCHAR(36) NOT NULL,
    `daypart_id` VARCHAR(36) NOT NULL,

    INDEX `room_dayparts_room_id_idx`(`room_id`),
    INDEX `room_dayparts_daypart_id_idx`(`daypart_id`),
    UNIQUE INDEX `room_dayparts_room_id_daypart_id_key`(`room_id`, `daypart_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(36) NOT NULL,
    `room_id` VARCHAR(36) NOT NULL,
    `space_id` VARCHAR(36) NOT NULL,
    `event_type_id` VARCHAR(36) NOT NULL,
    `startdaypart_id` VARCHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `event_number` INTEGER NOT NULL,
    `description` TEXT NOT NULL,
    `view_uri` VARCHAR(255) NULL,
    `duration` INTEGER NOT NULL,
    `hosts` JSON NOT NULL,
    `custom_fields` JSON NOT NULL,
    `relationships` JSON NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    INDEX `events_id_idx`(`id`),
    INDEX `events_room_id_idx`(`room_id`),
    INDEX `events_space_id_idx`(`space_id`),
    INDEX `events_event_type_id_idx`(`event_type_id`),
    INDEX `events_startdaypart_id_idx`(`startdaypart_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` VARCHAR(36) NOT NULL,
    `badge_id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NOT NULL,
    `relationships` JSON NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    INDEX `tickets_badge_id_idx`(`badge_id`),
    INDEX `tickets_event_id_badge_id_idx`(`event_id`, `badge_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `sku` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `date_created` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_updated` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'user',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `badges` ADD CONSTRAINT `badges_badgetype_id_fkey` FOREIGN KEY (`badgetype_id`) REFERENCES `badge_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `badge_logs` ADD CONSTRAINT `badge_logs_badge_id_fkey` FOREIGN KEY (`badge_id`) REFERENCES `badges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_space_id_fkey` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_eventtypes` ADD CONSTRAINT `room_eventtypes_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_eventtypes` ADD CONSTRAINT `room_eventtypes_event_type_id_fkey` FOREIGN KEY (`event_type_id`) REFERENCES `event_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_dayparts` ADD CONSTRAINT `room_dayparts_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_dayparts` ADD CONSTRAINT `room_dayparts_daypart_id_fkey` FOREIGN KEY (`daypart_id`) REFERENCES `dayparts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_space_id_fkey` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_event_type_id_fkey` FOREIGN KEY (`event_type_id`) REFERENCES `event_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_startdaypart_id_fkey` FOREIGN KEY (`startdaypart_id`) REFERENCES `dayparts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_badge_id_fkey` FOREIGN KEY (`badge_id`) REFERENCES `badges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
