CREATE TABLE `room_dayparts` (
                                 `daypart_id` varchar(36) NOT NULL,
                                 `room_id` varchar(36) NOT NULL,
                                 `name` varchar(100) NOT NULL,
                                 `start_date` datetime NOT NULL,
                                 PRIMARY KEY (`room_id`,`daypart_id`),
                                 KEY `room_dayparts_daypart_id_index` (`daypart_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
