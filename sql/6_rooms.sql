CREATE TABLE `rooms` (
                         `id` varchar(36) NOT NULL,
                         `name` varchar(100) NOT NULL,
                         `description` varchar(255) DEFAULT NULL,
                         `relationships` text DEFAULT NULL,
                         `date_created` datetime NOT NULL,
                         `date_updated` datetime NOT NULL,
                         PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
