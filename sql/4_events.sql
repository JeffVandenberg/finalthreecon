CREATE TABLE `events` (
                          `id` varchar(36) NOT NULL,
                          `room_id` varchar(36) NOT NULL,
                          `space_id` varchar(36) NOT NULL,
                          `name` varchar(255) NOT NULL,
                          `event_number` int(11) NOT NULL,
                          `type_id` varchar(36) NOT NULL,
                          `description` text NOT NULL,
                          `view_uri` varchar(255) DEFAULT NULL,
                          `startdaypart_id` varchar(36) DEFAULT NULL,
                          `duration` int(11) NOT NULL,
                          `event_type_id` varchar(36) NOT NULL,
                          `hosts` text DEFAULT NULL,
                          `relationships` text NOT NULL,
                          `custom_fields` text NOT NULL,
                          `date_created` datetime NOT NULL,
                          `date_updated` datetime NOT NULL,
                          PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;