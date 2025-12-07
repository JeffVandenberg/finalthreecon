CREATE TABLE `spaces` (
                          `id` varchar(36) NOT NULL,
                          `name` varchar(100) NOT NULL,
                          `room_id` varchar(36) NOT NULL,
                          `relationships` text NOT NULL,
                          `date_created` datetime NOT NULL,
                          `date_updated` datetime NOT NULL,
                          PRIMARY KEY (`id`),
                          KEY `spaces_room_id_index` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
