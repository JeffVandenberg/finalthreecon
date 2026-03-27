-- DropForeignKey
ALTER TABLE `badges` DROP FOREIGN KEY `badges_badgetype_id_fkey`;

-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `events_event_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `events_room_id_fkey`;

-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `events_space_id_fkey`;

-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `events_startdaypart_id_fkey`;

-- DropForeignKey
ALTER TABLE `tickets` DROP FOREIGN KEY `tickets_badge_id_fkey`;

-- DropForeignKey
ALTER TABLE `tickets` DROP FOREIGN KEY `tickets_event_id_fkey`;
