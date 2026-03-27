-- Change events table PRIMARY KEY from (id) to composite (id, space_id)
ALTER TABLE `events` DROP PRIMARY KEY;
ALTER TABLE `events` ADD PRIMARY KEY (`id`, `space_id`);
