/*
  Warnings:

  - You are about to drop the column `date_created` on the `dayparts` table. All the data in the column will be lost.
  - You are about to drop the column `date_updated` on the `dayparts` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `dayparts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to drop the column `date_created` on the `event_types` table. All the data in the column will be lost.
  - You are about to drop the column `date_updated` on the `event_types` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `event_types` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to alter the column `name` on the `events` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to alter the column `view_uri` on the `events` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to alter the column `name` on the `products` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - The primary key for the `room_dayparts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `room_dayparts` table. All the data in the column will be lost.
  - The primary key for the `room_eventtypes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `event_type_id` on the `room_eventtypes` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `room_eventtypes` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `rooms` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `rooms` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - You are about to alter the column `name` on the `spaces` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(100)`.
  - A unique constraint covering the columns `[room_id,eventtype_id]` on the table `room_eventtypes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `room_dayparts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `room_dayparts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventtype_id` to the `room_eventtypes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relationships` to the `rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `relationships` to the `spaces` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `room_eventtypes` DROP FOREIGN KEY `room_eventtypes_event_type_id_fkey`;

-- DropIndex
DROP INDEX `room_dayparts_room_id_daypart_id_key` ON `room_dayparts`;

-- DropIndex
DROP INDEX `room_eventtypes_room_id_event_type_id_key` ON `room_eventtypes`;

-- AlterTable
ALTER TABLE `dayparts` DROP COLUMN `date_created`,
    DROP COLUMN `date_updated`,
    MODIFY `name` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `event_types` DROP COLUMN `date_created`,
    DROP COLUMN `date_updated`,
    MODIFY `name` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `events` MODIFY `name` VARCHAR(100) NOT NULL,
    MODIFY `view_uri` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `products` MODIFY `name` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `room_dayparts` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `name` VARCHAR(100) NOT NULL,
    ADD COLUMN `start_date` DATETIME(3) NOT NULL,
    ADD PRIMARY KEY (`room_id`, `daypart_id`);

-- AlterTable
ALTER TABLE `room_eventtypes` DROP PRIMARY KEY,
    DROP COLUMN `event_type_id`,
    DROP COLUMN `id`,
    ADD COLUMN `eventtype_id` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `rooms` DROP COLUMN `capacity`,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `relationships` JSON NOT NULL,
    MODIFY `name` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `spaces` ADD COLUMN `relationships` JSON NOT NULL,
    MODIFY `name` VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE INDEX `room_eventtypes_eventtype_id_idx` ON `room_eventtypes`(`eventtype_id`);

-- CreateIndex
CREATE UNIQUE INDEX `room_eventtypes_room_id_eventtype_id_key` ON `room_eventtypes`(`room_id`, `eventtype_id`);

-- AddForeignKey
ALTER TABLE `room_eventtypes` ADD CONSTRAINT `room_eventtypes_eventtype_id_fkey` FOREIGN KEY (`eventtype_id`) REFERENCES `event_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
