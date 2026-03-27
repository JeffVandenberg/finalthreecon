-- AlterTable
ALTER TABLE `sync_jobs` ADD COLUMN `message` VARCHAR(255) NULL AFTER `error`;
