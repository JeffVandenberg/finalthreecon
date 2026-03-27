/*
  Warnings:

  - You are about to drop the column `end_date` on the `dayparts` table. All the data in the column will be lost.
  - You are about to alter the column `day_name` on the `dayparts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `VarChar(25)`.

*/
-- AlterTable
ALTER TABLE `dayparts` DROP COLUMN `end_date`,
    MODIFY `day_name` VARCHAR(25) NOT NULL;

-- AlterTable
ALTER TABLE `event_types` ADD COLUMN `relationships` JSON NULL,
    MODIFY `name` VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE `events` MODIFY `name` VARCHAR(255) NOT NULL,
    MODIFY `view_uri` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `rooms` MODIFY `description` VARCHAR(255) NULL,
    MODIFY `relationships` JSON NULL;
