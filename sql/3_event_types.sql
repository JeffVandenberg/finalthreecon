CREATE TABLE `event_types` (
                               `id` varchar(36) NOT NULL,
                               `name` varchar(255) NOT NULL,
                               `relationships` text DEFAULT NULL,
                               PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
