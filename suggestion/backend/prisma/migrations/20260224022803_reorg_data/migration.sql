/*
  Warnings:

  - You are about to drop the column `space_id` on the `rooms` table. All the data in the column will be lost.
  - Added the required column `room_id` to the `spaces` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `rooms` DROP FOREIGN KEY `rooms_space_id_fkey`;

-- AlterTable
ALTER TABLE `rooms` DROP COLUMN `space_id`;

-- AlterTable
ALTER TABLE `spaces` ADD COLUMN `room_id` VARCHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `spaces_room_id_idx` ON `spaces`(`room_id`);

-- AddForeignKey
ALTER TABLE `spaces` ADD CONSTRAINT `spaces_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
